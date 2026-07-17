/**
 * Live-data fallback tier — Browserbase Search + Fetch APIs.
 *
 * The wiki index refreshes every ~2 days; these tools cover the gap (fresh
 * launches, events, prices, pages outside the crawl). Same contract as
 * lib/tools.ts: return `T[] | ToolError`, never throw, every item carries a
 * citable URL. Deliberately NOT part of the eager-prefetch fast path — they
 * only run when the model calls them, and the route registers them only when
 * BROWSERBASE_API_KEY is set.
 */
import Browserbase from "@browserbasehq/sdk";
import type { ToolError } from "./tools";

export interface LiveSearchResult {
  url: string;
  title: string;
  snippet: string;
  source: "live";
}

export interface LiveFetchResult {
  url: string;
  title: string;
  markdown: string;
  source: "live";
}

let client: Browserbase | null = null;
function bb(): Browserbase {
  if (!client) {
    client = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });
  }
  return client;
}

// The Search API has no domain filter, so ecosystem scoping is a post-sort:
// ecosystem hits first (stable order within each group), then the open web.
const ECOSYSTEM = [
  /(^|\.)browserbase\.com$/i,
  /(^|\.)stagehand\.dev$/i,
  /(^|\.)browse\.sh$/i,
  /(^|\.)director\.ai$/i,
];

function isEcosystem(url: string): boolean {
  try {
    const u = new URL(url);
    if (ECOSYSTEM.some((re) => re.test(u.hostname))) return true;
    return (
      u.hostname === "github.com" &&
      u.pathname.toLowerCase().startsWith("/browserbase")
    );
  } catch {
    return false;
  }
}

// Plan-limit and burst errors become instructions the model can act on.
function mapApiError(err: unknown): ToolError {
  const status =
    err && typeof err === "object" && "status" in err
      ? Number((err as { status: unknown }).status)
      : 0;
  if (status === 402)
    return { error: "live tier monthly quota exhausted — answer from the wiki index" };
  if (status === 403)
    return { error: "live tier not enabled on this Browserbase plan — answer from the wiki index" };
  if (status === 429)
    return { error: "live tier is busy — answer from the wiki index" };
  return { error: err instanceof Error ? err.message : String(err) };
}

export async function liveSearch(
  query: string,
): Promise<LiveSearchResult[] | ToolError> {
  try {
    const { results } = await bb().search.web({
      query: query.slice(0, 200),
      numResults: 10,
    });
    const eco = results.filter((r) => isEcosystem(r.url));
    const rest = results.filter((r) => !isEcosystem(r.url));
    // Recency questions legitimately leave the ecosystem (meetups, coverage),
    // so an empty ecosystem set falls back to the open-web top 5.
    return [...eco, ...rest].slice(0, 5).map((r) => ({
      url: r.url,
      title: r.title,
      // Search returns no body text — surface what it does have; content
      // needs a follow-up live_fetch.
      snippet: [
        r.publishedDate ? `published ${r.publishedDate.slice(0, 10)}` : "",
        r.author ? `by ${r.author}` : "",
      ]
        .filter(Boolean)
        .join(" — "),
      source: "live" as const,
    }));
  } catch (err) {
    return mapApiError(err);
  }
}

export async function liveFetch(
  url: string,
): Promise<LiveFetchResult | ToolError> {
  try {
    const res = await bb().fetchAPI.create({
      url,
      format: "markdown",
      allowRedirects: true,
    });
    const markdown = typeof res.content === "string" ? res.content : "";
    // The Fetch API never executes JavaScript: client-rendered pages come
    // back as near-empty shells. Return a typed instruction instead of junk —
    // and deliberately do NOT escalate to a browser session here (this is an
    // anonymous public endpoint; run_showcase is the only session-spawner).
    const trimmed = markdown.trim();
    if (
      trimmed.length < 200 ||
      (trimmed.length < 2_000 &&
        /enable javascript|javascript is (required|disabled)/i.test(trimmed))
    ) {
      return {
        error:
          "page requires JavaScript to render — content unavailable via live_fetch; do not retry this URL, answer from search result titles or say the page could not be read",
      };
    }
    if (res.statusCode >= 400) {
      return { error: `upstream returned HTTP ${res.statusCode} for ${url}` };
    }
    return {
      url,
      title: trimmed.match(/^#\s+(.+)$/m)?.[1] ?? url,
      markdown: trimmed.slice(0, 20_000),
      source: "live" as const,
    };
  } catch (err) {
    return mapApiError(err);
  }
}
