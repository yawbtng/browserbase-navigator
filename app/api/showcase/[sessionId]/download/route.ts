import Browserbase from "@browserbasehq/sdk";
import { checkRateLimit, requestIp } from "@/lib/rate-limit";
import { sql } from "@/lib/wiki";

/**
 * MP4 download for a finished demo (Recording Downloads API).
 *
 * Assembly is asynchronous and driven by two calls on one path: POST enqueues
 * one MP4 per recorded page, GET reports per-page status and mints a signed
 * downloadUrl. This route collapses both into one pollable GET — it POSTs
 * only when nothing has been requested yet, so a polling client can't spam
 * the enqueue endpoint (5 req/min per project).
 *
 * The signed URL is handed to the browser rather than proxied: it's already a
 * short-lived Browserbase-signed link (6h), and streaming tens of MB through
 * a serverless function to re-serve the same bytes buys nothing.
 *
 * Only sessions this app started (rows in showcase_runs) are eligible — the
 * session UUID is the capability, same boundary as the replay proxy.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const rows = await sql()`
    select status from showcase_runs where session_id = ${sessionId}`;
  const run = rows[0];
  if (!run) {
    return Response.json({ error: "unknown demo" }, { status: 404 });
  }
  // Downloads exist only after a session ends; asking earlier is a 409.
  if (run.status === "running") {
    return Response.json({ status: "pending" });
  }

  const limit = await checkRateLimit(requestIp(req), "download", 20, 60);
  if (!limit.allowed) {
    return Response.json({ status: "unavailable" });
  }

  const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });
  try {
    const { downloads } = await bb.sessions.recording.downloads.list(sessionId);

    // Nothing enqueued yet (or a page failed) — request assembly once, then
    // report pending; the client polls this same route.
    if (
      downloads.length === 0 ||
      downloads.every((d) => d.status === "NOT_REQUESTED" || d.status === "FAILED")
    ) {
      await bb.sessions.recording.downloads.create(sessionId);
      return Response.json({ status: "pending" });
    }

    const ready = downloads.filter((d) => d.status === "COMPLETED" && d.downloadUrl);
    if (ready.length > 0) {
      // One MP4 per recorded tab; demos are single-tab, so page 0 is the
      // demo. The CDN serves it as Content-Disposition: attachment and names
      // it {sessionId}-{pageId}.mp4 — a cross-origin `download` attribute
      // can't override that, so we don't pretend to supply a filename.
      return Response.json({ status: "ready", url: ready[0].downloadUrl });
    }
    if (downloads.some((d) => d.status === "PENDING")) {
      return Response.json({ status: "pending" });
    }
    return Response.json({ status: "unavailable" });
  } catch (err) {
    // 409 = session still ending, 410 = recording aged out of retention,
    // 422 = recording was disabled for the session.
    const status = (err as { status?: number }).status;
    if (status === 409) return Response.json({ status: "pending" });
    console.error("showcase download", sessionId, err);
    return Response.json({ status: "unavailable" });
  }
}
