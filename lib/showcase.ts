/**
 * Live browser showcase: run a catalog entry (browse.sh skill or template
 * from the wiki) in a real Browserbase session while the user watches the
 * embedded live view; the session recording becomes a replay afterwards.
 *
 * Trust boundary: the ref must resolve to an INDEXED wiki page — the demo
 * brief is the corpus's own playbook/template text, never freeform visitor
 * instructions. This tool is deliberately the only session-spawner in the
 * app (live_fetch refuses to escalate JS shells for the same reason).
 */
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import type { Stagehand } from "@browserbasehq/stagehand";
import { checkRateLimit } from "./rate-limit";
import { getPage } from "./tools";
import type { ToolError } from "./tools";
import { sql } from "./wiki";

const SHOWCASE_LIMIT_PER_HOUR = 2;
const SHOWCASE_GLOBAL_PER_DAY = 10;
const MAX_CONCURRENT_RUNS = 2;
// Sessions hard-timeout server-side; the agent gets a shorter deadline so
// the replay always captures a clean close rather than a platform kill.
const SESSION_TIMEOUT_S = 120;
const AGENT_DEADLINE_MS = 90_000;

const SHOWCASE_MODEL =
  process.env.SHOWCASE_MODEL ??
  process.env.AI_MODEL ??
  "anthropic/claude-haiku-4.5";

export interface ResolvedRef {
  title: string;
  sourceUrl: string;
  brief: string;
}

export interface ShowcaseStart {
  sessionId: string;
  liveViewUrl: string;
  title: string;
  sourceUrl: string;
  status: "running";
}

const SKILL_SLUG = /^[a-z0-9.-]+\/[a-z0-9][a-z0-9-]*$/;

/**
 * SQL scope shared by fuzzy resolution and did-you-mean suggestions: only
 * pages that are legitimate demo material. This is the trust boundary — no
 * matter how forgiving the ref parsing gets, a demo brief can only ever be
 * an indexed catalog page, never visitor-supplied text.
 */
async function queryCatalog(like: string, limit: number): Promise<string[]> {
  const rows = await sql()`
    select source_url from pages
    where (source = 'browse-sh'
        or (source = 'github' and source_url like 'https://github.com/browserbase/%')
        or (source = 'marketing' and source_url like '%browserbase.com/templates/%'))
      and (source_url ilike ${like} or coalesce(title, '') ilike ${like})
    order by length(source_url) asc
    limit ${limit}`;
  return rows.map((r) => r.source_url as string);
}

function cleanTerm(term: string): string {
  return term
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9 ._/-]+/g, " ")
    .trim();
}

/**
 * Strict catalog search: every word present, in order. The ONLY search that
 * may auto-resolve a ref — a demo the user didn't name must never start
 * because one word happened to match (seen in testing: "Stagehand Research
 * Agent" one-word-matched a different template).
 */
async function searchCatalogStrict(
  term: string,
  limit: number,
): Promise<string[]> {
  const cleaned = cleanTerm(term);
  if (cleaned.length < 3) return [];
  return queryCatalog(`%${cleaned.replace(/[ /]+/g, "%")}%`, limit);
}

// URL scaffolding words match everything in the catalog — they carry no
// signal about WHICH entry was meant.
const STOP_WORDS = new Set([
  "browse.sh",
  "skills",
  "github.com",
  "browserbase",
  "browserbase.com",
  "templates",
  "template",
  "blob",
  "main",
  "index.ts",
  "readme.md",
  "www",
]);

/**
 * Relaxed search for did-you-mean SUGGESTIONS only (the model retries with
 * an exact ref, which is the confirmation step): per-word matches ranked by
 * how many distinctive words hit; near-full coverage required.
 */
async function searchCatalogRelaxed(
  term: string,
  limit: number,
): Promise<string[]> {
  const words = cleanTerm(term)
    .split(/[ /]+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w))
    .slice(0, 3);
  if (words.length === 0) return [];
  const hits = new Map<string, number>();
  for (const word of words) {
    for (const url of await queryCatalog(`%${word}%`, 10)) {
      hits.set(url, (hits.get(url) ?? 0) + 1);
    }
  }
  const minHits = Math.max(1, words.length - 1);
  return [...hits.entries()]
    .filter(([, n]) => n >= minHits)
    .sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)
    .slice(0, limit)
    .map(([url]) => url);
}

/** Did-you-mean candidates for the tool error, so the model can retry. */
export async function suggestShowcaseRefs(ref: string): Promise<string[]> {
  try {
    const strict = await searchCatalogStrict(ref, 3);
    if (strict.length > 0) return strict;
    return await searchCatalogRelaxed(ref, 3);
  } catch {
    return [];
  }
}

/**
 * Resolve a catalog ref to an indexed wiki page. Deliberately forgiving
 * about the ref's SHAPE (models pass slugs, full URLs with or without .md,
 * bare repo links, or plain template names — seen live in prod 2026-07-18)
 * while staying strict about the TARGET: only indexed catalog pages resolve.
 */
export async function resolveShowcaseRef(
  ref: string,
): Promise<ResolvedRef | null> {
  const candidates: string[] = [];

  if (ref.includes("://")) {
    if (/^https:\/\/browse\.sh\/skills\//.test(ref)) {
      // Indexed skill pages end in .md; models often cite them without it.
      candidates.push(ref.endsWith(".md") ? ref : `${ref}.md`);
    } else if (/^https:\/\/(www\.)?browserbase\.com\/(templates|use-cases)\//.test(ref)) {
      candidates.push(ref);
      // Not every template has a marketing page: fall back to the
      // templates-monorepo entrypoint for the same name (branch varies —
      // currently `dev` — so LIKE, not a hardcoded branch).
      const name = /\/(?:templates|use-cases)\/([a-z0-9-]+)\/?$/.exec(ref)?.[1];
      if (name) {
        const rows = await sql()`
          select source_url from pages
          where source_url like ${`https://github.com/browserbase/templates/blob/%/typescript/${name}/index.ts`}
          limit 1`;
        if (rows[0]) candidates.push(rows[0].source_url as string);
      }
    } else if (/^https:\/\/github\.com\/browserbase\//.test(ref)) {
      candidates.push(ref);
      // Bare repo link → its indexed README (any default branch).
      if (/^https:\/\/github\.com\/browserbase\/[^/]+\/?$/.test(ref)) {
        const rows = await sql()`
          select source_url from pages
          where source_url like ${`${ref.replace(/\/$/, "")}/blob/%/README.md`}
          limit 1`;
        if (rows[0]) candidates.push(rows[0].source_url as string);
      }
    }
  } else if (SKILL_SLUG.test(ref)) {
    candidates.push(`https://browse.sh/skills/${ref}.md`);
  }

  for (const url of candidates) {
    const page = await getPage(url);
    if (!("error" in page)) {
      return {
        title: page.title ?? ref,
        sourceUrl: page.url,
        // Corpus text only (playbook workflows, template code), sliced so
        // the runner's prompt stays bounded.
        brief: page.markdown.slice(0, 8_000),
      };
    }
  }

  // Last rung: STRICT catalog search over the ref's words ("amazon product
  // scraping" → the matching template page). Relaxed matching is deliberately
  // suggestion-only — never auto-run a demo the user didn't name.
  const fuzzy = await searchCatalogStrict(ref, 1);
  if (fuzzy[0]) {
    const page = await getPage(fuzzy[0]);
    if (!("error" in page)) {
      return {
        title: page.title ?? ref,
        sourceUrl: page.url,
        brief: page.markdown.slice(0, 8_000),
      };
    }
  }
  return null;
}

/**
 * Create the session and return the live view URL fast; the caller schedules
 * runShowcaseAgent() via after() so the user watches the demo live.
 */
export async function startShowcase(
  resolved: ResolvedRef,
  ref: string,
  ip: string,
): Promise<(ShowcaseStart & { handle: Stagehand }) | ToolError> {
  const [perIp, global] = await Promise.all([
    checkRateLimit(ip, "showcase", SHOWCASE_LIMIT_PER_HOUR, 60),
    checkRateLimit("global", "showcase-global", SHOWCASE_GLOBAL_PER_DAY, 24 * 60),
  ]);
  if (!perIp.allowed || !global.allowed) {
    return {
      error:
        "demo budget reached — describe the playbook from the wiki instead and link its source page",
    };
  }

  // Account-wide session slots are shared with other projects; stay tiny.
  // The 3-minute horizon self-heals rows a crashed runner never closed.
  const running = await sql()`
    select count(*)::int as n from showcase_runs
    where status = 'running' and created_at > now() - interval '3 minutes'`;
  if ((running[0]?.n ?? 0) >= MAX_CONCURRENT_RUNS) {
    return {
      error: "demo slots are busy — try again in a couple of minutes",
    };
  }

  // Dynamic import keeps Stagehand (and its bundled provider SDKs) off the
  // chat route's cold path — it loads only when a demo actually starts.
  const { Stagehand } = await import("@browserbasehq/stagehand");
  const stagehand = new Stagehand({
    env: "BROWSERBASE",
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    browserbaseSessionCreateParams: {
      projectId: process.env.BROWSERBASE_PROJECT_ID!,
      timeout: SESSION_TIMEOUT_S,
    },
  });
  await stagehand.init();
  const sessionId = stagehand.browserbaseSessionID;
  if (!sessionId) {
    await stagehand.close().catch(() => {});
    return { error: "could not start a browser session — try again shortly" };
  }

  const Browserbase = (await import("@browserbasehq/sdk")).default;
  const bb = new Browserbase({ apiKey: process.env.BROWSERBASE_API_KEY });
  const debug = await bb.sessions.debug(sessionId);

  await sql()`
    insert into showcase_runs (session_id, ref, title)
    values (${sessionId}, ${ref}, ${resolved.title})`;
  // Opportunistic prune; fire-and-forget.
  void sql()`delete from showcase_runs where created_at < now() - interval '7 days'`.catch(
    () => {},
  );

  return {
    handle: stagehand,
    sessionId,
    liveViewUrl: debug.debuggerFullscreenUrl,
    title: resolved.title,
    sourceUrl: resolved.sourceUrl,
    status: "running",
  };
}

async function logStep(
  sessionId: string,
  step: { tool: string; input: string; ok: boolean; note?: string },
): Promise<void> {
  const client = sql();
  // client.json(), not JSON.stringify: a pre-stringified param gets
  // JSON-encoded AGAIN by the driver and lands as a jsonb string.
  await client`
    update showcase_runs
    set steps = steps || ${client.json([step])}, updated_at = now()
    where session_id = ${sessionId}`.catch(() => {});
}

/**
 * The demo driver: a small tool-loop agent that follows the playbook brief
 * in the live session. Runs inside after() — the chat response has already
 * streamed; results land in showcase_runs for the UI to poll.
 */
export async function runShowcaseAgent(
  stagehand: Stagehand,
  sessionId: string,
  resolved: ResolvedRef,
): Promise<void> {
  // Holder object: the tool closures assign these; a bare `let` gets
  // flow-narrowed to its initial null and the finally block won't typecheck.
  const state: { summary: string | null; extracted: unknown } = {
    summary: null,
    extracted: null,
  };

  const run = async () => {
    await generateText({
      model: SHOWCASE_MODEL,
      temperature: 0.2,
      stopWhen: stepCountIs(6),
      system: [
        "You are demonstrating a Browserbase playbook in a live browser for an audience watching the screen.",
        "Follow the playbook's workflow below. Keep it to a handful of clear steps.",
        "READ-ONLY DEMO: never log in, never enter personal data, never purchase, submit, or do anything irreversible.",
        "End by extracting a concrete result, then call finish with a one-sentence summary.",
        "",
        `# Playbook: ${resolved.title}`,
        resolved.brief,
      ].join("\n"),
      prompt: "Run the demo now.",
      tools: {
        goto: tool({
          description: "Navigate the browser to a URL (http/https only).",
          inputSchema: z.object({ url: z.url() }),
          execute: async ({ url }) => {
            if (!/^https?:\/\//i.test(url)) return "only http(s) URLs";
            try {
              const page = stagehand.context.pages()[0];
              await page.goto(url);
              await logStep(sessionId, { tool: "goto", input: url, ok: true });
              return `at ${url}`;
            } catch (err) {
              await logStep(sessionId, { tool: "goto", input: url, ok: false });
              return `navigation failed: ${err instanceof Error ? err.message : err}`;
            }
          },
        }),
        act: tool({
          description:
            "Perform one natural-language action on the current page (click, scroll, type into search boxes).",
          inputSchema: z.object({ instruction: z.string().max(300) }),
          execute: async ({ instruction }) => {
            try {
              await stagehand.act(instruction);
              await logStep(sessionId, { tool: "act", input: instruction, ok: true });
              return "done";
            } catch (err) {
              await logStep(sessionId, { tool: "act", input: instruction, ok: false });
              return `act failed: ${err instanceof Error ? err.message : err}`;
            }
          },
        }),
        extract: tool({
          description: "Extract data from the current page per an instruction.",
          inputSchema: z.object({ instruction: z.string().max(300) }),
          execute: async ({ instruction }) => {
            try {
              const data = await stagehand.extract(instruction);
              state.extracted = data;
              await logStep(sessionId, { tool: "extract", input: instruction, ok: true });
              return JSON.stringify(data).slice(0, 2_000);
            } catch (err) {
              await logStep(sessionId, { tool: "extract", input: instruction, ok: false });
              return `extract failed: ${err instanceof Error ? err.message : err}`;
            }
          },
        }),
        finish: tool({
          description: "End the demo with a one-sentence summary of what was shown.",
          inputSchema: z.object({ summary: z.string().max(500) }),
          execute: async ({ summary }) => {
            state.summary = summary;
            await logStep(sessionId, { tool: "finish", input: summary, ok: true });
            return "demo complete";
          },
        }),
      },
    });
  };

  let failed = false;
  try {
    await Promise.race([
      run(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("demo deadline")), AGENT_DEADLINE_MS),
      ),
    ]);
  } catch {
    failed = true;
  } finally {
    await stagehand.close().catch(() => {});
    const client = sql();
    await client`
      update showcase_runs
      set status = ${failed && !state.summary ? "failed" : "finished"},
          result = ${client.json({
            summary: state.summary,
            // extract() output arrived over the wire as JSON, so the cast
            // is safe — the driver just needs the type promise.
            extracted: (state.extracted ?? null) as import("postgres").JSONValue,
          })},
          updated_at = now()
      where session_id = ${sessionId}`.catch(() => {});
  }
}
