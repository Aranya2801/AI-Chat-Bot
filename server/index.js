// Small proxy between the browser and the LLM provider.
//
// The first version of this app called OpenAI straight from the browser with a
// VITE_ env var, which meant the key ended up inside the built JS bundle.
// Anyone could open devtools and copy it. Now the key only lives here.
//
// Works with anything that speaks the OpenAI chat API: OpenAI itself, Groq,
// Together, OpenRouter, or a local Ollama (http://localhost:11434/v1).

import http from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./env.js";

loadEnv();

const PORT = Number(process.env.PORT) || 8787;
const BASE_URL = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const API_KEY = process.env.LLM_API_KEY || "";
const EMBED_MODEL = process.env.EMBED_MODEL || "text-embedding-3-small";
const ALLOWED_MODELS = (process.env.ALLOWED_MODELS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const MAX_BODY = 2 * 1024 * 1024; // 2 MB is plenty for a chat request

function upstreamHeaders() {
  const h = { "Content-Type": "application/json" };
  if (API_KEY) h.Authorization = `Bearer ${API_KEY}`;
  return h;
}

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

async function readBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw Object.assign(new Error("Request too large"), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw Object.assign(new Error("Invalid JSON"), { status: 400 });
  }
}

async function handleChat(req, res) {
  const body = await readBody(req);
  const { model, messages, temperature, max_tokens } = body;

  if (!model || !Array.isArray(messages) || messages.length === 0) {
    return sendJson(res, 400, { error: "model and messages are required" });
  }
  if (ALLOWED_MODELS.length && !ALLOWED_MODELS.includes(model)) {
    return sendJson(res, 400, { error: `model "${model}" is not enabled on this server` });
  }

  // Only forward the fields we actually use. Don't pass the client body through blindly.
  const payload = {
    model,
    messages: messages.map(({ role, content }) => ({ role, content: String(content ?? "") })),
    stream: true,
    temperature: clamp(Number(temperature ?? 0.7), 0, 2),
    max_tokens: clamp(Number(max_tokens ?? 1024), 1, 8192),
  };

  const controller = new AbortController();
  // If the user hits "stop", the browser closes the connection. Cancel upstream too
  // so we aren't paying for tokens nobody will read.
  res.on("close", () => controller.abort());

  let upstream;
  try {
    upstream = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: upstreamHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted) return;
    return sendJson(res, 502, { error: `Could not reach ${BASE_URL}: ${err.message}` });
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    let message = `Upstream returned ${upstream.status}`;
    try {
      message = JSON.parse(text)?.error?.message || message;
    } catch {
      /* not json */
    }
    return sendJson(res, upstream.status, { error: message });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  try {
    for await (const chunk of upstream.body) {
      res.write(chunk);
    }
  } catch (err) {
    if (!controller.signal.aborted) console.error("stream error:", err.message);
  } finally {
    res.end();
  }
}

async function handleEmbeddings(req, res) {
  const { input } = await readBody(req);
  if (!Array.isArray(input) || input.length === 0) {
    return sendJson(res, 400, { error: "input must be a non-empty array of strings" });
  }
  if (input.length > 256) {
    return sendJson(res, 400, { error: "send at most 256 chunks per request" });
  }

  const upstream = await fetch(`${BASE_URL}/embeddings`, {
    method: "POST",
    headers: upstreamHeaders(),
    body: JSON.stringify({ model: EMBED_MODEL, input }),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return sendJson(res, upstream.status, { error: data?.error?.message || "embedding request failed" });
  }
  sendJson(res, 200, { vectors: data.data.map((d) => d.embedding), model: EMBED_MODEL });
}

async function handleModels(_req, res) {
  if (ALLOWED_MODELS.length) return sendJson(res, 200, { models: ALLOWED_MODELS });
  try {
    const r = await fetch(`${BASE_URL}/models`, { headers: upstreamHeaders() });
    const data = await r.json();
    const ids = (data.data || []).map((m) => m.id).filter((id) => !/embed|whisper|tts|dall-e|moderation/i.test(id));
    sendJson(res, 200, { models: ids.sort() });
  } catch {
    sendJson(res, 200, { models: [] });
  }
}

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

// In production the same process serves the built frontend, so there's one thing to deploy.
async function serveStatic(req, res) {
  if (!existsSync(DIST)) return sendJson(res, 404, { error: "not found (run npm run build first)" });
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = path.join(DIST, urlPath);
  if (!file.startsWith(DIST)) return sendJson(res, 403, { error: "forbidden" });
  if (!existsSync(file) || !statSync(file).isFile()) file = path.join(DIST, "index.html");
  const data = await readFile(file);
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, "http://x");
    if (req.method === "POST" && pathname === "/api/chat") return await handleChat(req, res);
    if (req.method === "POST" && pathname === "/api/embeddings") return await handleEmbeddings(req, res);
    if (req.method === "GET" && pathname === "/api/models") return await handleModels(req, res);
    if (req.method === "GET" && pathname === "/api/health") {
      return sendJson(res, 200, { ok: true, baseUrl: BASE_URL, hasKey: Boolean(API_KEY) });
    }
    if (pathname.startsWith("/api/")) return sendJson(res, 404, { error: "unknown endpoint" });
    return await serveStatic(req, res);
  } catch (err) {
    if (!res.headersSent) sendJson(res, err.status || 500, { error: err.message });
    else res.end();
  }
});

function clamp(n, lo, hi) {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

server.listen(PORT, () => {
  console.log(`api listening on http://localhost:${PORT}  ->  ${BASE_URL}`);
  if (!API_KEY && !BASE_URL.includes("localhost")) {
    console.warn("warning: LLM_API_KEY is empty. Requests to a hosted provider will fail.");
  }
});
