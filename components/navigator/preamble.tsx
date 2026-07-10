"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * The model's step narration ("I'll search for…", "Based on the results…")
 * used to stream straight into the answer prose. It now renders here as
 * reasoning: live muted text while the model is still working, then it
 * auto-collapses behind a THINKING toggle the moment the real answer starts
 * streaming (the AI Elements Reasoning pattern — thinking is a preview, the
 * response is center stage).
 */
export function Preamble({
  text,
  answerStarted,
}: {
  text: string;
  answerStarted: boolean;
}) {
  const [open, setOpen] = useState(!answerStarted);
  const [userToggled, setUserToggled] = useState(false);

  // Auto-collapse exactly once when the answer takes over; after that the
  // user's own toggle wins.
  useEffect(() => {
    if (answerStarted && !userToggled) {
      setOpen(false);
    }
  }, [answerStarted, userToggled]);

  if (!text.trim()) {
    return null;
  }

  return (
    <div className="mb-3">
      <button
        aria-expanded={open}
        className="eyebrow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand flex items-center gap-1.5 text-text-subtle transition-colors duration-200 ease-brand hover:text-text-muted"
        onClick={() => {
          setUserToggled(true);
          setOpen((v) => !v);
        }}
        type="button"
      >
        Thinking
        <ChevronDown
          aria-hidden
          className={`size-3 transition-transform duration-200 ease-brand ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && (
        <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-6 text-text-subtle">
          {text}
        </p>
      )}
    </div>
  );
}
