import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { SYSTEM_PROMPT } from "@/lib/system-prompt";
import { getPage, recentChanges, searchWiki } from "@/lib/tools";

export const maxDuration = 60;

const MODEL = process.env.AI_MODEL ?? "anthropic/claude-haiku-4-5";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

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
    },
  });

  return result.toUIMessageStreamResponse({ sendSources: true });
}
