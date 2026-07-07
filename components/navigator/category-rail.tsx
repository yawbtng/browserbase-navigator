"use client";

import { cn } from "@/lib/utils";
import {
  EXAMPLE_CATEGORIES,
  type ExampleCategory,
} from "./example-questions";

export type CategoryValue = ExampleCategory | "All";

/**
 * Pill-tabs that filter the example grid. Active pill is the single orange
 * element on the hero; inactive pills are neutral with the radius-morph detail.
 */
export function CategoryRail({
  className,
  value,
  onChange,
}: {
  className?: string;
  value: CategoryValue;
  onChange: (value: CategoryValue) => void;
}) {
  const options: CategoryValue[] = ["All", ...EXAMPLE_CATEGORIES];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-2",
        className
      )}
    >
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            className={cn(
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-pill px-3 py-1.5 text-xs font-medium transition-[color,background-color,border-color,border-radius] duration-200 ease-brand hover:rounded-lg",
              active
                ? "bg-brand text-brand-fg-strong"
                : "border border-border bg-surface text-text-muted hover:border-border-strong hover:text-text"
            )}
            key={option}
            onClick={() => onChange(option)}
            type="button"
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
