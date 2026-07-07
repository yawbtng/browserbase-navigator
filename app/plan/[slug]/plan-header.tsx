import Link from "next/link";
import type { SavedPlan } from "@/lib/plans";

function formatSavedDate(createdAt: string): string {
  return new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function PlanHeader({ plan }: { plan: SavedPlan }) {
  return (
    <header className="border-b border-border pb-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="grid size-5 place-items-center rounded-sm bg-brand font-mono text-[13px] font-semibold leading-none text-brand-fg-strong"
          >
            ›
          </span>
          <span className="eyebrow">Browserbase Navigator</span>
        </Link>
        <span className="eyebrow">Immutable snapshot</span>
      </div>
      <h1 className="mt-6 text-3xl font-medium tracking-[-0.015em] text-text">
        {plan.title}
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        Saved {formatSavedDate(plan.createdAt)}{" "}
        <span className="print:hidden">
          ·{" "}
          <Link
            href="/"
            className="underline underline-offset-2 transition-colors duration-200 ease-brand hover:text-text"
          >
            start a new chat →
          </Link>
        </span>
      </p>
    </header>
  );
}
