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

export async function embedQuery(text: string): Promise<string> {
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
  return `[${vector.join(",")}]`; // pgvector literal
}
