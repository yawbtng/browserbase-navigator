# Browserbase Navigator — Authoritative Redesign Build Spec

> **Status:** ready to build. Three lenses (IA / brand-tokens / texture-motion) + the Morphic answer-engine
> reference, merged and de-conflicted by the design judge. The **Browserbase Design DNA**
> (`docs/browserbase-design-dna.md`) is authoritative; where a lens disagreed with it, the DNA won and the
> override is logged in §9.
>
> **Hard constraint:** Tailwind v4, CSS-first. There is **no `tailwind.config`** — theming is delivered by
> redefining the shadcn CSS vars in `app/globals.css` (`@theme inline` + `:root` dark default + `.light`
> override). Every existing shadcn / ai-elements component inherits the brand for free; new DNA extras
> (`--brand*`, `--surface*`, `wc-*`, `--highlight`, `--ease`, pill/sharp radii, `.eyebrow`) are added on top.
>
> **Keep intact (do not regress):** `useChat` wiring, `[n]` inline citations, `source-url` parsing, WebPreview
> panel, `/api/status` staleness fetch, `save_plan` tool + `/plan/[slug]` permalink.

---

## 0. The one decision that shapes everything — the `--accent` collision

DNA names the brand orange `--accent`. **shadcn already owns `--accent` / `--accent-foreground` as its
neutral hover surface** — wired into `hover:bg-accent` (`PromptInputSelectTrigger`, `PromptInputTabItem`),
`group-hover:bg-accent` (`InlineCitationText`), dropdown/select items. Mapping orange onto shadcn `--accent`
would turn every neutral hover solid OrangeRed — the exact opposite of DNA's "one loud accent, used
sparingly," and most of those surfaces have no AA-safe foreground to go with it.

**Resolution (honors DNA intent, adopted from Lens 2):** keep shadcn `--accent` as the warm neutral hover it
already is; introduce the DNA orange under the name **`--brand`** (Tailwind: `bg-brand`, `text-brand-fg-strong`,
`border-brand`, `text-brand-text`). Wherever the DNA doc's snippets say `bg-accent` / `text-accent-fg-strong`
for the orange, this spec means `bg-brand` / `text-brand-fg-strong`. `--primary` is mapped to `--brand`, so
every `variant="default"` button (incl. `PromptInputSubmit`) goes on-brand with **zero component edits**.

Second structural fact: the app has **no ThemeProvider** and `:root` is currently shadcn's light oklch palette,
so it renders permanently light today. We adopt DNA's convention outright — **`:root` = dark default**
(SSR-correct with zero JS), **`.light` = opt-in override**.

---

## 1. Section list of this spec

1. The `--accent` collision decision (§0)
2. Final `app/globals.css` token block — verbatim (§2)
3. Strict file ownership map (§3)
4. FOUNDATION work order — `globals.css` + `layout.tsx` (§4)
5. CHAT-SURFACE work order — `app/(chat)/page.tsx` + `components/navigator/*` + 1-line `system-prompt.ts` (§5)
6. PLAN-PAGE work order — `app/plan/**` + the exact minimal `components/ai-elements/*` styling edits (§6)
7. Example-question card content — 12 questions × 6 categories (§7)
8. Final microcopy — every user-facing string (§8)
9. Hard-rules checklist + AA table + overrides log (§9)

---

## 2. Final `app/globals.css` — verbatim

Replace the entire current file with this. It preserves every existing shadcn `@theme inline` mapping,
remaps the shadcn vars onto DNA tokens, and adds the DNA extras.

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

/* Dark is the default now (DNA §7): :root paints dark with zero JS, .light is the opt-in override.
   We no longer use `dark:` variants anywhere — the token layer does theming. A `light:` variant is
   available for the rare component that must special-case the light theme. */
@custom-variant light (&:is(.light *));

@theme inline {
  /* ---- existing shadcn mappings (unchanged) ---- */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);                  /* NEUTRAL hover surface, not brand orange */
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);

  /* ---- DNA: brand family (disambiguated from shadcn --accent) ---- */
  --color-brand: var(--brand);
  --color-brand-hover: var(--brand-hover);
  --color-brand-pressed: var(--brand-pressed);
  --color-brand-fg: var(--brand-fg);
  --color-brand-fg-strong: var(--brand-fg-strong);
  --color-brand-text: var(--brand-text);
  --color-brand-glow: var(--brand-glow);
  --color-brand-pulse: var(--brand-pulse);
  --color-border-brand: var(--border-brand);

  /* ---- DNA: surfaces + text tiers ---- */
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-surface-accent: var(--surface-accent);
  --color-surface-sunken: var(--surface-sunken);
  --color-border-strong: var(--border-strong);
  --color-text: var(--text);
  --color-text-muted: var(--text-muted);
  --color-text-subtle: var(--text-subtle);

  /* ---- DNA: status ---- */
  --color-success: var(--success);
  --color-success-fg: var(--success-fg);
  --color-success-tint: var(--success-tint);
  --color-warning: var(--warning);
  --color-warning-fg: var(--warning-fg);
  --color-warning-tint: var(--warning-tint);
  --color-error: var(--error);
  --color-error-fg: var(--error-fg);
  --color-error-tint: var(--error-tint);
  --color-info: var(--info);
  --color-info-fg: var(--info-fg);
  --color-info-tint: var(--info-tint);

  /* ---- DNA: macOS traffic lights ---- */
  --color-wc-red: var(--wc-red);
  --color-wc-yellow: var(--wc-yellow);
  --color-wc-green: var(--wc-green);

  /* ---- DNA: motion + depth ---- */
  --ease-brand: var(--ease);
  --shadow-inset-top: inset 0 1px 0 0 var(--highlight);

  /* ---- radii (existing scale kept) + bimodal pill/sharp (DNA §4) ---- */
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
  --radius-pill: 999px;
  --radius-sharp: 0px;
}

/* Dark default — :root always matches, so SSR/no-JS renders dark correctly. */
:root {
  color-scheme: dark;

  /* raw DNA tokens (dark) */
  --bg:#0C0A09; --surface:#1C1917; --surface-2:#292524; --surface-accent:#1B1613; --surface-sunken:#0A0908;
  --border:#2E2926; --border-strong:#44403C; --border-brand:#FF4500;
  --text:#F5F3F0; --text-muted:#A8A29E; --text-subtle:#8A827B;
  --brand:#FF4500; --brand-hover:#FF6A33; --brand-pressed:#E63E00;
  --brand-fg:#FFFFFF; --brand-fg-strong:#1A0A00; --brand-text:#FF7A45;
  --brand-glow:rgba(255,69,0,0.35); --brand-pulse:rgba(255,69,0,0.10);
  --success:#71AC38; --success-fg:#8FD24E; --success-tint:rgba(113,172,56,.16);
  --warning:#F4BA41; --warning-fg:#F4BA41; --warning-tint:rgba(244,186,65,.16);
  --error:#E5484D;   --error-fg:#FF8A8A;   --error-tint:rgba(229,72,77,.16);
  --info:#4DA9E4;    --info-fg:#7BC4F0;    --info-tint:rgba(77,169,228,.16);
  --neutral:#78716C; --neutral-fg:#A8A29E; --neutral-tint:rgba(120,113,108,.16);
  --scrim:rgba(12,10,9,0.72);           /* overlay bg — never opacity-modify a hex token */
  --highlight:rgba(245,243,240,0.06);   /* inset top hairline */
  --wc-red:#FF5F57; --wc-yellow:#FEBC2E; --wc-green:#28C840;
  --ease:cubic-bezier(0.3,0,0.15,1);

  /* shadcn vars remapped onto DNA (defined once; .light only overrides the raw tokens above,
     so these resolve per-theme automatically) */
  --background: var(--bg);
  --foreground: var(--text);
  --card: var(--surface);
  --card-foreground: var(--text);
  --popover: var(--surface-2);
  --popover-foreground: var(--text);
  --primary: var(--brand);
  --primary-foreground: var(--brand-fg-strong);   /* AA: near-black on orange, NOT white */
  --secondary: var(--surface-2);
  --secondary-foreground: var(--text);
  --muted: var(--surface-2);
  --muted-foreground: var(--text-muted);
  --accent: var(--surface-2);                      /* neutral hover surface, NOT brand */
  --accent-foreground: var(--text);
  --destructive: var(--error);
  --border: var(--border);
  --input: var(--surface-2);
  --ring: var(--brand);
  --chart-1: var(--brand); --chart-2: var(--info); --chart-3: var(--success);
  --chart-4: var(--warning); --chart-5: var(--text-muted);
  --radius: 0.625rem;

  --sidebar: var(--surface);
  --sidebar-foreground: var(--text);
  --sidebar-primary: var(--brand);
  --sidebar-primary-foreground: var(--brand-fg-strong);
  --sidebar-accent: var(--surface-2);
  --sidebar-accent-foreground: var(--text);
  --sidebar-border: var(--border);
  --sidebar-ring: var(--brand);
}

.light {
  color-scheme: light;
  /* only the raw DNA tokens flip; every shadcn var above cascades through var(--bg) etc. */
  --bg:#F4F1EC; --surface:#FFFFFF; --surface-2:#FAF8F4; --surface-accent:#E2E9F3; --surface-sunken:#EFEBE3;
  --border:#E7E1D6; --border-strong:#D6CFC2; --border-brand:#FF4500;
  --text:#260F17; --text-muted:#575150; --text-subtle:#777170;
  --brand:#FF4500; --brand-hover:#E63E00; --brand-pressed:#CC3700;
  --brand-fg:#FFFFFF; --brand-fg-strong:#1A0A00; --brand-text:#C43700;
  --brand-glow:rgba(255,69,0,0.22); --brand-pulse:rgba(255,69,0,0.08);
  --success:#71AC38; --success-fg:#4E7A24; --success-tint:rgba(113,172,56,.14);
  --warning:#F4BA41; --warning-fg:#8A5A00; --warning-tint:rgba(244,186,65,.20);
  --error:#CE1F02;   --error-fg:#CE1F02;   --error-tint:rgba(206,31,2,.10);
  --info:#2D7FB8;    --info-fg:#1E6091;    --info-tint:rgba(45,127,184,.12);
  --neutral:#A5A09E; --neutral-fg:#777170; --neutral-tint:rgba(120,113,108,.10);
  --scrim:rgba(244,241,236,0.72);
  --highlight:#C5D3E8;                   /* periwinkle inset highlight */
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }

  /* Mono uppercase eyebrow — DNA §3/§8 */
  .eyebrow {
    font-family: var(--font-mono);
    font-size: 0.6875rem;      /* 11px */
    line-height: 1;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    font-weight: 500;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  /* Global reduced-motion kill switch — DNA §5. Covers Framer/Radix/Tailwind entrances + Shimmer loop. */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.001ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.001ms !important;
      scroll-behavior: auto !important;
    }
  }
}
```

Notes:
- `--chart-*` aren't referenced today (grep confirms only `globals.css` uses them); mapped to DNA equivalents
  for future charts/mermaid — harmless.
- Removing `@custom-variant dark` is intentional. Any lingering `dark:` class is dead under the new
  convention and is deleted by its owner (§6). We do not add a `.dark` scope — dark lives on `:root`.

---

## 3. Strict file ownership map

| Owner | May create / edit | Must NOT touch |
|---|---|---|
| **FOUNDATION** | `app/globals.css`, `app/layout.tsx` | anything else |
| **CHAT-SURFACE** | `app/(chat)/page.tsx`; **new** files under `components/navigator/**`; **one** appended block in `lib/system-prompt.ts` (§5.7 only) | `components/ai-elements/**`, `app/plan/**`, `app/globals.css`, `app/layout.tsx` |
| **PLAN-PAGE** | `app/plan/**` (incl. new files); the **exact** minimal styling-only edits in `components/ai-elements/*` listed in §6.2 | `app/(chat)/page.tsx`, `components/navigator/**`, `app/globals.css`, `app/layout.tsx`, `lib/system-prompt.ts` |

Rationale for the ai-elements split: the token remap makes ~90% of ai-elements correct with **no edits**.
The small residual hand-edits (traffic lights, dead-code deletion, console token fixes, code-block radius)
touch **shared** primitives used by both chat and plan, so they are owned by **one** editor — PLAN-PAGE — to
prevent two implementers colliding on the same files. CHAT-SURFACE gets everything it needs by building **new**
`components/navigator/*` components and composing them in `page.tsx`; it never edits an ai-elements file.

Build order: **FOUNDATION first** (unblocks the token layer), then CHAT-SURFACE and PLAN-PAGE in parallel.

---

## 4. FOUNDATION work order

**Files:** `app/globals.css`, `app/layout.tsx`. Nothing else.

### 4.1 `app/globals.css`
Replace the file with the verbatim block in §2. That is the entire task for this file.

### 4.2 `app/layout.tsx`
1. Keep the existing font wiring (`Geist`, `Geist_Mono`, `Inter`). `--font-sans` (Inter) and
   `--font-geist-mono` (Geist Mono) already back the `@theme` `--font-sans` / `--font-mono` mappings — leave
   them. Headlines use `font-sans` with tight negative tracking applied at the call site (§5), per DNA's
   "no-license fallback" path; do not add a new font dependency.
2. Add `suppressHydrationWarning` to `<html>` (the toggle mutates the class before React hydrates).
3. Add a **dependency-free no-flash theme script** as the first child of `<body>`. `next-themes` is **not
   installed and is intentionally not added** — this is < 10 lines and needs no provider:

```tsx
<body className="min-h-full flex flex-col">
  <script
    // Set the light class before paint so a light-preferring user doesn't flash dark.
    // Dark is the default, so the absence of the class is the correct SSR state.
    dangerouslySetInnerHTML={{
      __html:
        "try{if(localStorage.theme==='light')document.documentElement.classList.add('light')}catch(e){}",
    }}
  />
  {children}
</body>
```

That is the entire FOUNDATION contribution to the toggle. The visible toggle **button** is a
`components/navigator/*` component owned by CHAT-SURFACE (§5.2) — it flips the `.light` class and writes
`localStorage.theme`. Total toggle cost across owners is ~28 lines, under the 30-line budget. **If the budget
is contested, skip the toggle entirely:** delete this script, drop `ThemeToggle` from the header, and the app
ships dark-only (fully DNA-compliant). The plan page's print path (§6) does not depend on the toggle.

---

## 5. CHAT-SURFACE work order

**Files:** `app/(chat)/page.tsx`; new files under `components/navigator/**`; one appended block in
`lib/system-prompt.ts` (§5.7). **Do not edit any `components/ai-elements/*` file** — compose them and, where a
Morphic pattern needs new markup, build it under `components/navigator/`.

All classes below are token-only (`bg-surface`, `border-border`, `text-text-muted`, `text-brand-text`,
`bg-wc-*`, `ease-brand`, `rounded-pill`, `rounded-sharp`, `shadow-inset-top`, `.eyebrow`). No hex, no
`bg-white`, no `text-white`, no `dark:`.

### 5.0 New files to create under `components/navigator/`
```
components/navigator/theme-toggle.tsx        (§5.2)   optional, gated on the toggle decision
components/navigator/staleness-pill.tsx      (§5.2)
components/navigator/hero.tsx                 (§5.3)
components/navigator/example-questions.ts     (§5.3)  data (see §7)
components/navigator/example-card.tsx         (§5.3)
components/navigator/category-rail.tsx        (§5.3)
components/navigator/source-cards.tsx         (§5.4)  Morphic pattern #1
components/navigator/tool-rail.tsx            (§5.5)  Morphic pattern #2 — highest-impact
components/navigator/related-questions.tsx    (§5.6)  Morphic pattern #3
components/navigator/message-actions.tsx      (§5.6)  Morphic pattern #4 (copy + Save as plan)
components/navigator/browser-chrome.tsx       (§5.8)  traffic-light titlebar for the preview panel
components/navigator/icons.ts                 (small helper: category → lucide icon map)
```

### 5.1 Header (both states — hero and conversation share it)
Replace the header at `page.tsx:133-138`. Fixed `h-14`, hairline bottom border + inset-top highlight. No
traffic lights here (the chat is not a browser session — that chrome is reserved for the WebPreview panel).

```tsx
<header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 shadow-inset-top">
  <div className="flex items-center gap-2">
    <span aria-hidden className="grid size-5 place-items-center rounded-sm bg-brand font-mono text-[13px] font-semibold leading-none text-brand-fg-strong">›</span>
    <span className="text-sm font-medium tracking-[-0.01em] text-text">Browserbase Navigator</span>
  </div>
  <div className="flex items-center gap-3">
    <StalenessPill corpusDate={corpusDate} />
    <ThemeToggle /> {/* omit if toggle skipped */}
  </div>
</header>
```
The `›` mark is a text glyph, not an SVG asset — DNA "developer-direct," no emoji, no invented logo.

### 5.2 `StalenessPill` + `ThemeToggle`
`StalenessPill` — promote the plain staleness text to a mono status pill (DNA §2 live-indicator). Numeral/date
forward, `tabular-nums`, sharp radius (it reads like a CI badge). Dot is `bg-success` when a date exists,
`bg-warning` while syncing.
```tsx
// synced:  ● SYNCED · JUL 3 2026     (dot bg-success)
// syncing: ● SYNCING…                (dot bg-warning, no date)
<span className="inline-flex items-center gap-2 rounded-sharp border border-border bg-surface px-2.5 py-1 eyebrow">
  <i className={cn("size-1.5 rounded-full", corpusDate ? "bg-success" : "bg-warning")} />
  {corpusDate ? `SYNCED · ${corpusDate.toUpperCase()}` : "SYNCING…"}
</span>
```
Keep the existing `/api/status` fetch and `corpusDate` state in `page.tsx` exactly as-is; only the render
changes. (The date string from `toLocaleDateString` is passed in; uppercasing it is fine.)

`ThemeToggle` — dependency-free, ~22 lines. Pill icon button, sun/moon (lucide `Sun`/`Moon`), `mounted`
guard to avoid hydration mismatch:
```tsx
"use client";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
export function ThemeToggle() {
  const [light, setLight] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); setLight(document.documentElement.classList.contains("light")); }, []);
  if (!mounted) return <span className="size-8" aria-hidden />;
  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    try { localStorage.theme = next ? "light" : "dark"; } catch {}
  };
  return (
    <button type="button" onClick={toggle} aria-label={light ? "Switch to dark" : "Switch to light"}
      className="grid size-8 place-items-center rounded-pill border border-border text-text-muted transition-colors duration-200 ease-brand hover:border-border-strong hover:text-text hover:rounded-lg">
      {light ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </button>
  );
}
```

### 5.3 Empty / hero state — director.ai IA (Morphic-restrained)
When `messages.length === 0`, render `<Hero>` inside `ConversationContent` instead of `ConversationEmptyState`.
Widen the inner container to `max-w-4xl` **only** in the empty state (the 3-col card grid needs it);
conversation state keeps `max-w-3xl`.

Hero skeleton (DNA §4 rhythm: eyebrow → headline → grid; generous top padding):
```tsx
<div className="mx-auto flex w-full max-w-4xl flex-col items-center px-6 py-16 sm:py-24">
  <span className="eyebrow">Answers, with citations</span>
  <h1 className="mt-4 max-w-3xl text-center text-[clamp(2.25rem,5.5vw,4rem)] font-medium leading-[1.05] tracking-[-0.02em] text-text">
    Ask the ecosystem.
  </h1>
  <p className="mt-4 max-w-xl text-center text-sm leading-relaxed text-text-muted">
    Stagehand, the browse CLI, MCP server, Functions, Agents. Every answer cites its source.
  </p>
  <CategoryRail className="mt-10" value={category} onChange={setCategory} />
  <div className="mt-6 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
    {filtered.map((q) => <ExampleCard key={q.title} q={q} onPick={(prompt) => setInput(prompt)} />)}
  </div>
</div>
```
- **Headline is single-beat here, deliberately.** The DNA two-beat + orange-highlighter block is a
  once-per-surface marketing move; a RAG tool's empty state stays terse. The single orange element on this
  screen is the header mark + the active category pill. (Override of Lens 1's highlighter hero — logged §9.)
- **Category rail** (`CategoryRail`): pill-tabs, client-side filter over the static array. Active =
  `bg-brand text-brand-fg-strong`; inactive = `border border-border bg-surface text-text-muted
  hover:border-border-strong`, `rounded-pill hover:rounded-lg` radius-morph, `ease-brand`. A leading
  `All` pill shows everything.
- **`ExampleCard`**: DNA card — `rounded-lg border border-border bg-surface p-5 shadow-inset-top
  hover:border-border-strong transition-colors duration-200 ease-brand`, left-aligned. Anatomy: lucide
  **category icon** (`size-4 text-text-muted`) → title (`text-sm font-medium tracking-[-0.01em] text-text`)
  → 2-line blurb (`text-xs leading-relaxed text-text-muted line-clamp-2`). **Click prefills the input only**
  (`setInput(q.prompt)`), does not auto-submit — matches director.ai. Use lucide icons, **not** favicons:
  these are internal prompts, not external sources (favicons are reserved for real citation cards, §5.4).
  Icon map: `Choosing a tool → Wrench`, `Stagehand → Bot`, `APIs & SDKs → Plug`, `Browse CLI → Terminal`,
  `MCP Server → Cable`, `What's new → Sparkles`.

### 5.4 Source cards row — Morphic pattern #1 (`source-cards.tsx`)
Replace the current vertical `Sources`/`Source` chip list (`page.tsx:159-184`) with a **horizontal row of
compact source cards** rendered above the assistant answer. Build it new under `navigator/`; do not edit
`ai-elements/sources.tsx`. Keep the existing `sources` derivation from `source-url` parts and the
`setPreviewUrl` click behavior.

- Card: `rounded-lg border border-border bg-surface px-3 py-2 shadow-inset-top hover:border-border-strong
  transition-colors duration-200 ease-brand`, fixed-ish width (`w-44`), horizontal scroll row
  (`flex gap-2 overflow-x-auto`) that never scrolls the page body.
- Card content: **favicon** (`https://www.google.com/s2/favicons?domain=<host>&sz=32`, 16px, rounded-sm) with
  a **mono domain-letter fallback square** on `onError` (`bg-surface-2 text-text-muted eyebrow`, first letter
  of host); then `[n]` index in `text-brand-text font-mono text-[11px]`; domain in `text-xs text-text`
  (`domainOf`); truncated title in `text-[11px] text-text-muted line-clamp-1`.
- Overflow: show the first 4 cards inline; the rest collapse behind a **`+N more`** card
  (`eyebrow`, same card shell) that expands the row in place.
- Clicking a card still calls `setPreviewUrl(source.url)` → opens the WebPreview panel.
- A leading label sits above the row: `<span className="eyebrow">{n} sources</span>` (numeral-first).

### 5.5 Tool-activity step rail — Morphic pattern #2 (`tool-rail.tsx`) — highest impact
`useChat` `message.parts` carry typed tool parts. The real tools (from `app/api/chat/route.ts`) are
`search_wiki`, `grep_wiki`, `get_page`, `recent_changes`, `save_plan`, so the part `type` values are
`tool-search_wiki`, `tool-grep_wiki`, `tool-get_page`, `tool-recent_changes`, `tool-save_plan`. **Render them**
as a top-down step rail while the agent works — do not hide them.

Map part type → mono uppercase badge + input summary:

| Part type | Badge | Input summary shown | Result summary (on output) |
|---|---|---|---|
| `tool-search_wiki` | `SEARCH` | `input.query` | `{n} passages` (output length) |
| `tool-grep_wiki` | `GREP` | `input.pattern` (mono) | `{n} matches` |
| `tool-get_page` | `READ` | `domainOf(input.sourceUrl)` | `read` |
| `tool-recent_changes` | `CHANGES` | `last ${input.days ?? 30}d` | `{n} entries` |
| `tool-save_plan` | `SAVE` | `input.title` | permalink (see §5.6 Save-as-plan) |

- Each step is a **sharp-radius** row (`rounded-sharp border border-border bg-surface-2 px-3 py-2`), collapsed
  by default: `[BADGE]` (mono, `bg-surface text-text-muted eyebrow px-1.5 py-0.5 rounded-sharp`) + one-line
  summary (`font-mono text-xs text-text-muted truncate`) + a state affordance on the right:
  - `state` `input-streaming` / `input-available` (running): small `bg-brand` pulsing dot + `text-text-subtle`.
  - `state` `output-available`: the result count in `text-text` and a `Check` icon `text-success`.
  - `state` `output-error`: `text-error-fg` + the error.
- Rows resolve **top-down** with `blurScaleIn` (blur(4px)→0, scale .96→1, opacity 0→1, ~0.22s, ~40ms stagger),
  gated by `prefers-reduced-motion` (the global rule in §2 already zeroes it; use Framer `motion` which the
  project already ships).
- **Collapsible details** (`ChevronDown` toggle) reveal the top 3 result titles when output is an array.
- Place the rail **above** the Source cards and the answer, inside each assistant message block. Read
  `state`/`input`/`output` off the part; guard every field (`Array.isArray(output) ? output.length : "—"`).
  Never assume a shape — tools may return `{ error }`.

### 5.6 Streaming feel, related questions, message actions — Morphic patterns #3-4
**Thinking state** (`page.tsx:201`): while `status === "submitted"` and the newest assistant message has no
text part yet, show **`DotBounce`** (three `bg-brand` dots, staggered bounce) next to `Thinking…`, not the
Shimmer. `Shimmer` is retained only for actively-streaming skeleton text. Build `DotBounce` inside
`tool-rail.tsx` or a small `navigator/thinking.tsx`; do not edit `ai-elements/shimmer.tsx` (that dead-`repeat`
gate + optional brand-tint is PLAN-PAGE's ai-elements edit, §6.2).

**Related questions — Morphic pattern #3 (`related-questions.tsx`):** the system prompt (§5.7) makes every
substantive answer end with exactly three follow-ups as a markdown list under the exact heading
`### Keep exploring`. In the **last text part** of a completed assistant message, parse out that trailing
section: strip it from what's handed to `TextWithCitations`/`MessageResponse`, and render the three items as
clickable **arrow pills** (lucide `ArrowUpRight`, `rounded-pill border border-border bg-surface px-3 py-1.5
text-sm text-text hover:border-border-strong hover:rounded-lg ease-brand`) under an `<span className="eyebrow">
Keep exploring</span>` label. Click → `sendMessage({ text: item })`. **If parsing fails** (heading absent or
malformed), render the text unchanged — never drop content.

**Message actions — Morphic pattern #4 (`message-actions.tsx`):** on hover over a completed assistant message,
show a small action row (DNA hairline ghost buttons):
- **Copy** (`Copy` icon) → copies the answer text (excluding the parsed-out related-questions section).
- **Save as plan** (`Bookmark` icon + label) → `sendMessage({ text: "Save this as a plan" })`. This drives the
  existing `save_plan` tool. When a `tool-save_plan` part reaches `output-available` with `{ url }`, the
  tool-rail `SAVE` row (§5.5) renders the returned permalink as an `<a>` (open in new tab,
  `text-brand-text underline-offset-2 hover:underline`). Keep the model's own permalink text in the answer too;
  this is an extra affordance, not a replacement.

### 5.7 `lib/system-prompt.ts` — the ONE appended instruction (limited ownership)
Append exactly one block to the end of the `SYSTEM_PROMPT` template (do not alter existing rules):
```
End every substantive answer with exactly three short follow-up questions the user could ask next, as a markdown bullet list, under a heading on its own line that reads exactly "### Keep exploring". Each item must be a single question under ~10 words. Omit this section only for refusals or when the corpus had nothing to answer.
```
This is the sole change CHAT-SURFACE may make to `lib/system-prompt.ts`.

### 5.8 WebPreview panel — one browser-chrome titlebar (`browser-chrome.tsx`)
Today `page.tsx:224-261` renders **two** stacked bars (an ad-hoc "Source preview / Open / Close" header +
`WebPreviewNavigation`'s own bar). Consolidate into **one** DNA browser-session titlebar built under
`navigator/` and passed as the child of `WebPreviewNavigation` — CHAT-SURFACE composes it; the traffic-light
default on `WebPreviewNavigation` itself is PLAN-PAGE's ai-elements edit (§6.2), so the two don't collide
(CHAT-SURFACE supplies content, PLAN-PAGE supplies the shell styling).

Titlebar content (sharp panel, traffic lights are decorative `aria-hidden`, host pill mono, real controls are
the `Open`/`Close` buttons — not the dots):
```tsx
<div className="flex h-10 items-center gap-3 px-3">
  <span className="flex gap-1.5" aria-hidden>
    <i className="size-3 rounded-full bg-wc-red" /><i className="size-3 rounded-full bg-wc-yellow" /><i className="size-3 rounded-full bg-wc-green" />
  </span>
  <span className="truncate rounded-sm border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-text-muted">{domainOf(previewUrl)}</span>
  <span className="ml-auto flex items-center gap-3">
    <a href={previewUrl} target="_blank" rel="noreferrer" className="text-text-muted hover:text-text" aria-label="Open in new tab"><ExternalLink className="size-3.5" /></a>
    <button type="button" onClick={() => setPreviewUrl(null)} className="text-text-muted hover:text-text" aria-label="Close preview"><X className="size-3.5" /></button>
  </span>
</div>
```
- Keep `<aside className="hidden ... md:flex">`, `w-[26rem]`, `key={previewUrl}`, `WebPreviewBody src=`,
  and the blank-frame note (reworded, §8). The panel stays desktop-only; on mobile the source **cards**
  (§5.4) still open the source via `Open ↗`.
- The panel body keeps `rounded-none border-0` (docked, sharp — correct).

### 5.9 First-turn transition
When the first message is sent from the hero, let the hero unmount and the conversation layout take over. Do
not animate a hard layout jump; a quick fade/collapse (~0.18s `ease-brand`) is enough, and the global
reduced-motion rule already neutralizes it. Revert `ConversationContent` to `max-w-3xl` once
`messages.length > 0`.

---

## 6. PLAN-PAGE work order

**Files:** `app/plan/**` (edit + new), plus the **exact** ai-elements styling edits in §6.2. Nothing else.

### 6.1 `/plan/[slug]` — print-grade report
Restructure `app/plan/[slug]/page.tsx` into masthead → body → footer, keeping `getPlan`, `notFound()`, and the
`robots: noindex` metadata unchanged. `PlanMarkdown`/`MessageResponse` stays the renderer.

New pieces:
- `app/plan/[slug]/plan-header.tsx` — masthead in DNA eyebrow→headline rhythm:
```tsx
<header className="border-b border-border pb-6">
  <div className="flex items-center justify-between gap-4">
    <a href="/" className="flex items-center gap-2">
      <span aria-hidden className="grid size-5 place-items-center rounded-sm bg-brand font-mono text-[13px] font-semibold leading-none text-brand-fg-strong">›</span>
      <span className="eyebrow">Browserbase Navigator</span>
    </a>
    <span className="eyebrow">Immutable snapshot</span>
  </div>
  <h1 className="mt-6 text-3xl font-medium tracking-[-0.015em] text-text">{plan.title}</h1>
  <p className="mt-2 text-sm text-text-muted">
    Saved {formattedDate} · <a href="/" className="underline underline-offset-2">start a new chat →</a>
  </p>
</header>
```
- Page shell:
```tsx
<main className="mx-auto max-w-3xl px-6 py-12 print:max-w-none print:px-0">
  <PlanHeader plan={plan} />
  <article className="prose prose-neutral mt-10 max-w-none print:prose-sm">
    <PlanMarkdown content={plan.content} />
  </article>
  <footer className="mt-16 border-t border-border pt-6 eyebrow print:hidden">
    Generated by Browserbase Navigator
  </footer>
</main>
```
- **Theme:** the plan renders in the visitor's current app theme on screen (dark by default). **Force the
  light token block only for print** — add to the plan route (a small `<style>` in the page or a scoped rule):
  `@media print { :root { color-scheme: light; } /* apply the .light token values */ }`. Simplest concrete
  implementation: wrap the page in a container that gets `class="light"` **only** under a print media query
  via a tiny inline `<style>`: `@media print{ .plan-root{ /* light tokens */ } }`, or (cleaner) set
  `class="light"` on the `<main>` wrapper and additionally provide a `@media screen` override that re-applies
  dark — but the minimal, robust move is: **screen = app theme, print = force `.light`**. This satisfies DNA
  §9 ("force PDF/print export to the light token block") without the jarring always-light-on-screen behavior
  Lens 1 proposed (override logged §9).
- `prose prose-invert` is **not** needed: `MessageResponse` inherits `--text`/`--text-muted`/code surfaces
  through the token layer. Drop the old `dark:prose-invert` (it referenced the removed `.dark` scope).
- Replace the raw `prose-neutral` code/pre styling reliance with the DNA code-block treatment that lands via
  the shared ai-elements edit in §6.2 (sharp, hairline). No extra per-page work.

- `app/plan/[slug]/not-found.tsx` — **new** branded 404 (currently a bad slug shows Next's default):
```tsx
<main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-4 px-6 text-center">
  <span className="eyebrow text-brand-text">404</span>
  <h1 className="text-2xl font-medium tracking-[-0.01em] text-text">This plan doesn’t exist.</h1>
  <p className="text-sm text-text-muted">It was never saved, or the link is wrong.</p>
  <a href="/" className="rounded-pill bg-brand px-5 py-2.5 text-sm font-medium text-brand-fg-strong shadow-inset-top transition-[background-color,border-radius] duration-200 ease-brand hover:bg-brand-hover hover:rounded-lg">New conversation →</a>
</main>
```

### 6.2 Exact `components/ai-elements/*` styling-only edits (PLAN-PAGE owns these)
These are the **only** ai-elements edits anyone makes. They are shared-primitive touch-ups the token layer
can't do on its own. **Styling/markup only — no behavior changes.**

1. **`web-preview.tsx`**
   - `WebPreviewNavigation`: default classes → `flex h-10 items-center gap-3 border-b border-border bg-surface-2 px-3` (it becomes the browser-chrome shell; CHAT-SURFACE fills it with the titlebar via children, §5.8).
   - `WebPreview` root: `rounded-lg border bg-card` → `rounded-lg border border-border bg-surface shadow-inset-top` (add inset-top depth; note `page.tsx` still overrides to `rounded-none border-0` for the docked panel).
   - `WebPreviewConsole`: `border-t bg-muted/50` → `border-t border-border bg-surface-2` (kills the invalid `bg-muted/50` opacity-on-hex; DNA §7 hard rule). Give the collapsible `rounded-sharp`.
   - Console log-level color `text-yellow-600` → `text-warning-fg`; keep `text-destructive`→ maps to `--error`; `text-foreground` stays.
   - `WebPreviewUrl` `<Input>`: add `font-mono text-[11px] text-text-muted` for the host-pill read.
2. **`sources.tsx`** — low-touch (page.tsx now uses `navigator/source-cards.tsx`, but keep the primitive
   sane): `Sources` root `text-primary` → `text-text-muted`; `SourcesTrigger` label numeral-first (see §8).
   Do **not** restructure — it's a retained fallback.
3. **`inline-citation.tsx`**
   - `InlineCitationCardTrigger` `Badge`: `ml-1 rounded-full` → `ml-0.5 -translate-y-[3px] rounded-pill border border-border-brand/40 bg-transparent px-1.5 py-0 font-mono text-[10px] font-medium leading-4 text-brand-text transition-[background-color,border-radius] duration-200 ease-brand hover:rounded-lg hover:bg-brand-pulse`; `variant="outline"`.
   - `InlineCitationText`: `transition-colors group-hover:bg-accent` → `transition-colors duration-200 ease-brand group-hover:bg-surface-2` (neutral, `ease-brand`).
   - `InlineCitationCardBody` (`HoverCardContent`): add `rounded-sharp` (data readout = operator surface).
4. **`message.tsx`**
   - `MessageContent`: delete the inert `is-user:dark` class (no matching variant exists). User bubble:
     `group-[.is-user]:rounded-lg group-[.is-user]:bg-secondary ...` →
     `group-[.is-user]:rounded-2xl group-[.is-user]:border group-[.is-user]:border-border group-[.is-user]:bg-surface-2 group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-text group-[.is-user]:shadow-inset-top`.
   - `MessageResponse` (Streamdown code plugin): force code blocks to DNA operator texture — `rounded-sharp`
     hairline (`border border-border`), no shadow. Apply via the `className` passed to `Streamdown`
     (target `[&_pre]`): add `[&_pre]:rounded-sharp [&_pre]:border [&_pre]:border-border [&_pre]:bg-surface-2`.
5. **`shimmer.tsx`** — the global reduced-motion rule (§2) already tames the infinite loop; no code change is
   required. **Optional (ship-second):** swap the gradient base from `--color-muted-foreground` to
   `--color-brand-text` so the thinking shimmer carries the accent. Leave neutral if in doubt.
6. **`conversation.tsx`** — delete the dead `dark:bg-background dark:hover:bg-muted` clauses on
   `ConversationScrollButton` and `ConversationDownload` (the `.dark` scope no longer exists; the token layer
   already themes `--background`/`--muted`). Buttons keep `variant="outline"` which is correctly themed.

---

## 7. Example-question card content (12 cards, 6 categories)

`components/navigator/example-questions.ts`:
```ts
export type ExampleCategory =
  | "Choosing a tool" | "Stagehand" | "APIs & SDKs" | "Browse CLI" | "MCP Server" | "What's new";

export interface ExampleQuestion {
  category: ExampleCategory;
  title: string;   // card title
  blurb: string;   // 2-line description
  prompt: string;  // full text prefilled into the input on click
}
```

| Category | Card title | Blurb | Prompt (prefill) |
|---|---|---|---|
| Choosing a tool | Stagehand vs. Playwright | When the AI layer earns its keep over raw browser scripting. | When should I use Stagehand instead of raw Playwright? |
| Choosing a tool | CLI or SDK | Pick the right surface for a one-off scrape vs. a real integration. | Should I use the browse CLI or the Stagehand SDK for a one-off scraping task? |
| Stagehand | act() vs. observe() | What each method does and when to reach for which. | What's the difference between act() and observe() in Stagehand? |
| Stagehand | Caching actions | How ActCache skips a model call and when it kicks in. | How does Stagehand's ActCache work and when does it save a step? |
| Stagehand | Structured extraction | Pull typed JSON off a page instead of scraping strings. | How do I extract structured JSON from a page with Stagehand's extract()? |
| APIs & SDKs | Session lifecycle | Keep one browser session alive across multiple requests. | How do I keep a Browserbase session alive across multiple requests? |
| APIs & SDKs | Authenticating | Where the API key goes and how requests are authorized. | How do I authenticate API requests to Browserbase? |
| Browse CLI | Screenshots | Capture a page from the command line and where the file lands. | How do I take a screenshot with the browse CLI? |
| Browse CLI | Picking an agent tier | When a plain script isn't enough and Agents earn the cost. | When do I need Browserbase Agents instead of a plain Stagehand script? |
| MCP Server | Connecting Claude | Wire the Browserbase MCP server into Claude Desktop. | How do I connect the Browserbase MCP server to Claude Desktop? |
| MCP Server | Session cleanup | What happens to sessions when an MCP client disconnects. | Does the MCP server clean up Browserbase sessions when a client disconnects? |
| What's new | Recent releases | The last month across the whole ecosystem, newest first. | What shipped in the Browserbase ecosystem in the last month? |

All 12 are answerable from the real corpus (they double as RAG smoke tests). "Picking an agent tier" is filed
under Browse CLI's practical decision-making rather than a 7th category, keeping the rail to six tabs.

---

## 8. Final microcopy (every user-facing string)

| Location | Final string |
|---|---|
| Header wordmark | `Browserbase Navigator` |
| Staleness — synced | `SYNCED · JUL 3 2026` (mono, tabular-nums; dot `bg-success`) |
| Staleness — syncing | `SYNCING…` (dot `bg-warning`) |
| Hero eyebrow | `Answers, with citations` (rendered uppercase by `.eyebrow`) |
| Hero headline | `Ask the ecosystem.` |
| Hero subhead | `Stagehand, the browse CLI, MCP server, Functions, Agents. Every answer cites its source.` |
| Category rail | `All` · `Choosing a tool` · `Stagehand` · `APIs & SDKs` · `Browse CLI` · `MCP Server` · `What's new` |
| Input placeholder | `Ask about Stagehand, the browse CLI, MCP server…` |
| Thinking (dotBounce) | `Thinking…` |
| Source-row label | `{n} sources` |
| Source overflow card | `+{N} more` |
| Source favicon fallback | first letter of host, uppercase (mono square) |
| Tool badges | `SEARCH` · `GREP` · `READ` · `CHANGES` · `SAVE` |
| Tool result — search | `{n} passages` |
| Tool result — grep | `{n} matches` |
| Tool result — read | `read` |
| Tool result — changes | `{n} entries` |
| Tool details toggle | `Show details` / `Hide details` |
| Related-questions label | `Keep exploring` (eyebrow) + the model's 3 items |
| Message action — copy | tooltip `Copy answer` |
| Message action — save | `Save as plan` (sends `Save this as a plan`) |
| Preview host pill | `{domain}` (mono) |
| Preview open | aria-label `Open in new tab` (icon only) |
| Preview close | aria-label `Close preview` (icon only) |
| Preview blank-frame note | `Blank frame means the site blocks embedding. Use Open ↗.` |
| Console trigger | `CONSOLE` (eyebrow) |
| Console empty | `No output.` |
| Plan masthead eyebrow (left) | `Browserbase Navigator` |
| Plan masthead eyebrow (right) | `Immutable snapshot` |
| Plan sub-headline | `Saved {Month D, YYYY} · start a new chat →` |
| Plan footer | `Generated by Browserbase Navigator` |
| Plan 404 eyebrow | `404` (in `text-brand-text`) |
| Plan 404 headline | `This plan doesn’t exist.` |
| Plan 404 body | `It was never saved, or the link is wrong.` |
| Plan 404 CTA | `New conversation →` |
| Theme toggle | aria-label `Switch to light` / `Switch to dark` (icon only) |

Voice: declarative, terse, numeral-forward, no hype, no emoji.

---

## 9. Hard-rules checklist, AA table, and overrides log

### 9.1 Hard rules (every implementer, every file)
- [ ] **Token-only.** No hex, no `bg-white`/`text-white`/`white/[..]`, no raw Tailwind palette colors
      (`yellow-600`, `neutral-*`) in components. Use `bg-surface`, `text-text-muted`, `text-brand-text`, etc.
- [ ] **No `dark:` variants** anywhere. The `.dark` scope is gone; dark lives on `:root`. Delete any lingering
      `dark:` class (see §6.2 items 6 and the plan page).
- [ ] **No opacity modifiers on hex-valued tokens** (`bg-muted/50`, `bg-bg/70`). Use a dedicated token
      (`--scrim`, `--brand-pulse`) or a solid surface (`bg-surface-2`).
- [ ] **No emoji.** lucide line icons; orange only when active/live. Text glyph `›` for the mark.
- [ ] **Depth = hairline border + `shadow-inset-top`**, never drop shadows (except true overlays:
      dropdowns/hovercards, which shadcn already handles).
- [ ] **Radii discipline:** pill for CTAs/pills/toggles (with `hover:rounded-lg` radius-morph), `lg` for cards
      and the prompt input, `sharp` for operator surfaces (tool-rail rows, WebPreview panel + console,
      citation card body, code blocks, staleness pill).
- [ ] **One easing:** `ease-brand` on every color/transform/radius transition; `duration-200` default.
- [ ] **Reduced motion:** entrances/pulses/loops gated — the global `@media (prefers-reduced-motion)` rule in
      §2 covers Framer/Radix/Tailwind/Shimmer; don't add motion that bypasses it.
- [ ] **Eyebrows** via the `.eyebrow` utility (or `font-mono text-[11px] uppercase tracking-[0.14em]
      text-text-muted`) — never ad-hoc.
- [ ] **Traffic lights** only on the WebPreview panel (a real browser session), never on the chat or plan
      chrome; dots are `aria-hidden` decoration, not controls.
- [ ] **Ownership:** stay inside your file set (§3). CHAT-SURFACE never edits `ai-elements/*`; PLAN-PAGE makes
      only the §6.2 edits; only FOUNDATION touches `globals.css`/`layout.tsx`.
- [ ] **Functionality intact:** `useChat`, `[n]` citations + `source-url` parsing, WebPreview, `/api/status`
      staleness, `save_plan` → `/plan/[slug]`. Related-questions parsing must fall back to raw markdown on
      failure (never drop content).

### 9.2 AA color rules (WCAG AA)
| Surface | Token to use | Why |
|---|---|---|
| Any `variant="default"` button text/icon (incl. `PromptInputSubmit`) | `--primary-foreground` = `--brand-fg-strong` (`#1A0A00`) | White-on-`#FF4500` fails AA at text/icon sizes. Reserve `--brand-fg` (white) for ≥16px bold. |
| Citation marker + related-question numerals + small orange text | `text-brand-text` (`#FF7A45` dark / `#C43700` light) | `--brand` (`#FF4500`) is tuned for fills/borders/rings, not small text. |
| Console `info`/link text on cream | `--info-fg` (`#1E6091` light) | raw `--info` (`#2D7FB8`) fails AA as text on cream. |
| Warning as text | never — `--warning` is tint/dot only; text uses `--warning-fg` | `#F4BA41` fails AA as text in both themes. |
| Metadata/muted text on tinted surfaces | `--text-muted`, not `--text-subtle` | `text-subtle` only clears AA on white/`--surface`. |
| Destructive button label (`ui/button.tsx`, out of scope) | flag: needs a `--destructive-foreground` token before shipping | don't hardcode `text-white` on `--error`. |

### 9.3 Overrides I made (DNA / judgment beats a lens)
1. **`--accent` → `--brand` rename** (Lens 2 over Lens 1/3's DNA-literal `bg-accent`). shadcn owns `--accent`
   as neutral hover; mapping orange onto it violates DNA "one loud accent, sparingly." All orange lives on
   `--brand*`; `--accent` stays neutral. (§0)
2. **Hero is single-beat, no orange highlighter block** (over Lens 1's two-beat highlighter hero). The
   negate-then-reframe + `<mark>` is a once-per-surface marketing move; a RAG tool's empty state stays terse.
   The lone accent on that screen is the mark + active category pill. (§5.3)
3. **Plan page = app theme on screen, forced light only on print** (over Lens 1's always-light route). DNA §9
   scopes the forced-light to "PDF/print export," not on-screen viewing; always-light-on-screen is jarring
   against a dark-default product and inconsistent for a shared web link. (§6.1)
4. **Example cards use lucide category icons, not favicons** (Lens 1/DNA over Morphic's favicon default).
   Favicons imply external-site sources; these are internal prefills. Favicons are used **only** on real
   citation source cards (§5.4), which cleanly earns the domain-letter fallback pattern.
5. **`next-themes` intentionally not added.** The toggle is a dependency-free ~28-line vanilla implementation
   (FOUNDATION no-flash script + CHAT-SURFACE button), under the 30-line budget, with a documented one-step
   skip that ships dark-only. (§4.2)
6. **ai-elements edits are consolidated under PLAN-PAGE**, and CHAT-SURFACE reaches its Morphic patterns via
   new `components/navigator/*` files instead. This resolves the shared-primitive collision the raw ownership
   text created (both surfaces depend on the same ai-elements files). (§3)
```
