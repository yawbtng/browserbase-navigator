"use client";

import {
  Artifact,
  ArtifactContent,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai-elements/artifact";
import { ArrowUpRight, Bookmark } from "lucide-react";

/**
 * Saved-plan result card (AI Elements artifact). Renders when the
 * save_plan tool returns `{ url }`: plan title, permalink, and an
 * "Open plan" action to the immutable share page.
 */
export function PlanArtifact({ title, url }: { title: string; url: string }) {
  return (
    <Artifact className="mb-3 max-w-md">
      <ArtifactHeader>
        <div className="flex min-w-0 items-center gap-2.5">
          <Bookmark aria-hidden className="size-4 shrink-0 text-brand" />
          <div className="min-w-0">
            <span className="eyebrow text-brand-text">Plan saved</span>
            <ArtifactTitle className="mt-1 truncate">{title}</ArtifactTitle>
          </div>
        </div>
        <a
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-text transition-colors duration-200 ease-brand hover:bg-surface-2"
          href={url}
          rel="noreferrer"
          target="_blank"
        >
          Open plan
          <ArrowUpRight aria-hidden className="size-3.5" />
        </a>
      </ArtifactHeader>
      <ArtifactContent>
        <span className="block truncate font-mono text-xs text-text-muted">
          {url}
        </span>
      </ArtifactContent>
    </Artifact>
  );
}
