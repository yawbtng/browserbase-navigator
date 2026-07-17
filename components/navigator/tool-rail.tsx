"use client";

import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtSearchResult,
  ChainOfThoughtSearchResults,
  ChainOfThoughtStep,
} from "@/components/ai-elements/chain-of-thought";
import { Check } from "lucide-react";
import { useState } from "react";
import { domainOf } from "./icons";

export interface ToolPart {
  type: string;
  toolCallId?: string;
  state?:
    | "input-streaming"
    | "input-available"
    | "output-available"
    | "output-error";
  input?: Record<string, unknown>;
  output?: unknown;
  errorText?: string;
}

const BADGES: Record<string, string> = {
  search_wiki: "SEARCH",
  grep_wiki: "GREP",
  get_page: "READ",
  recent_changes: "CHANGES",
  save_plan: "SAVE",
  deep_research: "RESEARCH",
  live_search: "LIVE",
  live_fetch: "FETCH",
};

function toolName(type: string): string {
  return type.replace(/^tool-/, "");
}

function isRunning(part: ToolPart): boolean {
  return part.state === "input-streaming" || part.state === "input-available";
}

function asArray(output: unknown): unknown[] | null {
  return Array.isArray(output) ? (output as unknown[]) : null;
}

function outputError(output: unknown): string | null {
  if (output && typeof output === "object" && "error" in output) {
    const err = (output as { error: unknown }).error;
    return typeof err === "string" ? err : "error";
  }
  return null;
}

function inputSummary(name: string, input: Record<string, unknown> = {}): string {
  switch (name) {
    case "search_wiki":
      return String(input.query ?? "");
    case "grep_wiki":
      return String(input.pattern ?? "");
    case "get_page":
      return input.sourceUrl ? domainOf(String(input.sourceUrl)) : "";
    case "recent_changes":
      return `last ${input.days ?? 30}d`;
    case "save_plan":
      return String(input.title ?? "");
    case "live_search":
      return String(input.query ?? "");
    case "live_fetch":
      return input.url ? domainOf(String(input.url)) : "";
    case "deep_research":
      return Array.isArray(input.domains)
        ? `${input.domains.length} sub-agents: ${(input.domains as string[]).join(", ")}`
        : "";
    default:
      return "";
  }
}

function resultSummary(name: string, output: unknown): string {
  const arr = asArray(output);
  const n = arr?.length ?? 0;
  switch (name) {
    case "search_wiki":
      return `${n} passages`;
    case "grep_wiki":
      return `${n} matches`;
    case "get_page":
      return "read";
    case "recent_changes":
      return `${n} entries`;
    case "save_plan":
      return "saved";
    case "live_search":
      return `${n} live results`;
    case "live_fetch":
      return "fetched";
    case "deep_research": {
      const briefs =
        output && typeof output === "object" && "briefs" in output
          ? (output as { briefs: unknown[] }).briefs
          : null;
      return Array.isArray(briefs) ? `${briefs.length} briefs` : "done";
    }
    default:
      return arr ? `${n} results` : "done";
  }
}

function detailTitles(output: unknown): string[] {
  const arr = asArray(output);
  if (!arr) {
    return [];
  }
  return arr
    .slice(0, 3)
    .map((row) => {
      if (row && typeof row === "object") {
        const r = row as { title?: unknown; url?: unknown };
        if (typeof r.title === "string" && r.title.trim()) {
          return r.title;
        }
        if (typeof r.url === "string") {
          return domainOf(r.url);
        }
      }
      return "";
    })
    .filter(Boolean);
}

function ToolStep({ part }: { part: ToolPart }) {
  const name = toolName(part.type);
  const badge = BADGES[name] ?? name.toUpperCase();
  const summary = inputSummary(name, part.input);

  const running = isRunning(part);
  const errText =
    part.state === "output-error"
      ? part.errorText ?? "failed"
      : outputError(part.output);

  const titles = detailTitles(part.output);

  return (
    <ChainOfThoughtStep
      label={
        <span className="flex items-center gap-2">
          <span className="eyebrow rounded-sharp bg-surface px-1.5 py-0.5 text-text-muted">
            {badge}
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-xs text-text-muted">
            {summary}
          </span>

          {running && (
            <i className="size-1.5 shrink-0 animate-pulse rounded-full bg-brand" />
          )}

          {errText && (
            <span className="truncate font-mono text-xs text-error-fg">
              {errText}
            </span>
          )}

          {!(running || errText) && (
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="whitespace-nowrap font-mono text-xs text-text">
                {resultSummary(name, part.output)}
              </span>
              <Check aria-hidden className="size-3.5 text-success" />
            </span>
          )}
        </span>
      }
      status={running ? "active" : "complete"}
    >
      {titles.length > 0 && (
        <ChainOfThoughtSearchResults>
          {titles.map((title, i) => (
            <ChainOfThoughtSearchResult key={i}>
              {title}
            </ChainOfThoughtSearchResult>
          ))}
        </ChainOfThoughtSearchResults>
      )}
    </ChainOfThoughtStep>
  );
}

/**
 * The one meta row above an answer: the operator step rail rebuilt on the
 * AI Elements chain-of-thought. The model's step narration ("I'll search
 * for…") renders as the rail's first step (THOUGHT badge, muted text), the
 * tool steps follow (mono badge + input + result note per step). The rail
 * streams open live, then collapses automatically once the answer starts
 * streaming — unless the user has toggled it, in which case their choice
 * wins. Messages with no tool calls and no narration render nothing.
 */
export function ToolRail({
  parts,
  preamble = "",
  answerStarted,
}: {
  parts: ToolPart[];
  preamble?: string;
  answerStarted: boolean;
}) {
  const [userOpen, setUserOpen] = useState<boolean | null>(null);
  const open = userOpen ?? !answerStarted;
  const thought = preamble.trim();

  if (parts.length === 0 && !thought) {
    return null;
  }

  const running = parts.some(isRunning);
  const current = running ? [...parts].reverse().find(isRunning) : undefined;
  // Narration is live when nothing else claims the header: pre-answer,
  // no tool mid-flight.
  const thinking = Boolean(thought) && !answerStarted && !current;
  const stepCount = parts.length + (thought ? 1 : 0);

  return (
    <ChainOfThought className="mb-3" onOpenChange={setUserOpen} open={open}>
      <ChainOfThoughtHeader>
        {current ? (
          <>
            <i className="size-1.5 shrink-0 animate-pulse rounded-full bg-brand" />
            <span className="eyebrow rounded-sharp bg-surface px-1.5 py-0.5 text-text-muted">
              {BADGES[toolName(current.type)] ??
                toolName(current.type).toUpperCase()}
            </span>
            <span className="min-w-0 truncate font-mono text-xs text-text-muted">
              {inputSummary(toolName(current.type), current.input)}
            </span>
          </>
        ) : thinking ? (
          <>
            <i className="size-1.5 shrink-0 animate-pulse rounded-full bg-brand" />
            <span className="eyebrow rounded-sharp bg-surface px-1.5 py-0.5 text-text-muted">
              THOUGHT
            </span>
          </>
        ) : (
          <span className="eyebrow">
            {stepCount} step{stepCount === 1 ? "" : "s"}
          </span>
        )}
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent>
        {thought && (
          <ChainOfThoughtStep
            label={
              <span className="eyebrow rounded-sharp bg-surface px-1.5 py-0.5 text-text-muted">
                THOUGHT
              </span>
            }
            status={thinking ? "active" : "complete"}
          >
            <p className="whitespace-pre-wrap text-[13px] leading-6 text-text-muted">
              {thought}
            </p>
          </ChainOfThoughtStep>
        )}
        {parts.map((part, index) => (
          <ToolStep key={part.toolCallId ?? `${part.type}-${index}`} part={part} />
        ))}
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
}
