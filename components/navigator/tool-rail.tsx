"use client";

import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
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
};

function toolName(type: string): string {
  return type.replace(/^tool-/, "");
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

function ToolStep({ part, index }: { part: ToolPart; index: number }) {
  const [open, setOpen] = useState(false);
  // The global CSS reduced-motion rule doesn't govern Framer's JS engine.
  const reduceMotion = useReducedMotion();
  const name = toolName(part.type);
  const badge = BADGES[name] ?? name.toUpperCase();
  const summary = inputSummary(name, part.input);

  const running =
    part.state === "input-streaming" || part.state === "input-available";
  const errText =
    part.state === "output-error"
      ? part.errorText ?? "failed"
      : outputError(part.output);

  const saveUrl =
    name === "save_plan" &&
    part.output &&
    typeof part.output === "object" &&
    "url" in part.output
      ? String((part.output as { url: unknown }).url)
      : null;

  const titles = detailTitles(part.output);

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      // Flat rows, docs-Assistant style — the mono badge carries the texture,
      // not a box (user calibration 2026-07-07: "a lot of borders").
      className="rounded-sharp"
      initial={
        reduceMotion ? false : { opacity: 0, scale: 0.96, filter: "blur(4px)" }
      }
      transition={{ duration: 0.22, delay: index * 0.04, ease: [0.3, 0, 0.15, 1] }}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="eyebrow rounded-sharp bg-surface px-1.5 py-0.5 text-text-muted">
          {badge}
        </span>
        <span className="min-w-0 flex-1 truncate font-mono text-xs text-text-muted">
          {summary}
        </span>

        {running && (
          <span className="flex items-center gap-1.5 text-text-subtle">
            <i className="size-1.5 animate-pulse rounded-full bg-brand" />
          </span>
        )}

        {errText && (
          <span className="truncate font-mono text-xs text-error-fg">
            {errText}
          </span>
        )}

        {!(running || errText) && (
          <span className="flex items-center gap-1.5">
            {saveUrl ? (
              <a
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg font-mono text-xs text-brand-text underline-offset-2 hover:underline"
                href={saveUrl}
                rel="noreferrer"
                target="_blank"
              >
                permalink
              </a>
            ) : (
              <span className="whitespace-nowrap font-mono text-xs text-text">
                {resultSummary(name, part.output)}
              </span>
            )}
            <Check aria-hidden className="size-3.5 text-success" />
          </span>
        )}

        {titles.length > 0 && (
          <button
            aria-label={open ? "Hide details" : "Show details"}
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg text-text-subtle transition-transform duration-200 ease-brand hover:text-text-muted"
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            <ChevronDown
              className={cn("size-3.5", open && "rotate-180")}
            />
          </button>
        )}
      </div>

      {open && titles.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-border px-3 py-2">
          {titles.map((title, i) => (
            <li
              className="truncate font-mono text-[11px] text-text-muted"
              key={i}
            >
              {title}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

/**
 * Morphic pattern #2 — tool-activity step rail. Renders typed tool parts as
 * sharp-radius rows with a mono badge, input summary, and (on output) a result
 * count. Rows resolve top-down with blurScaleIn; global reduced-motion gates it.
 */
export function ToolRail({ parts }: { parts: ToolPart[] }) {
  if (parts.length === 0) {
    return null;
  }

  return (
    <div className="mb-3 flex flex-col gap-1.5">
      {parts.map((part, index) => (
        <ToolStep
          index={index}
          key={part.toolCallId ?? `${part.type}-${index}`}
          part={part}
        />
      ))}
    </div>
  );
}
