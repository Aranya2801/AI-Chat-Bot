#!/usr/bin/env node
// Latency benchmark for streaming chat models.
//
//   npm run bench -- gpt-4o-mini gpt-4o
//   npm run bench -- --runs 10 llama3.1 qwen2.5      (with LLM_BASE_URL pointing at Ollama)
//
// For each model, sends the same prompts N times and records time to first
// token (TTFT), total time and output tokens/sec. Talks to the provider
// directly using the LLM_* settings in .env, so the proxy's own overhead isn't
// counted. Writes a CSV to eval/results/ that you can plot.
//
// Token counts come from the provider's usage field when it sends one
// (stream_options.include_usage); otherwise chars/4 is used and the CSV says so.

import { writeFileSync, mkdirSync } from "node:fs";
import { loadEnv } from "../server/env.js";
import { createSSEParser } from "../src/lib/sse.js";

loadEnv();
const BASE = (process.env.LLM_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const KEY = process.env.LLM_API_KEY || "";

const argv = process.argv.slice(2);
let runs = 5;
const models = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--runs") runs = Number(argv[++i]);
  else models.push(argv[i]);
}
if (!models.length) {
  console.error("usage: npm run bench -- [--runs N] model1 model2 ...");
  process.exit(1);
}

const PROMPTS = [
  "In two sentences, what is gradient descent?",
  "Write a Python function that checks if a string is a palindrome. Code only.",
  "List five differences between TCP and UDP as a markdown table.",
];

async function once(model, prompt) {
  const t0 = performance.now();
  let ttft = null;
  let text = "";
  let usageTokens = null;

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(KEY ? { Authorization: `Bearer ${KEY}` } : {}) },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0,
      max_tokens: 400,
      stream_options: { include_usage: true },
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`${model}: HTTP ${res.status} ${await res.text()}`);

  const parser = createSSEParser((e) => {
    if (e.done) return;
    const d = e.json?.choices?.[0]?.delta?.content;
    if (d) {
      ttft ??= performance.now() - t0;
      text += d;
    }
    if (e.json?.usage?.completion_tokens) usageTokens = e.json.usage.completion_tokens;
  });
  const decoder = new TextDecoder();
  for await (const chunk of res.body) parser.push(decoder.decode(chunk, { stream: true }));
  parser.flush();

  const total = performance.now() - t0;
  const tokens = usageTokens ?? Math.round(text.length / 4);
  const genSec = (total - (ttft ?? 0)) / 1000;
  return { ttft, total, tokens, tokenSource: usageTokens ? "usage" : "chars/4", tps: genSec > 0 ? tokens / genSec : 0 };
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const p90 = (xs) => [...xs].sort((a, b) => a - b)[Math.min(xs.length - 1, Math.floor(xs.length * 0.9))];

const rows = [];
for (const model of models) {
  process.stdout.write(`${model}: `);
  // one warm-up call so cold starts (especially local models loading into memory) don't skew results
  await once(model, "hi").catch(() => {});
  for (let r = 0; r < runs; r++) {
    for (const [pi, prompt] of PROMPTS.entries()) {
      try {
        rows.push({ model, run: r, prompt: pi, ...(await once(model, prompt)) });
        process.stdout.write(".");
      } catch (err) {
        process.stdout.write("x");
        rows.push({ model, run: r, prompt: pi, error: err.message });
      }
    }
  }
  process.stdout.write("\n");
}

console.log("\n| model | n | TTFT median (ms) | TTFT p90 (ms) | total median (s) | tok/s median |");
console.log("|---|---:|---:|---:|---:|---:|");
for (const model of models) {
  const ok = rows.filter((r) => r.model === model && !r.error && r.ttft != null);
  if (!ok.length) {
    console.log(`| ${model} | 0 | failed | | | |`);
    continue;
  }
  console.log(
    `| ${model} | ${ok.length} | ${median(ok.map((r) => r.ttft)).toFixed(0)} | ${p90(ok.map((r) => r.ttft)).toFixed(0)} | ${(median(ok.map((r) => r.total)) / 1000).toFixed(2)} | ${median(ok.map((r) => r.tps)).toFixed(1)} |`
  );
}

mkdirSync("eval/results", { recursive: true });
const file = `eval/results/bench-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.csv`;
const header = "model,run,prompt,ttft_ms,total_ms,tokens,token_source,tokens_per_s,error";
const lines = rows.map((r) =>
  [r.model, r.run, r.prompt, r.ttft?.toFixed(1) ?? "", r.total?.toFixed(1) ?? "", r.tokens ?? "", r.tokenSource ?? "", r.tps?.toFixed(2) ?? "", JSON.stringify(r.error ?? "")].join(",")
);
writeFileSync(file, [header, ...lines].join("\n"));
console.log(`\nraw data: ${file}`);
