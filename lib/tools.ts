/**
 * The navigator's three knowledge tools, backed by the wiki index (Neon).
 * Citation contract: every passage/page returned includes its upstream URL.
 */
import { embedQuery, sql } from "./wiki";

export interface WikiSearchResult {
  url: string;
  title: string | null;
  source: string;
  heading: string | null;
  snippet: string;
  similarity: number;
}

export interface WikiPage {
  url: string;
  title: string | null;
  source: string;
  markdown: string;
}

export interface RecentChange {
  url: string;
  title: string | null;
  source: string;
  changedAt: string;
}

export type ToolError = { error: string };

export async function searchWiki(
  query: string,
  source?: string,
): Promise<WikiSearchResult[] | ToolError> {
  try {
    const embedding = await embedQuery(query);
    // Over-fetch then cap chunks-per-page: cosine order loves returning four
    // near-identical chunks of one page, which starves the evidence set
    // (seen live: 4× marketing /stagehand for a Stagehand-vs-Agents query).
    const raw = await sql()`
      select * from search_chunks(${embedding}::vector, 24, ${source ?? null})`;
    const perUrl = new Map<string, number>();
    const rows = raw
      .filter((r) => {
        const n = perUrl.get(r.source_url as string) ?? 0;
        perUrl.set(r.source_url as string, n + 1);
        return n < 2;
      })
      .slice(0, 8);
    return rows.map((r) => ({
      url: r.source_url as string,
      title: (r.title as string | null) ?? null,
      source: r.source as string,
      heading: (r.heading as string | null) ?? null,
      snippet: (r.content as string).slice(0, 1200),
      similarity: Number(r.similarity),
    }));
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Exact/pattern match over the corpus — the complement to semantic search.
 * Embeddings whiff on identifiers (keepAlive, REQUEST_RELEASE, error strings,
 * version numbers); a regex scan over the chunk store nails them. The chunks
 * table doubles as the wiki filesystem, so this is "grep the wiki" without
 * needing files at runtime.
 */
export async function grepWiki(
  pattern: string,
  source?: string,
): Promise<WikiSearchResult[] | ToolError> {
  try {
    const rows = await sql()`
      select c.source_url, c.heading, c.content, p.title, p.source
      from chunks c join pages p on p.source_url = c.source_url
      where c.content ~* ${pattern}
        and (${source ?? null}::text is null or p.source = ${source ?? null})
      order by c.source_url, c.chunk_index
      limit 12`;
    return rows.map((r) => {
      const content = r.content as string;
      let at = 0;
      try {
        at = Math.max(0, content.search(new RegExp(pattern, "i")));
      } catch {
        at = 0;
      }
      const start = Math.max(0, at - 200);
      return {
        url: r.source_url as string,
        title: (r.title as string | null) ?? null,
        source: r.source as string,
        heading: (r.heading as string | null) ?? null,
        snippet: content.slice(start, start + 1000),
        similarity: 1,
      };
    });
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function getPage(sourceUrl: string): Promise<WikiPage | ToolError> {
  try {
    const pages = await sql()`
      select source_url, title, source from pages where source_url = ${sourceUrl}`;
    const page = pages[0];
    if (!page) {
      return { error: `no wiki page for ${sourceUrl} — cite only URLs returned by search_wiki` };
    }

    // Page bodies live as ordered chunks; reassemble with headings restored.
    const chunks = await sql()`
      select heading, chunk_index, content from chunks
      where source_url = ${sourceUrl} order by chunk_index`;
    let lastHeading: string | null = null;
    const parts: string[] = [];
    for (const c of chunks) {
      const heading = c.heading as string | null;
      if (heading && heading !== lastHeading) {
        parts.push(`## ${heading}`);
        lastHeading = heading;
      }
      parts.push(c.content as string);
    }
    return {
      url: page.source_url as string,
      title: (page.title as string | null) ?? null,
      source: page.source as string,
      markdown: parts.join("\n\n").slice(0, 24_000),
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function recentChanges(days = 14): Promise<RecentChange[] | ToolError> {
  try {
    // fetched_at only advances when a page's content hash changed — so this
    // IS the change feed, not a crawl log.
    const rows = await sql()`
      select source_url, title, source, fetched_at from pages
      where fetched_at > now() - make_interval(days => ${days})
      order by fetched_at desc limit 50`;
    return rows.map((r) => ({
      url: r.source_url as string,
      title: (r.title as string | null) ?? null,
      source: r.source as string,
      changedAt: (r.fetched_at as Date).toISOString(),
    }));
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}
