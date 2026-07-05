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
import { getPage, recentChanges, searchWiki } from "@/lib/tools";

export const maxDuration = 60;

const MODEL = process.env.AI_MODEL ?? "anthropic/claude-haiku-4-5";

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
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(8),
    tools: {
      search_wiki: tool({
        description:
          "Search the Browserbase ecosystem wiki index for pages relevant to a query. Optionally filter by source (e.g. 'stagehand', 'browserbase-docs', 'mcp-server').",
        inputSchema: z.object({
          query: z.string().describe("Search query"),
          source: z
            .string()
            .optional()
            .describe("Optional source filter, e.g. 'stagehand'"),
        }),
        execute: ({ query, source }) => searchWiki(query, source),
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
