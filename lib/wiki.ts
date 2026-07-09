/**
 * Server-side access to the wiki index (Neon Postgres + pgvector).
 *
 *   query text ──▶ AI Gateway embeddings (text-embedding-3-small, 1536-dim)
 *              ──▶ search_chunks() SQL function (cosine)
 *
 * Every result carries the upstream source_url — the citation contract says
 * a passage without a URL is a bug, not a degradation.
 */
import postgres from "postgres";

let client: ReturnType<typeof postgres> | undefined;

export function sql(): ReturnType<typeof postgres> {
  if (client) return client;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not configured");
  client = postgres(url, { ssl: "require", max: 2, idle_timeout: 20 });
  return client;
}

/**
 * Rerank documents against a query (voyage/rerank-2.5-lite via the Gateway,
 * ~$0.02/M tokens). Returns candidate indices, most relevant first. Fails
 * open with null — callers fall back to their own ordering.
 */
export async function rerankDocs(
  query: string,
  documents: string[],
  topN: number,
): Promise<number[] | null> {
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key || documents.length === 0) return null;
  try {
    const res = await fetch("https://ai-gateway.vercel.sh/v1/rerank", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.RERANK_MODEL ?? "voyage/rerank-2.5-lite",
        query,
        documents,
        top_n: topN,
      }),
      signal: AbortSignal.timeout(4_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      results: Array<{ index: number; relevance_score: number }>;
    };
    return json.results.map((r) => r.index);
  } catch {
    return null;
  }
}

// Per-instance memo: the hero's example questions arrive verbatim from many
// visitors, and eager-retrieval + a model's own search_wiki call often embed
// the same text twice in one request. Bounded; a warm lambda keeps it.
const embedCache = new Map<string, string>();
const EMBED_CACHE_MAX = 256;

export async function embedQuery(text: string): Promise<string> {
  const cached = embedCache.get(text);
  if (cached) return cached;
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) throw new Error("AI_GATEWAY_API_KEY not configured");
  const res = await fetch("https://ai-gateway.vercel.sh/v1/embeddings", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "openai/text-embedding-3-small",
      input: [text.slice(0, 8000)],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`embeddings HTTP ${res.status}`);
  const json = (await res.json()) as { data: Array<{ embedding: number[] }> };
  const vector = json.data[0]?.embedding;
  if (!vector) throw new Error("no embedding returned");
  const literal = `[${vector.join(",")}]`; // pgvector literal
  if (embedCache.size >= EMBED_CACHE_MAX) {
    const oldest = embedCache.keys().next().value;
    if (oldest !== undefined) embedCache.delete(oldest);
  }
  embedCache.set(text, literal);
  return literal;
}
