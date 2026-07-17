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
    select status, steps, result, title, ref
    from showcase_runs where session_id = ${sessionId}`;
  const run = rows[0];
  if (!run) {
    return Response.json({ error: "unknown demo" }, { status: 404 });
  }
  return Response.json(
    {
      status: run.status,
      steps: run.steps,
      result: run.result,
      title: run.title,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
