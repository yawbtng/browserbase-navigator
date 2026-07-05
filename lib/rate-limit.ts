/**
 * Per-IP sliding-window rate limits, backed by the same Neon database as the
 * index — no extra service for a demo-scale app. Denied requests are not
 * recorded, so a limited caller regains capacity as old events age out.
 */
import { sql } from "./wiki";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

export async function checkRateLimit(
  ip: string,
  kind: string,
  limit: number,
  windowMinutes: number,
): Promise<RateLimitResult> {
  const rows = await sql()`
    with pruned as (
      delete from rate_events
      where at < now() - interval '1 day'
    )
    select count(*)::int as used from rate_events
    where ip = ${ip} and kind = ${kind}
      and at > now() - make_interval(mins => ${windowMinutes})`;
  const used = rows[0]?.used ?? 0;
  if (used >= limit) {
    return { allowed: false, remaining: 0 };
  }
  await sql()`insert into rate_events (ip, kind) values (${ip}, ${kind})`;
  return { allowed: true, remaining: limit - used - 1 };
}

/** Client IP from Vercel/proxy headers; "local" for dev. */
export function requestIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || "local";
}
