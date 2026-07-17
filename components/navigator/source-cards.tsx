"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { domainOf } from "./icons";

// Mirrors --ease in globals.css (framer can't consume the CSS var).
const EASE: [number, number, number, number] = [0.3, 0, 0.15, 1];

export interface CitedSource {
  url: string;
  title: string;
}

function Favicon({ host }: { host: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className="eyebrow grid size-4 shrink-0 place-items-center rounded-sm bg-surface-2 text-text-muted">
        {host.charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    // biome-ignore lint/performance/noImgElement: external favicon, no next/image loader
    <img
      alt=""
      className="size-4 shrink-0 rounded-sm"
      height={16}
      onError={() => setFailed(true)}
      src={`https://www.google.com/s2/favicons?domain=${host}&sz=32`}
      width={16}
    />
  );
}

function SourceCard({
  source,
  index,
  onOpen,
}: {
  source: CitedSource;
  index: number;
  onOpen: (url: string) => void;
}) {
  const host = domainOf(source.url);

  return (
    <button
      className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg flex w-44 shrink-0 flex-col gap-1.5 rounded-lg border border-transparent bg-surface-2 px-3 py-2 text-left shadow-inset-top transition-colors duration-200 ease-brand hover:border-border-strong light:border-border light:bg-surface"
      onClick={() => onOpen(source.url)}
      type="button"
    >
      <span className="flex items-center gap-1.5">
        <Favicon host={host} />
        <span className="font-mono text-[11px] text-brand-text">
          [{index + 1}]
        </span>
        <span className="truncate text-xs text-text">{host}</span>
      </span>
      <span className="line-clamp-1 text-[11px] text-text-muted">
        {source.title}
      </span>
    </button>
  );
}

/**
 * Skeleton stand-in for one source card while retrieval runs: same
 * dimensions as the real card, placeholder bars from the fill hierarchy,
 * and (motion permitting) a shimmer sweep driven by the parent overlay.
 */
function SkeletonCard({ shimmer }: { shimmer: boolean }) {
  return (
    <div className="relative flex w-44 shrink-0 flex-col gap-1.5 overflow-hidden rounded-lg border border-transparent bg-surface-2 px-3 py-2 shadow-inset-top light:border-border light:bg-surface">
      <span className="flex items-center gap-1.5">
        <span className="size-4 shrink-0 rounded-sm bg-surface light:bg-surface-2" />
        <span className="h-3 w-20 rounded-sm bg-surface light:bg-surface-2" />
      </span>
      <span className="h-[13px] w-32 rounded-sm bg-surface light:bg-surface-2" />
      {shimmer && (
        <motion.span
          animate={{ x: ["-100%", "100%"] }}
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-border-strong to-transparent"
          transition={{
            duration: 1.4,
            ease: "linear",
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      )}
    </div>
  );
}

/**
 * Morphic pattern #1 — horizontal row of compact source cards above the answer.
 * Favicons with a mono domain-letter fallback; first 4 inline, the rest behind
 * a "+N more" expander. Clicking a card opens the WebPreview panel.
 *
 * While `loading` (retrieval running, no sources parsed yet) the row renders
 * shimmer skeleton cards — static placeholders under prefers-reduced-motion.
 * The real row gets a single IO-gated rise-and-fade on first appearance.
 */
export function SourceCards({
  sources,
  onOpen,
  loading = false,
}: {
  sources: CitedSource[];
  onOpen: (url: string) => void;
  loading?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const reducedMotion = useReducedMotion();

  if (sources.length === 0) {
    if (!loading) {
      return null;
    }
    return (
      <div
        aria-busy="true"
        aria-label="Loading sources"
        className="mb-3 flex gap-2 overflow-x-auto pb-1"
      >
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} shimmer={!reducedMotion} />
        ))}
      </div>
    );
  }

  const INLINE = 4;
  const overflow = sources.length - INLINE;
  const visible = expanded ? sources : sources.slice(0, INLINE);

  return (
    <motion.div
      className="mb-3 flex gap-2 overflow-x-auto pb-1"
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      transition={{ duration: 0.25, ease: EASE }}
      viewport={{ once: true }}
      whileInView={{ opacity: 1, y: 0 }}
    >
      {visible.map((source, i) => (
        <SourceCard
          index={i}
          key={`${source.url}-${i}`}
          onOpen={onOpen}
          source={source}
        />
      ))}
      {!expanded && overflow > 0 && (
        <button
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg eyebrow flex w-20 shrink-0 items-center justify-center rounded-lg border border-transparent bg-surface-2 px-3 py-2 text-text-muted shadow-inset-top transition-colors duration-200 ease-brand hover:border-border-strong hover:text-text light:border-border light:bg-surface"
          onClick={() => setExpanded(true)}
          type="button"
        >
          +{overflow} more
        </button>
      )}
    </motion.div>
  );
}

/**
 * Parse the model-emitted "### Sources" section ([n]: URL — Title per line).
 * Provider source-url parts never arrive from tool-grounded answers, so this
 * section IS the citation data; the UI strips it and renders cards instead.
 */
export function parseSources(text: string): {
  body: string;
  sources: CitedSource[];
} {
  const re = /\n#{2,4}\s*Sources\s*\n([\s\S]*?)(?=\n#{2,4}\s|$)/i;
  const m = text.match(re);
  if (!m) {
    return { body: text, sources: [] };
  }
  const sources: CitedSource[] = [];
  for (const line of m[1].split("\n")) {
    const lm = line.match(
      /\[(\d+)\]:?\s*<?(https?:\/\/[^\s>]+)>?(?:\s*[—–-]\s*(.+))?\s*$/,
    );
    if (lm) {
      sources[Number(lm[1]) - 1] = {
        url: lm[2],
        title: lm[3]?.trim() || lm[2],
      };
    }
  }
  const filtered = sources.filter(Boolean);
  if (filtered.length === 0) {
    return { body: text, sources: [] };
  }
  return { body: text.replace(re, "\n").trimEnd(), sources: filtered };
}
