# Browserbase Navigator

**Ask the ecosystem.** An AI answer engine for the entire Browserbase surface — platform docs, [Stagehand](https://docs.stagehand.dev), the [browse CLI](https://browse.sh) and all 400+ browse.sh skills, blog, templates, GitHub releases, and a changelog archive that retains entries the live site has dropped — with Perplexity-style numbered citations on every claim.

**Live: [browserbase-navigator-sepia.vercel.app](https://browserbase-navigator-sepia.vercel.app)**

The docs bot answers "how does keepAlive work." Navigator answers **"should I even be using a browser for this?"** — across every Browserbase property, with citations, and it remembers what changed.

## What it does

- **Decision questions, not just lookups.** Describe a use case and it applies a "lowest rung that works" framework — including telling you when you *don't* need browser automation because the Fetch/Search APIs suffice.
- **Ecosystem-wide, cited answers.** Every substantive claim carries a numbered `[n]` marker resolving to the exact upstream page. Answers that can't be grounded in the corpus say so instead of guessing.
- **"What changed?"** A `recent_changes` tool reads actual git diffs of the underlying wiki mirror — the corpus has a concept of time.
- **Shareable plans.** Ask it to save a recommendation and it mints an immutable permalink (`/plan/[slug]`) — no accounts.
- **Hybrid retrieval.** Semantic search (pgvector) for meaning, plus regex grep over the chunk store for exact identifiers embeddings miss (`keepAlive`, `REQUEST_RELEASE`, error strings).

## Architecture

```
┌─────────────────────┐   weekly cron (GitHub Actions)
│  browserbase-wiki    │   ~1,000 pages / 6 sources, git-backed markdown
│  (mirror repo)       │   changelog lane runs as a deployed Browserbase Function
└─────────┬───────────┘
          │ index-sync (changed chunks only)
          ▼
┌─────────────────────┐
│  Neon Postgres       │   ~13k chunks · pgvector HNSW · 1536-dim embeddings
└─────────┬───────────┘
          │
          ▼
┌─────────────────────────────────────────────────┐
│  /api/chat (Next.js + Vercel AI SDK)             │
│                                                  │
│  eager evidence pack ──► generic + per-product   │
│  (before the model      source-filtered searches │
│   even starts)          in parallel, one shared  │
│                         embedding, cross-encoder │
│                         reranked, deduped,       │
│                         source-interleaved       │
│                                                  │
│  agent loop: search_wiki · grep_wiki · get_page  │
│  · recent_changes · save_plan                    │
└─────────────────────────────────────────────────┘
```

**The speed story** (all measured, same benchmark question): a naive agent loop took **18.9s** per turn. Now **~6s full turn, <2s to first text**:

1. **Eager retrieval** — the server embeds + searches *while the request is still being set up*, detects which products the question names (Stagehand → `docs-stagehand`, skills → `browse-sh`, …), runs a source-filtered search per product in parallel, and hands the model the evidence up front. Most turns answer in **one model step** instead of think → search → wait → think.
2. **Cross-encoder reranking** — `voyage/rerank-2.5-lite` picks the best 8 of 24 cosine candidates per search (cosine retrieves, the reranker decides), failing open to cosine order.
3. **Position-aware evidence composition** — results are interleaved by source because models cite from the top of the evidence down; clustering one source at the bottom un-cites it (found empirically: a Stagehand passage ranked 6th never got cited in a Stagehand-vs-Agents comparison).
4. **Prompt caching + memoized query embeddings + a conciseness contract** in the system prompt.

**Model selection is eval-driven, not vibes-driven.** A 6-case golden-question suite (`evals/golden.test.ts`) gates every prompt/model change. Eleven models were benchmarked on real tool-grounded questions; several were faster or cheaper than the current `claude-haiku-4.5` but flaked the citation contract (invented markers, one-sided comparison grounding, empty answers) — receipts in the commit history.

## The corpus

Fed by [`browserbase-wiki`](https://github.com/yawbtng/browserbase-wiki) — a list-driven crawler that mirrors the Browserbase surface into git-backed markdown with content-hash change detection, mass-change circuit breakers, and 2-strike deletion. Highlights:

- **Changelog rendering runs on Browserbase itself** — a deployed [Browserbase Function](https://docs.browserbase.com/platform/functions) (`functions/main.ts` in the wiki repo) does the browser work; CI only invokes and polls.
- The changelog archive **retains entries the site's own 16-entry feed has dropped**.
- Weekly refresh (cron, Mondays), on-demand dispatch anytime; the UI shows a staleness pill with the corpus date.

## Stack

Next.js 16 · Vercel AI SDK v7 + AI Elements · Neon Postgres + pgvector · Vercel AI Gateway (`claude-haiku-4.5`, `text-embedding-3-small`, `voyage/rerank-2.5-lite`) · Browserbase Functions (changelog lane) · Tailwind v4 with a [Browserbase-native design token layer](docs/redesign-spec.md)

## Run locally

```bash
pnpm install
cp .env.example .env.local   # DATABASE_URL (Neon), AI_GATEWAY_API_KEY; AI_MODEL optional
pnpm dev
```

Evals (needs a running endpoint and a synced index):

```bash
EVAL_BASE_URL=http://localhost:3000 pnpm vitest run evals
```

## Abuse controls

Anonymous by design: per-IP sliding-window rate limits (Postgres, no extra service), message/conversation size caps, plan-save daily cap, and a one-env-var kill switch (`NAVIGATOR_DISABLED=1`).

---

Built by [@yawbtng](https://github.com/yawbtng) on the Browserbase stack — part of an ongoing open-source contribution arc across [Stagehand](https://github.com/browserbase/stagehand) and the Browserbase ecosystem.
