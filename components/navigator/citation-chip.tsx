"use client";

import {
  InlineCitationCard,
  InlineCitationCardBody,
  InlineCitationSource,
} from "@/components/ai-elements/inline-citation";
import { HoverCardTrigger } from "@/components/ui/hover-card";
import type { CitedSource } from "@/components/navigator/source-cards";
import type { Components } from "streamdown";
import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext } from "react";

/**
 * Citation data reaches the markdown-rendered chips through context, NOT
 * through the `components` map: MessageResponse is memoized on `children`
 * only, so a components map rebuilt per render would go stale mid-stream.
 * Context propagation bypasses the memo, and the map stays a module
 * constant (stable identity keeps Streamdown's reconciliation cheap).
 */
const CitationSourcesContext = createContext<{
  sources: CitedSource[];
  onOpen: (url: string) => void;
}>({ sources: [], onOpen: () => {} });

export const CitationSourcesProvider = CitationSourcesContext.Provider;

const CITATION_TEXT = /^\[(\d+)\]$/;

function textOf(children: ReactNode): string {
  if (typeof children === "string") {
    return children;
  }
  if (typeof children === "number") {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(textOf).join("");
  }
  return "";
}

/**
 * The [n] chip: mono superscript pill with a hover card (title + URL).
 * Click opens the cited page in the WebPreview side panel — the app's
 * signature surface — instead of navigating away.
 */
function CitationChip({
  index,
  source,
  onOpen,
}: {
  index: number;
  source: CitedSource;
  onOpen: (url: string) => void;
}) {
  return (
    <InlineCitationCard>
      <HoverCardTrigger asChild>
        <button
          aria-label={`Citation ${index}: ${source.title}`}
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand mx-0.5 inline-flex -translate-y-[2px] items-center rounded-pill border border-border bg-surface px-1.5 py-0 font-mono text-[10px] font-medium leading-4 text-brand-text transition-colors duration-200 ease-brand hover:border-border-brand hover:bg-brand-pulse"
          onClick={() => onOpen(source.url)}
          type="button"
        >
          {index}
        </button>
      </HoverCardTrigger>
      <InlineCitationCardBody className="w-72 border border-border bg-surface-2 p-3 shadow-none ring-0">
        <InlineCitationSource
          title={source.title}
          url={source.url}
        />
        <p className="eyebrow mt-2 text-[10px]">Click to preview</p>
      </InlineCitationCardBody>
    </InlineCitationCard>
  );
}

/**
 * Anchor renderer for the markdown pipeline. `[n]` markers arrive as links
 * (TextWithCitations rewrites `[n]` → `[[n]](url)`), so any anchor whose
 * text is exactly `[n]` becomes a citation chip; every other link keeps
 * Streamdown's default look and target=_blank behavior.
 */
function MarkdownAnchor({
  href,
  children,
  node: _node,
  className,
  ...rest
}: ComponentProps<"a"> & { node?: unknown }) {
  const { sources, onOpen } = useContext(CitationSourcesContext);
  const match = textOf(children).match(CITATION_TEXT);
  const n = match ? Number(match[1]) : 0;
  const source = n > 0 ? sources[n - 1] : undefined;

  if (source) {
    return <CitationChip index={n} onOpen={onOpen} source={source} />;
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

/** Stable components map for MessageResponse/Streamdown. */
export const citationMarkdownComponents: Components = {
  a: MarkdownAnchor,
};
