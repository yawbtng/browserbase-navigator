"use client";

import { ExternalLink, X } from "lucide-react";
import { domainOf } from "./icons";

/**
 * DNA §8 browser-session titlebar for the WebPreview panel. Traffic lights are
 * decorative (aria-hidden); the real controls are Open / Close. Placed as the
 * child of WebPreviewNavigation so there is one bar, not two.
 */
export function BrowserChrome({
  url,
  onClose,
}: {
  url: string;
  onClose: () => void;
}) {
  return (
    <div className="flex w-full items-center gap-3">
      <span aria-hidden className="flex gap-1.5">
        <i className="size-3 rounded-full bg-wc-red" />
        <i className="size-3 rounded-full bg-wc-yellow" />
        <i className="size-3 rounded-full bg-wc-green" />
      </span>
      <span className="min-w-0 flex-1 truncate rounded-sm border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-text-muted">
        {domainOf(url)}
      </span>
      <span className="flex items-center gap-3">
        <a
          aria-label="Open in new tab"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg text-text-muted transition-colors duration-200 ease-brand hover:text-text"
          href={url}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink className="size-3.5" />
        </a>
        <button
          aria-label="Close preview"
          className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg text-text-muted transition-colors duration-200 ease-brand hover:text-text"
          onClick={onClose}
          type="button"
        >
          <X className="size-3.5" />
        </button>
      </span>
    </div>
  );
}
