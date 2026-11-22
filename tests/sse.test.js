import { describe, it, expect } from "vitest";
import { createSSEParser } from "../src/lib/sse.js";

const delta = (s) => `data: ${JSON.stringify({ choices: [{ delta: { content: s } }] })}\n\n`;

function collect() {
  const out = { text: "", done: false };
  const parser = createSSEParser((e) => {
    if (e.done) out.done = true;
    else out.text += e.json.choices[0].delta.content ?? "";
  });
  return { parser, out };
}

describe("createSSEParser", () => {
  it("parses a normal stream", () => {
    const { parser, out } = collect();
    parser.push(delta("Hello") + delta(" world") + "data: [DONE]\n\n");
    expect(out.text).toBe("Hello world");
    expect(out.done).toBe(true);
  });

  // this is the case that broke v1
  it("handles a line split across two reads", () => {
    const { parser, out } = collect();
    const full = delta("Hello") + delta(" there");
    parser.push(full.slice(0, 20));
    parser.push(full.slice(20));
    expect(out.text).toBe("Hello there");
  });

  it("survives the stream being fed one character at a time", () => {
    const { parser, out } = collect();
    const full = delta("a") + delta("bc") + delta("\nd\n") + "data: [DONE]\n\n";
    for (const ch of full) parser.push(ch);
    expect(out.text).toBe("abc\nd\n");
    expect(out.done).toBe(true);
  });

  it("ignores comments, blank lines and CRLF", () => {
    const { parser, out } = collect();
    parser.push(": keep-alive\r\n\r\n" + delta("ok").replace(/\n/g, "\r\n"));
    expect(out.text).toBe("ok");
  });

  it("flush() handles a last line without newline", () => {
    const { parser, out } = collect();
    parser.push(delta("x").trimEnd());
    expect(out.text).toBe("");
    parser.flush();
    expect(out.text).toBe("x");
  });
});
