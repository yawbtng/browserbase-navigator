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
    const rows = await sql()`
      select * from search_chunks(${embedding}::vector, 8, ${source ?? null})`;
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
