# Contributing

Issues and PRs are welcome.

```bash
npm install
cp .env.example .env
npm run dev
```

Before opening a PR, please run:

```bash
npm run lint
npm test
```

If you change anything in `src/lib/rag.js` or `src/lib/bm25.js`, also run `npm run eval:retrieval` and include the before/after table in the PR, so we can see whether retrieval got better or worse.

Keep PRs to one change each. For UI changes, add a screenshot.
