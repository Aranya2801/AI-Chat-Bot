import { describe, it, expect } from "vitest";
import { chunkText, cosine, retrieve, buildContextPrompt } from "../src/lib/rag.js";
import { decorateCitations } from "../src/lib/markdown.js";

describe("chunkText", () => {
  it("returns one chunk for short text and none for empty", () => {
    expect(chunkText("short note")).toEqual(["short note"]);
    expect(chunkText("   \n ")).toEqual([]);
  });

  it("keeps chunks under the size limit and covers the whole text", () => {
    const sentences = Array.from({ length: 120 }, (_, i) => `Sentence number ${i} talks about topic ${i % 7}.`);
    const text = sentences.join(" ");
    const chunks = chunkText(text, { size: 300, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(5);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(300);
    // every sentence should land in at least one chunk
    for (const s of sentences) expect(chunks.some((c) => c.includes(s))).toBe(true);
  });

  it("prefers paragraph boundaries", () => {
    const para = (n) => `Paragraph ${n}. ` + "word ".repeat(40).trim() + ".";
    const chunks = chunkText([para(1), para(2), para(3)].join("\n\n"), { size: 260, overlap: 20 });
    expect(chunks[0].startsWith("Paragraph 1.")).toBe(true);
    expect(chunks[0]).not.toContain("Paragraph 2");
  });

  it("rejects overlap >= size", () => {
    expect(() => chunkText("abc", { size: 10, overlap: 10 })).toThrow();
  });
});

describe("cosine / retrieve", () => {
  it("computes cosine similarity", () => {
    expect(cosine([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosine([1, 1], [-1, -1])).toBeCloseTo(-1);
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });

  it("returns the top k above threshold, best first", () => {
    const chunks = [
      { id: "a", docName: "d", text: "a", vector: [1, 0, 0] },
      { id: "b", docName: "d", text: "b", vector: [0.9, 0.1, 0] },
      { id: "c", docName: "d", text: "c", vector: [0, 0, 1] },
    ];
    const hits = retrieve([1, 0, 0], chunks, { k: 2, minScore: 0.5 });
    expect(hits.map((h) => h.id)).toEqual(["a", "b"]);
    expect(retrieve([1, 0, 0], chunks, { k: 5, minScore: 0.5 })).toHaveLength(2);
  });

  it("builds a numbered context prompt", () => {
    expect(buildContextPrompt([])).toBeNull();
    const p = buildContextPrompt([{ docName: "notes.md", text: "alpha" }, { docName: "b.txt", text: "beta" }]);
    expect(p).toContain('[1] (from "notes.md")');
    expect(p).toContain('[2] (from "b.txt")');
  });
});

describe("decorateCitations", () => {
  it("turns valid [n] into badges but leaves code and out-of-range refs alone", () => {
    const html = "<p>See [1] and [3].</p><pre><code>arr[1]</code></pre><p>x[1]</p>";
    const out = decorateCitations(html, 2);
    expect(out).toContain('<sup class="cite" data-cite="1">1</sup>');
    expect(out).toContain("[3]");
    expect(out).toContain("<code>arr[1]</code>");
    expect(out).toContain("x[1]");
  });
});
