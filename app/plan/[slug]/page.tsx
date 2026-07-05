import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlan } from "@/lib/plans";
import { PlanMarkdown } from "./plan-markdown";

// Plans are immutable snapshots reachable only by unguessable slug —
// never let search engines index them.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PlanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const plan = await getPlan(slug);
  if (!plan) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 border-b pb-4">
        <p className="text-muted-foreground text-xs">
          Saved plan · {new Date(plan.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}{" "}
          · immutable snapshot from{" "}
          <a className="underline underline-offset-2" href="/">
            Browserbase Navigator
          </a>
        </p>
        <h1 className="mt-2 font-semibold text-2xl">{plan.title}</h1>
      </header>
      <article className="prose prose-neutral dark:prose-invert max-w-none">
        <PlanMarkdown content={plan.content} />
      </article>
    </main>
  );
}
