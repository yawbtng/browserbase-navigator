import { sql } from "@/lib/wiki";

// Staleness contract: the banner shows when the index last synced, and the
// page count proves the corpus is actually loaded (0 pages = broken, not fresh).
export async function GET() {
  try {
    const [state] = await sql()`
      select indexed_commit_sha, synced_at from sync_state where id = 1`;
    const [counts] = await sql()`
      select count(*)::int as pages from pages`;
    return Response.json(
      {
        syncedAt: state?.synced_at ?? null,
        indexedCommit: state?.indexed_commit_sha ?? null,
        pages: counts?.pages ?? 0,
      },
      { headers: { "cache-control": "public, max-age=300" } },
    );
  } catch {
    return Response.json(
      { syncedAt: null, indexedCommit: null, pages: 0 },
      { status: 500 },
    );
  }
}
