import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlan } from "@/lib/plans";
import { PlanHeader } from "./plan-header";
import { PlanMarkdown } from "./plan-markdown";

// Plans are immutable snapshots reachable only by unguessable slug —
// never let search engines index them.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

// MessageResponse (the chat's Streamdown wrapper) owns the reading rhythm —
// 15px/leading-7 with real paragraph/list margins — so the article layer only
// adds document-scale hierarchy plus "fills, not borders" overrides where
// Streamdown's defaults still lean on resting borders. Descendant arbitrary
// variants (`.article-class el` = 0,1,1) reliably beat Streamdown's own
// element classes (0,1,0), so no `!important` is needed anywhere.
const articleClassName = [
  "mt-10 max-w-none text-text",
  // Document heading scale (a plan reads as an article, not a chat bubble).
  "[&_h1]:mt-10 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-medium [&_h1]:tracking-[-0.01em] [&_h1]:text-text first:[&_h1]:mt-0",
  "[&_h2]:text-xl [&_h2]:font-medium [&_h2]:tracking-[-0.01em] [&_h2]:text-text",
  "[&_h3]:text-base [&_h3]:font-medium [&_h3]:text-text",
  "[&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:uppercase [&_h4]:tracking-[0.08em] [&_h4]:text-text-muted",
  "[&_a]:text-brand-text [&_a]:underline [&_a]:underline-offset-2 [&_a]:transition-colors [&_a]:duration-200 [&_a]:ease-brand hover:[&_a]:text-brand-hover",
  "[&_strong]:font-semibold [&_strong]:text-text",
  // Streamdown puts list-disc/list-decimal on ul/ol, but those classes live
  // in node_modules where Tailwind never scans — without these rules lists
  // render marker-less. (Spacing still comes from MessageResponse.)
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li_p]:my-0",
  // Fills over borders: blockquote is a quiet surface, not a left rule.
  "[&_blockquote]:my-5 [&_blockquote]:rounded-md [&_blockquote]:border-0 [&_blockquote]:bg-surface-2 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:text-text-muted [&_blockquote]:italic",
  "[&_hr]:my-8 [&_hr]:border-border",
  // Inline code: fill only — drop Streamdown's text-sm for a size that sits
  // inside 15px body text without jumping.
  "[&_code]:rounded-sm [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_code]:text-text",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  // Tables: Streamdown nests the table in two bordered boxes and we can't
  // touch its source — collapse both wrappers here (same move globals.css
  // makes for `pre`) so the header fill + row hairlines carry the structure.
  "[&_div.bg-sidebar:has(table)]:border-0 [&_div.bg-sidebar:has(table)]:bg-transparent [&_div.bg-sidebar:has(table)]:p-0",
  "[&_div:has(>table)]:rounded-none [&_div:has(>table)]:border-0 [&_div:has(>table)]:bg-transparent",
  "[&_thead]:bg-surface-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_th]:text-text",
  "[&_td]:px-3 [&_td]:py-2 [&_td]:text-text-muted",
  // Streamdown's copy/download toolbars are UI chrome — not for paper.
  // (`div:has(>button)` also drops the empty bordered group the buttons sit in.)
  "print:[&_button]:hidden print:[&_div:has(>button)]:hidden print:text-[13px]",
].join(" ");

export default async function PlanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const plan = await getPlan(slug);
  if (!plan) notFound();

  return (
    <>
      {/* Screen = whatever theme the visitor has; print always forces the
          light token block (DNA §9 — reviewers screenshot/print these).
          `html:root` (specificity 0,1,1) beats globals.css's plain `:root`
          and `.light` rules (0,1,0) regardless of stylesheet order, so this
          wins without touching globals.css. Only the raw tokens are
          overridden — every shadcn var derived via var(--bg) etc. cascades
          through automatically. */}
      <style>{`
        @media print {
          html:root {
            color-scheme: light;
            --bg:#FFFFFF; --surface:#FFFFFF; --surface-2:#F7F5F2; --surface-accent:#E2E9F3; --surface-sunken:#F4F1EC;
            --border:#E7E1D6; --border-strong:#D6CFC2; --border-brand:#FF4500;
            --text:#260F17; --text-muted:#575150; --text-subtle:#777170;
            --brand:#FF4500; --brand-hover:#E63E00; --brand-pressed:#CC3700;
            --brand-fg:#FFFFFF; --brand-fg-strong:#1A0A00; --brand-text:#C43700;
            --brand-glow:rgba(255,69,0,0.22); --brand-pulse:rgba(255,69,0,0.08);
            --success:#71AC38; --success-fg:#4E7A24; --success-tint:rgba(113,172,56,.14);
            --warning:#F4BA41; --warning-fg:#8A5A00; --warning-tint:rgba(244,186,65,.20);
            --error:#CE1F02; --error-fg:#CE1F02; --error-tint:rgba(206,31,2,.10);
            --info:#2D7FB8; --info-fg:#1E6091; --info-tint:rgba(45,127,184,.12);
            --neutral:#A5A09E; --neutral-fg:#777170; --neutral-tint:rgba(120,113,108,.10);
            --scrim:rgba(244,241,236,0.72);
            --highlight:#C5D3E8;
          }
        }
      `}</style>
      <main className="mx-auto max-w-3xl px-6 py-12 print:max-w-none print:px-0">
        <PlanHeader plan={plan} />
        <article className={articleClassName}>
          <PlanMarkdown content={plan.content} />
        </article>
        {/* No border-t: the header separator is the page's one hairline —
            the footer reads as quiet trailing space (fills-not-borders). */}
        <footer className="mt-16 print:hidden">
          <Link
            href="/"
            className="eyebrow transition-colors duration-200 ease-brand hover:text-text"
          >
            Generated by Browserbase Navigator
          </Link>
        </footer>
      </main>
    </>
  );
}
