// Retrieval for "chat with your documents".
//
// Pipeline: split text into overlapping chunks -> embed each chunk once ->
// at question time embed the query, rank chunks by cosine similarity, put the
// top k into the prompt with numbered tags so the model can cite them as [1], [2].
//
// Everything runs in the browser. For a few hundred chunks a brute-force scan
// takes well under a millisecond, so a vector DB would be overkill here.
//
// Retrieval is hybrid by default: dense (embeddings) + sparse (BM25), merged
// with reciprocal rank fusion. If no chunk has a vector (provider without an
// embeddings endpoint) it quietly falls back to BM25 alone.

import { buildBM25 } from "./bm25.js";

const DEFAULT_CHUNK = 800; // characters, roughly 150-200 tokens
const DEFAULT_OVERLAP = 150;

/**
 * Split text into chunks of about `size` characters. We try to break on
 * paragraph boundaries, then sentences, and only hard-cut when there's no choice.
 */
export function chunkText(text, { size = DEFAULT_CHUNK, overlap = DEFAULT_OVERLAP } = {}) {
  if (overlap >= size) throw new Error("overlap must be smaller than chunk size");
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];

  const chunks = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);
    if (end < clean.length) {
      const window = clean.slice(start, end);
      // prefer a paragraph break in the back half of the window, then a sentence end
      const para = window.lastIndexOf("\n\n");
      const sentence = Math.max(window.lastIndexOf(". "), window.lastIndexOf("? "), window.lastIndexOf("! "));
      if (para > size * 0.5) end = start + para;
      else if (sentence > size * 0.5) end = start + sentence + 1;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    // step back by `overlap`, then forward to the next whitespace so chunks don't start mid-word
    let next = end - overlap;
    const ws = clean.slice(next, end).search(/\s/);
    if (ws !== -1) next += ws + 1;
    start = Math.max(next, start + 1);
  }
  return chunks;
}

export function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * chunks: [{ id, docName, text, vector }]
 * Returns the top k chunks scoring above minScore, best first.
 */
export function retrieve(queryVector, chunks, { k = 4, minScore = 0.2 } = {}) {
  return chunks
    .map((c) => ({ ...c, score: cosine(queryVector, c.vector) }))
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

/**
 * Reciprocal rank fusion (Cormack et al., 2009). Each ranked list gives
 * 1 / (c + rank) to every item; scores are summed. It only looks at ranks, so
 * there's no need to normalise cosine scores against BM25 scores, which live
 * on completely different scales. c = 60 is the value from the paper.
 */
export function rrf(rankedLists, c = 60) {
  const scores = new Map();
  for (const list of rankedLists) {
    list.forEach((id, rank) => scores.set(id, (scores.get(id) || 0) + 1 / (c + rank + 1)));
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

/**
 * mode: "hybrid" | "dense" | "bm25"
 * queryVector may be null (then dense is skipped).
 * Each returned hit has `score` = cosine similarity when available (shown in
 * the UI), otherwise the BM25 score.
 */
export function hybridRetrieve(query, queryVector, chunks, { k = 4, mode = "hybrid", minScore = 0.2, pool = 20 } = {}) {
  if (!chunks.length) return [];
  const hasVectors = queryVector && chunks.every((c) => Array.isArray(c.vector));
  const useDense = hasVectors && mode !== "bm25";
  const useSparse = mode !== "dense" || !hasVectors;

  const lists = [];
  const cos = new Map();
  if (useDense) {
    const ranked = chunks
      .map((c) => ({ id: c.id, s: cosine(queryVector, c.vector) }))
      .sort((a, b) => b.s - a.s);
    ranked.forEach((r) => cos.set(r.id, r.s));
    // drop chunks that are clearly unrelated so they can't sneak in via BM25 rank alone
    lists.push(ranked.filter((r) => r.s >= minScore).slice(0, pool).map((r) => r.id));
  }
  const bm = new Map();
  if (useSparse) {
    const scores = buildBM25(chunks.map((c) => c.text)).score(query);
    const ranked = chunks.map((c, i) => ({ id: c.id, s: scores[i] })).filter((r) => r.s > 0).sort((a, b) => b.s - a.s);
    ranked.forEach((r) => bm.set(r.id, r.s));
    lists.push(ranked.slice(0, pool).map((r) => r.id));
  }

  const order = lists.length === 1 ? lists[0] : rrf(lists);
  const byId = new Map(chunks.map((c) => [c.id, c]));
  return order.slice(0, k).map((id) => ({ ...byId.get(id), score: cos.get(id) ?? bm.get(id) ?? 0 }));
}

/**
 * Builds the context block that goes in front of the user's question.
 * The model is told to answer only from the sources and to say when they
 * don't cover the question. Without that it happily makes things up.
 */
export function buildContextPrompt(hits) {
  if (!hits.length) return null;
  const sources = hits
    .map((h, i) => `[${i + 1}] (from "${h.docName}")\n${h.text}`)
    .join("\n\n---\n\n");
  return [
    "Use the following excerpts from the user's documents to answer.",
    "Cite the excerpts you rely on inline like [1] or [2].",
    "If the excerpts don't contain the answer, say so plainly instead of guessing.",
    "",
    sources,
  ].join("\n");
}
