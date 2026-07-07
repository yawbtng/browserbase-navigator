"use client";

import { Bookmark, Check, Copy } from "lucide-react";
import { useState } from "react";

/**
 * Morphic pattern #4 — hover actions on a completed assistant answer.
 * Copy (the body text, sans the follow-ups) and Save as plan (drives the
 * existing save_plan tool by sending "Save this as a plan").
 */
export function MessageActions({
  answer,
  onSaveAsPlan,
}: {
  answer: string;
  onSaveAsPlan: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  return (
    <div className="mt-3 flex items-center gap-1 opacity-0 transition-opacity duration-200 ease-brand group-hover:opacity-100 focus-within:opacity-100">
      <button
        aria-label="Copy answer"
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text-muted transition-colors duration-200 ease-brand hover:bg-surface-2 hover:text-text"
        onClick={copy}
        title="Copy answer"
        type="button"
      >
        {copied ? (
          <Check aria-hidden className="size-3.5 text-success" />
        ) : (
          <Copy aria-hidden className="size-3.5" />
        )}
      </button>
      <button
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text-muted transition-colors duration-200 ease-brand hover:bg-surface-2 hover:text-text"
        onClick={onSaveAsPlan}
        type="button"
      >
        <Bookmark aria-hidden className="size-3.5" />
        Save as plan
      </button>
    </div>
  );
}
