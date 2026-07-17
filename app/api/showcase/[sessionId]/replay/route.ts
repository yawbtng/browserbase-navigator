import Browserbase from "@browserbasehq/sdk";
import { sql } from "@/lib/wiki";

/**
 * Authenticated proxy for the session replay: Browserbase's replay API
 * returns per-page HLS playlists behind the API key, so the browser can't
 * fetch them directly. Only sessions this app started (rows in
 * showcase_runs) are proxied — never arbitrary session ids.
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
  if (run.status === "running") {
    return Response.json({ processing: true }, { status: 202 });
  }

  const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });
  try {
    const meta = await bb.sessions.replays.retrieve(sessionId);
    if (!meta.pages.length) {
      return Response.json({ processing: true }, { status: 202 });
    }
    // Default to the page that was on screen longest — that's the demo.
    const requested = new URL(req.url).searchParams.get("page");
    const page =
      meta.pages.find((p) => p.pageId === requested) ??
      [...meta.pages].sort(
        (a, b) => b.endTimeMs - b.startTimeMs - (a.endTimeMs - a.startTimeMs),
      )[0];
    const playlist = await bb.sessions.replays.retrievePage(
      sessionId,
      page.pageId,
    );
    return new Response(await playlist.text(), {
      headers: {
        "content-type": "application/vnd.apple.mpegurl",
        // Segment URLs inside are signed for 6h; a short private cache is safe.
        "cache-control": "private, max-age=300",
      },
    });
  } catch (err) {
    const status =
      err && typeof err === "object" && "status" in err
        ? Number((err as { status: unknown }).status)
        : 0;
    if (status === 404) {
      // Replay still processing shortly after session end.
      return Response.json({ processing: true }, { status: 202 });
    }
    return Response.json({ error: "replay unavailable" }, { status: 502 });
  }
}
