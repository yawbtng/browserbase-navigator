"use client";

import { useMemo, useState } from "react";
import { CategoryRail, type CategoryValue } from "./category-rail";
import { ExampleCard } from "./example-card";
import { EXAMPLE_QUESTIONS } from "./example-questions";

/**
 * director.ai-style empty state (Morphic-restrained, DNA §4 rhythm):
 * eyebrow → single-beat headline → subhead → category rail → example grid.
 * The lone accent on this screen is the header mark + the active category pill.
 */
export function Hero({ onPick }: { onPick: (prompt: string) => void }) {
  const [category, setCategory] = useState<CategoryValue>("All");

  const filtered = useMemo(
    () =>
      category === "All"
        ? EXAMPLE_QUESTIONS
        : EXAMPLE_QUESTIONS.filter((q) => q.category === category),
    [category]
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 py-16 sm:py-24">
      <span className="eyebrow">Answers, with citations</span>
      <h1 className="mt-4 max-w-3xl text-center text-[clamp(2.25rem,5.5vw,4rem)] font-medium leading-[1.05] tracking-[-0.02em] text-text">
        Ask the ecosystem.
      </h1>
      <p className="mt-4 max-w-xl text-center text-sm leading-relaxed text-text-muted">
        Stagehand, the browse CLI, MCP server, Functions, Agents. Every answer
        cites its source.
      </p>

      <CategoryRail className="mt-10" onChange={setCategory} value={category} />

      <div className="mt-6 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((q) => (
          <ExampleCard key={q.title} onPick={onPick} q={q} />
        ))}
      </div>
    </div>
  );
}
