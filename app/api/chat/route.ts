import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  tool,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { savePlan } from "@/lib/plans";
import { checkRateLimit, requestIp } from "@/lib/rate-limit";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { getPage, grepWiki, recentChanges, searchWiki } from "@/lib/tools";

export const maxDuration = 60;

const MODEL = process.env.AI_MODEL ?? "anthropic/claude-haiku-4-5";

// The six real source values in the index — schema-enforced so the model
// can't invent a filter (live failure: it passed "browse.sh" for "browse-sh"
// and every tool silently returned []).
const SOURCES = [
  "docs-browserbase",
  "docs-stagehand",
  "browse-sh",
  "marketing",
  "github",
  "changelog",
] as const;
const sourceFilter = z
  .enum(SOURCES)
  .optional()
  .describe(
    "Optional source filter: docs-browserbase (platform docs), docs-stagehand, browse-sh (skills), marketing (browserbase.com pages), github (READMEs/releases), changelog",
  );

// Abuse controls (plan Phase 5): caps are generous for real use, hostile to bulk.
const CHAT_LIMIT_PER_HOUR = 30;
const PLAN_LIMIT_PER_DAY = 10;
const MAX_MESSAGE_CHARS = 4_000;
const MAX_MESSAGES = 40;

export async function POST(req: Request) {
  // Spend kill switch: flip NAVIGATOR_DISABLED=1 in Vercel env, done.
  if (process.env.NAVIGATOR_DISABLED === "1") {
    return Response.json(
      { error: "Navigator is temporarily paused." },
      { status: 503 },
    );
  }

  const ip = requestIp(req);
  const rate = await checkRateLimit(ip, "chat", CHAT_LIMIT_PER_HOUR, 60);
  if (!rate.allowed) {
    return Response.json(
      { error: "Rate limit reached — try again in a bit." },
      { status: 429 },
    );
  }

  const { messages }: { messages: UIMessage[] } = await req.json();
  if (messages.length > MAX_MESSAGES) {
    return Response.json(
      { error: "Conversation too long — start a new chat." },
      { status: 413 },
    );
  }
  const lastText = messages
    .at(-1)
    ?.parts.reduce(
      (n, p) => n + (p.type === "text" ? p.text.length : 0),
      0,
    );
  if ((lastText ?? 0) > MAX_MESSAGE_CHARS) {
    return Response.json({ error: "Message too long." }, { status: 413 });
  }

  const origin = new URL(req.url).origin;

  const result = streamText({
    model: MODEL,
    // System prompt rides in the messages array so it can carry an Anthropic
    // cache breakpoint — multi-step turns re-send it up to 8 times otherwise.
    // (The breakpoint covers tools + system, which clears Haiku's 2048-token
    // minimum cacheable prefix; the system prompt alone would not.)
    allowSystemInMessages: true,
    messages: [
      {
        role: "system" as const,
        content: SYSTEM_PROMPT,
        providerOptions: {
          anthropic: { cacheControl: { type: "ephemeral" } },
        },
      },
      ...(await convertToModelMessages(messages)),
    ],
    stopWhen: stepCountIs(8),
    tools: {
      search_wiki: tool({
        description:
          "Semantic search over the Browserbase ecosystem wiki index. Prefer NO source filter unless certain — an over-narrow filter hides results.",
        inputSchema: z.object({
          query: z.string().describe("Search query"),
          source: sourceFilter,
        }),
        execute: ({ query, source }) => searchWiki(query, source),
      }),
      grep_wiki: tool({
        description:
          "Regex/exact-match search over the wiki corpus (case-insensitive POSIX regex). Use for identifiers, method names, error messages, flags, version numbers — anywhere the exact string matters more than meaning. Complements search_wiki (semantic).",
        inputSchema: z.object({
          pattern: z
            .string()
            .describe("Case-insensitive regex, e.g. 'keepAlive' or 'REQUEST_RELEASE'"),
          source: sourceFilter,
        }),
        execute: ({ pattern, source }) => grepWiki(pattern, source),
      }),
      get_page: tool({
        description:
          "Fetch the full markdown of an indexed page by its upstream URL. Read a page before citing it.",
        inputSchema: z.object({
          sourceUrl: z.string().describe("Upstream URL of the indexed page"),
        }),
        execute: ({ sourceUrl }) => getPage(sourceUrl),
      }),
      recent_changes: tool({
        description:
          "List recent changes across the indexed corpus, newest first.",
        inputSchema: z.object({
          days: z
            .number()
            .int()
            .positive()
            .optional()
            .describe("Look-back window in days (default 30)"),
        }),
        execute: ({ days }) => recentChanges(days),
      }),
      save_plan: tool({
        description:
          "Save a finished recommendation as an immutable plan the user can share. Call ONLY when the user asks to save/share the plan. Content is markdown and must keep its inline [n] citations plus a Sources list of the cited URLs.",
        inputSchema: z.object({
          title: z.string().describe("Short plan title"),
          content: z
            .string()
            .describe(
              "Full plan markdown, including inline [n] citations and a final Sources section listing each cited URL",
            ),
        }),
        execute: async ({ title, content }) => {
          const planRate = await checkRateLimit(
            ip,
            "plan",
            PLAN_LIMIT_PER_DAY,
            24 * 60,
          );
          if (!planRate.allowed) {
            return {
              error: "Plan-saving limit reached for today (10/day per IP).",
            };
          }
          const { slug } = await savePlan(title, content);
          return { url: `${origin}/plan/${slug}` };
        },
      }),
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream, sendSources: true }),
  });
}
