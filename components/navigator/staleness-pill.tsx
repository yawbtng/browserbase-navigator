import { cn } from "@/lib/utils";

/**
 * Corpus staleness as a mono CI-style status pill (DNA §2 live indicator).
 * Numeral/date forward, tabular-nums, sharp radius. Dot is success when a date
 * exists, warning while the corpus is still syncing.
 */
export function StalenessPill({ corpusDate }: { corpusDate: string | null }) {
  return (
    <span className="eyebrow inline-flex items-center gap-2 rounded-sharp border border-transparent bg-surface-2 px-2.5 py-1 light:border-border light:bg-surface">
      <i
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
          corpusDate ? "bg-success" : "bg-warning"
        )}
      />
      {corpusDate ? `SYNCED · ${corpusDate.toUpperCase()}` : "SYNCING…"}
    </span>
  );
}
