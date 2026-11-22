#!/usr/bin/env node
// Retrieval evaluation: BM25 vs embeddings vs hybrid (RRF) across chunk sizes.
//
//   npm run eval:retrieval                 # BM25 only, no API needed
//   npm run eval:retrieval -- --dense      # also dense + hybrid (uses LLM_* from .env)
//
// A question counts as a hit at rank r if the r-th retrieved chunk contains
// the question's gold evidence string. Reports Recall@1/3/5 and MRR@10,
// overall and split by question type:
//   - "keyword":    the question shares an exact token with the answer (E-317, LDG-409)
//   - "paraphrase": the question uses different words than the document
//
// The corpus in eval/corpus is made up on purpose, so the model can't answer
// from memory and the documents aren't in anyone's training data.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { chunkText, hybridRetrieve } from "../src/lib/rag.js";
import { loadEnv } from "../server/env.js";

loadEnv();
const args = process.argv.slice(2);
const withDense = args.includes("--dense");
const SIZES = [400, 800, 1200];
const KS = [1, 3, 5];
const ROOT = path.resolve("eval");

const docs = readdirSync(path.join(ROOT, "corpus"))
  .filter((f) => f.endsWith(".md"))
  .map((f) => ({ name: f, text: readFileSync(path.join(ROOT, "corpus", f), "utf8") }));
const questions = JSON.parse(readFileSync(path.join(ROOT, "questions.json"), "utf8"));

// ---- embeddings with an on-disk cache, so re-running costs nothing ----
const BASE = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const MODEL = process.env.EMBED_MODEL || "text-embedding-3-small";
const cacheFile = path.join(ROOT, ".cache", `emb-${MODEL.replace(/[^\w.-]/g, "_")}.json`);
const cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, "utf8")) : {};
const key = (t) => createHash("sha1").update(t).digest("hex");

async function embedAll(texts) {
  const missing = [...new Set(texts.filter((t) => !cache[key(t)]))];
  for (let i = 0; i < missing.length; i += 64) {
    const batch = missing.slice(i, i + 64);
    const res = await fetch(`${BASE}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.LLM_API_KEY ? { Authorization: `Bearer ${process.env.LLM_API_KEY}` } : {}),
      },
      body: JSON.stringify({ model: MODEL, input: batch }),
    });
    if (!res.ok) throw new Error(`embeddings failed: ${res.status} ${await res.text()}`);
    const { data } = await res.json();
    batch.forEach((t, j) => (cache[key(t)] = data[j].embedding));
  }
  if (missing.length) {
    mkdirSync(path.dirname(cacheFile), { recursive: true });
    writeFileSync(cacheFile, JSON.stringify(cache));
  }
  return texts.map((t) => cache[key(t)]);
}

// ---- evaluation ----
function score(rankedTexts, evidence) {
  const rank = rankedTexts.findIndex((t) => t.includes(evidence));
  return rank === -1 ? null : rank + 1;
}

function summarise(ranks) {
  const n = ranks.length;
  const out = {};
  for (const k of KS) out[`R@${k}`] = ranks.filter((r) => r && r <= k).length / n;
  out["MRR@10"] = ranks.reduce((s, r) => s + (r && r <= 10 ? 1 / r : 0), 0) / n;
  return out;
}

const modes = withDense ? ["bm25", "dense", "hybrid"] : ["bm25"];
const results = [];

for (const size of SIZES) {
  const chunks = docs.flatMap((d) =>
    chunkText(d.text, { size, overlap: Math.round(size * 0.15) }).map((text, i) => ({ id: `${d.name}#${i}`, docName: d.name, text, vector: null }))
  );

  let qVecs = null;
  if (withDense) {
    const vecs = await embedAll(chunks.map((c) => c.text));
    chunks.forEach((c, i) => (c.vector = vecs[i]));
    qVecs = await embedAll(questions.map((q) => q.q));
  }

  for (const mode of modes) {
    const perQ = questions.map((q, i) => {
      // minScore 0 here: we want the full ranking for MRR, the threshold is a UI concern
      const hits = hybridRetrieve(q.q, qVecs ? qVecs[i] : null, chunks, { k: 10, mode, minScore: 0, pool: 50 });
      return { ...q, rank: score(hits.map((h) => h.text), q.evidence) };
    });
    const row = { chunkSize: size, chunks: chunks.length, mode, all: summarise(perQ.map((r) => r.rank)) };
    for (const type of ["keyword", "paraphrase"]) {
      row[type] = summarise(perQ.filter((r) => r.type === type).map((r) => r.rank));
    }
    row.misses = perQ.filter((r) => !r.rank || r.rank > 5).map((r) => r.q);
    results.push(row);
  }
}

// ---- print ----
const pct = (x) => (x * 100).toFixed(1).padStart(5);
console.log(`\n${questions.length} questions, ${docs.length} documents, embedding model: ${withDense ? MODEL : "(not used)"}\n`);
console.log("| chunk | #chunks | mode   | R@1   | R@3   | R@5   | MRR@10 | R@5 keyword | R@5 paraphrase |");
console.log("|------:|--------:|--------|------:|------:|------:|-------:|------------:|---------------:|");
for (const r of results) {
  console.log(
    `| ${String(r.chunkSize).padStart(5)} | ${String(r.chunks).padStart(7)} | ${r.mode.padEnd(6)} | ${pct(r.all["R@1"])} | ${pct(r.all["R@3"])} | ${pct(r.all["R@5"])} | ${r.all["MRR@10"].toFixed(3).padStart(6)} | ${pct(r.keyword["R@5"]).padStart(11)} | ${pct(r.paraphrase["R@5"]).padStart(14)} |`
  );
}

mkdirSync(path.join(ROOT, "results"), { recursive: true });
const out = path.join(ROOT, "results", withDense ? `retrieval-${MODEL.replace(/[^\w.-]/g, "_")}.json` : "retrieval-bm25.json");
writeFileSync(out, JSON.stringify({ date: new Date().toISOString(), embedModel: withDense ? MODEL : null, results }, null, 2));
console.log(`\nfull results (including missed questions) written to ${path.relative(process.cwd(), out)}`);
