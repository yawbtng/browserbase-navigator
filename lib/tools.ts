/**
 * Stub implementations for the Navigator's wiki index tools.
 *
 * Each function is a clean seam for wiring the Supabase-backed corpus later:
 * replace the body, keep the signature.
 */

export interface WikiSearchResult {
  url: string;
  title: string;
  source: string;
  snippet: string;
}

export interface WikiPage {
  url: string;
  title: string;
  markdown: string;
}

export interface RecentChange {
  date: string;
  source: string;
  summary: string;
  urls: string[];
}

export interface ToolError {
  error: string;
}

const NOT_WIRED: ToolError = { error: "index not wired yet" };

export async function searchWiki(
  query: string,
  source?: string
): Promise<WikiSearchResult[] | ToolError> {
  void query;
  void source;
  return NOT_WIRED;
}

export async function getPage(
  sourceUrl: string
): Promise<WikiPage | ToolError> {
  void sourceUrl;
  return NOT_WIRED;
}

export async function recentChanges(
  days?: number
): Promise<RecentChange[] | ToolError> {
  void days;
  return NOT_WIRED;
}
