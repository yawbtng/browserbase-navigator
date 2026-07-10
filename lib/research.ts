/**
 * Multi-agent retrieval: deep_research fans out parallel per-domain
 * sub-agents, each locked to one slice of the Browserbase ecosystem with its
 * own scoped tool loop.
 *
 * Division of labor (from the 2026-07-09 bake-off): fast cheap models make
 * unreliable ANSWER models (grok-4.1-fast hallucinated a figure and dressed
 * it with a citation) but excellent RETRIEVAL sub-agents — briefs are
 * constrained to tool-grounded bullets with URLs, and the orchestrator
 * (haiku, the only 6/6 contract model tested) re-grounds everything before
 * it reaches the user.
 */
import { generateText, stepCountIs, tool } from "ai";
import { z } from "zod";
import { getPage, grepWiki, recentChanges, searchWiki } from "./tools";

const SUBAGENT_MODEL =
  process.env.SUBAGENT_MODEL ?? "xai/grok-4.1-fast-non-reasoning";

export const RESEARCH_DOMAINS = {
  platform: {
    source: "docs-browserbase",
    blurb:
      "Browserbase platform docs — sessions, contexts, proxies, keepAlive, Functions, Agents API, Search/Fetch APIs",
  },
  stagehand: {
    source: "docs-stagehand",
    blurb: "Stagehand docs — act/extract/observe/agent, configuration, SDKs",
  },
  skills: {
    source: "browse-sh",
    blurb: "browse CLI and the browse.sh skills catalog",
  },
  marketing: {
    source: "marketing",
    blurb: "browserbase.com — templates, use cases, blog posts",
  },
  news: {
    source: "changelog",
    blurb: "changelog and release history — what shipped and when",
  },
} as const;

export type ResearchDomain = keyof typeof RESEARCH_DOMAINS;
export const RESEARCH_DOMAIN_KEYS = Object.keys(
  RESEARCH_DOMAINS,
) as ResearchDomain[];

export interface DomainBrief {
  domain: ResearchDomain;
  brief: string;
}

export async function runDeepResearch(
  question: string,
  domains: ResearchDomain[],
): Promise<{ briefs: DomainBrief[] }> {
  const picked = [...new Set(domains)].slice(0, 3);
  const briefs = await Promise.all(
    picked.map((domain) =>
      runSubAgent(question, domain).catch(
        (err): DomainBrief => ({
          domain,
          brief: `research sub-agent failed: ${err instanceof Error ? err.message : String(err)}`,
        }),
      ),
    ),
  );
  return { briefs };
}

async function runSubAgent(
  question: string,
  domain: ResearchDomain,
): Promise<DomainBrief> {
  const { source, blurb } = RESEARCH_DOMAINS[domain];
  const result = await generateText({
    model: SUBAGENT_MODEL,
    temperature: 0.1,
    stopWhen: stepCountIs(4),
    system: `You are the "${domain}" retrieval specialist for the Browserbase ecosystem (${blurb}). Your tools are locked to your domain. Answer the orchestrator's research question as a compact factual brief:
- Markdown bullets. EVERY bullet ends with the exact source URL it came from, in parentheses.
- Only facts that appear in your tool results. NEVER add facts from memory.
- No introduction, no conclusion. Max ~250 words.
- If your domain has nothing relevant, reply exactly: no relevant material in ${domain}.`,
    prompt: question,
    tools: {
      search: tool({
        description: `Semantic search within: ${blurb}`,
        inputSchema: z.object({ query: z.string() }),
        execute: ({ query }) => searchWiki(query, source),
      }),
      grep: tool({
        description:
          "Case-insensitive regex over the domain corpus — identifiers, flags, error strings",
        inputSchema: z.object({ pattern: z.string() }),
        execute: ({ pattern }) => grepWiki(pattern, source),
      }),
      read_page: tool({
        description: "Full markdown of an indexed page by its upstream URL",
        inputSchema: z.object({ sourceUrl: z.string() }),
        execute: ({ sourceUrl }) => getPage(sourceUrl),
      }),
      ...(domain === "news"
        ? {
            recent: tool({
              description: "Recent changes across the corpus, newest first",
              inputSchema: z.object({
                days: z.number().int().positive().optional(),
              }),
              execute: ({ days }) => recentChanges(days),
            }),
          }
        : {}),
    },
  });
  return { domain, brief: result.text };
}
