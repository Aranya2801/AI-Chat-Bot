// Integration test: start a fake OpenAI-compatible upstream, point the real
// proxy at it, and check streaming + error handling end to end.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { spawn } from "node:child_process";

let upstream;
let proxy;
let lastAuth;
let lastBody;
const PROXY_PORT = 18787;

function startUpstream() {
  return new Promise((resolve) => {
    upstream = http.createServer(async (req, res) => {
      lastAuth = req.headers.authorization;
      let raw = "";
      for await (const c of req) raw += c;
      lastBody = raw ? JSON.parse(raw) : null;

      if (req.url === "/v1/chat/completions") {
        if (lastBody.model === "broken") {
          res.writeHead(401, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({ error: { message: "bad key" } }));
        }
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        for (const word of ["Hel", "lo", "!"]) {
          res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: word } }] })}\n\n`);
        }
        res.end("data: [DONE]\n\n");
      } else if (req.url === "/v1/embeddings") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ data: lastBody.input.map((_, i) => ({ embedding: [i, 1] })) }));
      } else {
        res.writeHead(404).end();
      }
    });
    upstream.listen(0, () => resolve(upstream.address().port));
  });
}

beforeAll(async () => {
  const port = await startUpstream();
  proxy = spawn(process.execPath, ["server/index.js"], {
    env: {
      ...process.env,
      PORT: String(PROXY_PORT),
      LLM_BASE_URL: `http://127.0.0.1:${port}/v1`,
      LLM_API_KEY: "sk-test-secret",
      ALLOWED_MODELS: "",
    },
    stdio: "pipe",
  });
  await new Promise((resolve, reject) => {
    proxy.stdout.on("data", (d) => d.toString().includes("listening") && resolve());
    proxy.on("exit", (code) => reject(new Error(`proxy exited with ${code}`)));
  });
});

afterAll(() => {
  proxy?.kill();
  upstream?.close();
});

const api = (path, body) =>
  fetch(`http://127.0.0.1:${PROXY_PORT}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body && JSON.stringify(body),
  });

describe("proxy server", () => {
  it("streams chat completions and adds the key server-side", async () => {
    const res = await api("/api/chat", { model: "m", messages: [{ role: "user", content: "hi", extra: "dropped" }] });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('"Hel"');
    expect(text).toContain("[DONE]");
    expect(lastAuth).toBe("Bearer sk-test-secret");
    // unknown fields from the client are not forwarded
    expect(lastBody.messages[0]).toEqual({ role: "user", content: "hi" });
    expect(lastBody.stream).toBe(true);
  });

  it("clamps temperature and max_tokens", async () => {
    await (await api("/api/chat", { model: "m", messages: [{ role: "user", content: "x" }], temperature: 9, max_tokens: 999999 })).text();
    expect(lastBody.temperature).toBe(2);
    expect(lastBody.max_tokens).toBe(8192);
  });

  it("passes upstream errors through as JSON", async () => {
    const res = await api("/api/chat", { model: "broken", messages: [{ role: "user", content: "x" }] });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("bad key");
  });

  it("validates the request", async () => {
    const res = await api("/api/chat", { messages: [] });
    expect(res.status).toBe(400);
  });

  it("returns embeddings", async () => {
    const res = await api("/api/embeddings", { input: ["a", "b"] });
    expect((await res.json()).vectors).toEqual([[0, 1], [1, 1]]);
  });

  it("never exposes the key in /api/health", async () => {
    const body = await (await api("/api/health")).text();
    expect(body).not.toContain("sk-test-secret");
  });
});
