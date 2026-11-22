import { describe, it, expect } from "vitest";
import { buildBM25, tokenize } from "../src/lib/bm25.js";
import { hybridRetrieve, rrf } from "../src/lib/rag.js";

describe("tokenize", () => {
  it("lowercases, drops stopwords and stems a little", () => {
    expect(tokenize("The Policies are REFUNDED")).toEqual(["policy", "refund"]);
    expect(tokenize("error E-317")).toEqual(["error", "e", "317"]);
  });
});

describe("BM25", () => {
  const docs = ["the cat sat on the mat", "dogs chase cats in the park", "stock prices fell sharply today"];

  it("ranks the matching document highest", () => {
    const s = buildBM25(docs).score("cat on a mat");
    expect(s.indexOf(Math.max(...s))).toBe(0);
    expect(s[2]).toBe(0);
  });

  it("gives rare terms more weight than common ones", () => {
    const s = buildBM25(["apple banana", "apple cherry", "apple durian"]).score("apple durian");
    expect(s[2]).toBeGreaterThan(s[0]);
  });
});

describe("rrf / hybridRetrieve", () => {
  it("rewards items that rank well in both lists", () => {
    expect(rrf([["a", "b", "c"], ["b", "c", "a"]])[0]).toBe("b");
  });

  const chunks = [
    { id: "1", docName: "d", text: "error E-317 means too few satellites", vector: [0, 1] },
    { id: "2", docName: "d", text: "the battery lasts about 38 minutes", vector: [1, 0] },
  ];

  it("falls back to BM25 when there are no vectors", () => {
    const noVec = chunks.map((c) => ({ ...c, vector: null }));
    const hits = hybridRetrieve("what is E-317", null, noVec, { k: 1 });
    expect(hits[0].id).toBe("1");
  });

  it("dense mode follows the query vector", () => {
    const hits = hybridRetrieve("how long does it fly", [1, 0.05], chunks, { k: 1, mode: "dense" });
    expect(hits[0].id).toBe("2");
  });

  it("hybrid finds exact codes even when the vector points elsewhere", () => {
    const hits = hybridRetrieve("E-317", [1, 0], chunks, { k: 2, mode: "hybrid", minScore: 0 });
    expect(hits.map((h) => h.id)).toContain("1");
  });
});
