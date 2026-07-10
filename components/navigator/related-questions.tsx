"use client";

import { ArrowUpRight } from "lucide-react";

/**
 * Splits a completed answer into its body and the trailing "### Keep exploring"
 * follow-up questions. Falls back to `{ body: text, questions: [] }` when the
 * heading is absent or malformed — never drops content.
 */
export function parseKeepExploring(text: string): {
  body: string;
  questions: string[];
} {
  const match = text.search(/\n?#{2,3}\s*Keep exploring/i);
  if (match === -1) {
    return { body: text, questions: [] };
  }

  const body = text.slice(0, match).trimEnd();
  const rest = text.slice(match).replace(
    /^\n?#{2,3}\s*Keep exploring[^\n]*\n?/i,
    ""
  );

  const questions = rest
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s*(?:[-*]|\d+\.)\s+/, "")
        .trim()
    )
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .slice(0, 3);

  // If we found the heading but no parseable items, keep the original text.
  if (questions.length === 0) {
    return { body: text, questions: [] };
  }

  return { body, questions };
}

/**
 * Morphic pattern #3 — the three follow-ups as clickable arrow pills.
 */
export function RelatedQuestions({
  questions,
  onAsk,
}: {
  questions: string[];
  onAsk: (question: string) => void;
}) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 flex flex-col gap-2">
      <span className="eyebrow">Keep exploring</span>
      <div className="flex flex-col items-start gap-2">
        {questions.map((question) => (
          <button
            className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg group inline-flex items-center gap-2 rounded-pill border border-transparent bg-surface-2 px-3 py-1.5 text-left text-sm text-text transition-[color,border-color,border-radius] duration-200 ease-brand hover:rounded-lg hover:border-border-strong light:border-border light:bg-surface"
            key={question}
            onClick={() => onAsk(question)}
            type="button"
          >
            <ArrowUpRight
              aria-hidden
              className="size-4 shrink-0 text-text-muted transition-colors duration-200 ease-brand group-hover:text-brand-text"
            />
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}
