// Plain BM25 keyword index.
//
// Why this exists next to embeddings:
//  1. Some providers (Groq, many local setups) have no embeddings endpoint.
//     With BM25 the document feature still works, just keyword-based.
//  2. Embeddings are weak on exact tokens: error codes, names, version
//     numbers, IDs. BM25 is strong exactly there, so combining both
//     (see hybridRetrieve in rag.js) does better than either on its own.
//     scripts/eval-retrieval.mjs measures this.

const STOPWORDS = new Set(
  "a an and are as at be but by for from has have how i if in into is it its of on or so that the their there these this to was were what when where which who why will with you your do does did can".split(" ")
);

export function tokenize(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOPWORDS.has(t))
    .map(stem);
}

// very small suffix stripper. Not Porter, but enough that "policies"/"policy" and
// "refunded"/"refund" match. Leaves short words alone.
function stem(t) {
  if (t.length <= 4) return t;
  if (t.endsWith("ies")) return t.slice(0, -3) + "y";
  if (t.endsWith("ing") && t.length > 6) return t.slice(0, -3);
  if (t.endsWith("ed") && t.length > 5) return t.slice(0, -2);
  if (t.endsWith("es") && t.length > 5) return t.slice(0, -2);
  if (t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

export function buildBM25(docs, { k1 = 1.2, b = 0.75 } = {}) {
  const tokenized = docs.map(tokenize);
  const N = docs.length;
  const avgLen = tokenized.reduce((s, d) => s + d.length, 0) / Math.max(N, 1);

  const df = new Map();
  const tfs = tokenized.map((toks) => {
    const tf = new Map();
    for (const t of toks) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    return tf;
  });

  const idf = (t) => {
    const n = df.get(t) || 0;
    return Math.log(1 + (N - n + 0.5) / (n + 0.5));
  };

  return {
    // returns an array of scores aligned with `docs`
    score(query) {
      const q = [...new Set(tokenize(query))];
      return tfs.map((tf, i) => {
        const len = tokenized[i].length;
        let s = 0;
        for (const t of q) {
          const f = tf.get(t);
          if (!f) continue;
          s += idf(t) * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * len) / avgLen)));
        }
        return s;
      });
    },
  };
}
