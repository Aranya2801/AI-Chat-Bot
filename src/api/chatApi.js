// Client side of the API. Everything goes through our own /api routes (see
// server/index.js), so no key ever reaches the browser.

import { createSSEParser } from "../lib/sse";

/**
 * Stream a chat completion.
 *
 * onToken(fullTextSoFar) fires on every delta. Resolves with
 * { content, stats: { ttftMs, totalMs, chars } } when the stream ends.
 * Pass an AbortSignal to support the stop button.
 */
export async function streamChat({ model, messages, temperature, maxTokens, signal }, onToken) {
  const started = performance.now();
  let firstTokenAt = null;

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, temperature, max_tokens: maxTokens }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }

  let content = "";
  let finished = false;
  const parser = createSSEParser((evt) => {
    if (evt.done) {
      finished = true;
      return;
    }
    const delta = evt.json?.choices?.[0]?.delta?.content;
    if (delta) {
      if (firstTokenAt === null) firstTokenAt = performance.now();
      content += delta;
      onToken(content);
    }
  });

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  try {
    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.flush();
  } finally {
    // after [DONE] there may still be bytes in flight; we don't need them
    if (finished) reader.cancel().catch(() => {});
  }

  const end = performance.now();
  return {
    content,
    stats: {
      ttftMs: firstTokenAt ? Math.round(firstTokenAt - started) : null,
      totalMs: Math.round(end - started),
      chars: content.length,
    },
  };
}

export async function embed(texts) {
  const res = await fetch("/api/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: texts }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Embedding failed");
  return data.vectors;
}

// embeds in batches so a long PDF-turned-text doesn't hit the request limit
export async function embedMany(texts, batchSize = 64) {
  const out = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    out.push(...(await embed(texts.slice(i, i + batchSize))));
  }
  return out;
}

export async function fetchModels() {
  try {
    const res = await fetch("/api/models");
    const { models } = await res.json();
    return models?.length ? models : null;
  } catch {
    return null;
  }
}
