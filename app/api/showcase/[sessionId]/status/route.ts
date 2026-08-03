import { sql } from "@/lib/wiki";

/**
 * Poll target for the showcase artifact card. The Browserbase session UUID
 * is unguessable and only ever handed out inside a chat turn, so it doubles
 * as the access capability — no other auth.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const rows = await sql()`
    select status, steps, result, title, ref, created_at
    from showcase_runs where session_id = ${sessionId}`;
  const run = rows[0];
  if (!run) {
    return Response.json({ error: "unknown demo" }, { status: 404 });
  }

  // Self-heal a stranded run. The agent has a 90s deadline and the session a
  // 120s server-side timeout, so a row still 'running' after 3 minutes means
  // the runner itself died (function eviction, deploy mid-run) and its
  // finally block never wrote the result. Without this the card polls a dead
  // live view forever; reporting it closed sends it to the replay, which
  // exists regardless of how the runner ended.
  let status = run.status as string;
  const startedMs = new Date(run.created_at as string).getTime();
  if (status === "running" && Date.now() - startedMs > 3 * 60_000) {
    status = "failed";
    void sql()`
      update showcase_runs set status = 'failed', updated_at = now()
      where session_id = ${sessionId} and status = 'running'`.catch(() => {});
  }

  return Response.json(
    {
      status,
      steps: run.steps,
      result: run.result,
      title: run.title,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
