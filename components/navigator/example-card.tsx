"use client";

import type { ExampleQuestion } from "./example-questions";
import { CATEGORY_ICON } from "./icons";

/**
 * DNA card — hairline border + inset-top depth, radius-morph on hover.
 * Click prefills the input only (director.ai behavior), never auto-submits.
 */
export function ExampleCard({
  q,
  onPick,
}: {
  q: ExampleQuestion;
  onPick: (prompt: string) => void;
}) {
  const Icon = CATEGORY_ICON[q.category];

  return (
    <button
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg group flex flex-col items-start gap-2 rounded-lg border border-transparent bg-surface p-5 text-left shadow-inset-top transition-[color,border-color] duration-200 ease-brand hover:border-border-brand light:border-border"
      onClick={() => onPick(q.prompt)}
      type="button"
    >
      <Icon
        aria-hidden
        className="size-4 text-text-muted transition-colors duration-200 ease-brand group-hover:text-brand-text"
      />
      <span className="text-sm font-medium tracking-[-0.01em] text-text">
        {q.title}
      </span>
      <span className="line-clamp-2 text-xs leading-relaxed text-text-muted">
        {q.blurb}
      </span>
    </button>
  );
}
