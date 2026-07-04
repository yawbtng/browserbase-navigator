# Browserbase Navigator

Thin AI chat app that answers questions about the Browserbase ecosystem (Browserbase, Stagehand, browse CLI, MCP server) with Perplexity-style numbered citations. Built from scratch on the Vercel AI SDK + AI Elements; the wiki-index tools (`lib/tools.ts`) are stubs awaiting the Supabase corpus.

## Run

```bash
pnpm install
cp .env.example .env.local   # fill in AI_GATEWAY_API_KEY (AI_MODEL optional)
pnpm dev
```
