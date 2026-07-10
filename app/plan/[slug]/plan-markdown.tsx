"use client";

import { MessageResponse } from "@/components/ai-elements/message";
import type { Components } from "streamdown";
import type { ComponentProps, ReactNode } from "react";
import { useMemo } from "react";

/**
 * Plans are static documents — citations render as small mono brand markers,
 * NOT the chat's interactive hover-chip system (no sources sidebar to open
 * here; the plan carries its own Sources section instead).
 *
 * Saved content keeps inline `[n]` as plain text (see save_plan's tool
 * description in app/api/chat/route.ts), which Streamdown would render as
 * literal body text. Rewriting `[n]` → `[n](#src-n)` turns each marker into
 * an anchor the components map below can catch and style.
 */
const CITATION_HREF = /^#src-(\d+)$/;
const CITATION_TEXT = /^\[?(\d+)\]?$/;

// Fenced blocks and inline code spans must keep their `[n]` untouched.
const CODE_SEGMENTS = /(```[\s\S]*?(?:```|$)|~~~[\s\S]*?(?:~~~|$)|`[^`\n]+`)/g;

function markCitations(content: string): string {
  return content
    .split(CODE_SEGMENTS)
    .map((segment, i) =>
      i % 2 === 1
        ? segment // odd indexes are the code segments — leave verbatim
        : // `(?!\(|:)` skips real links `[2024](url)` and ref defs `[1]: url`.
          segment.replace(/\[(\d{1,3})\](?!\(|:)/g, "[$1](#src-$1)"),
    )
    .join("");
}

function textOf(children: ReactNode): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(textOf).join("");
  return "";
}

function PlanAnchor({
  href,
  children,
  node: _node,
  className,
  ...rest
}: ComponentProps<"a"> & { node?: unknown }) {
  const marker = href?.match(CITATION_HREF);
  const n = marker
    ? Number(marker[1])
    : CITATION_TEXT.test(textOf(children))
      ? Number(textOf(children).match(CITATION_TEXT)?.[1])
      : 0;

  // Static mono brand marker (DNA: single accent, mono for data/labels).
  if (n > 0) {
    const sup = (
      <sup className="mx-px font-mono text-[0.6875rem] font-medium tracking-[0.02em] text-brand-text">
        [{n}]
      </sup>
    );
    // `[n](real-url)` (some saves link their citations) stays clickable but
    // wears the same marker so citations read consistently either way.
    return marker ? (
      sup
    ) : (
      <a href={href} rel="noreferrer" target="_blank" {...rest}>
        {sup}
      </a>
    );
  }

  // Mirror Streamdown's default link renderer (class + safety attrs).
  return (
    <a
      className={className ?? "wrap-anywhere font-medium text-primary underline"}
      href={href}
      rel="noreferrer"
      target="_blank"
      {...rest}
    >
      {children}
    </a>
  );
}

// Module constant — stable identity keeps Streamdown reconciliation cheap.
const planMarkdownComponents: Components = { a: PlanAnchor };

export function PlanMarkdown({ content }: { content: string }) {
  const marked = useMemo(() => markCitations(content), [content]);
  return (
    <MessageResponse components={planMarkdownComponents}>
      {marked}
    </MessageResponse>
  );
}
