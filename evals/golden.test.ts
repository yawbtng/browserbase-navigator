/**
 * Golden-question evals (plan acceptance criteria) against a running endpoint.
 *
 *   EVAL_BASE_URL=http://localhost:3001 pnpm vitest run evals
 *
 * Part of the deploy checklist: run after every index sync or prompt change.
 * Skipped entirely when EVAL_BASE_URL is unset so `pnpm test` stays green in CI
 * without a live endpoint.
 */
import { describe, expect, it } from "vitest";

const BASE = process.env.EVAL_BASE_URL;

interface GoldenCase {
  name: string;
  question: string;
  /** Substrings that must appear in the streamed response (URLs, verdict words). */
  expect: string[];
  /** Pattern that must NOT appear (e.g. a hallucinated out-of-corpus fact). */
  reject?: RegExp;
}

const GOLDEN: GoldenCase[] = [
  {
    name: "1. Stagehand vs Agents API for form behind login",
    question:
      "Should I use Stagehand or the Browserbase Agents API for filling a form behind login?",
    expect: ["docs.stagehand.dev", "docs.browserbase.com"],
  },
  {
    name: "2. bulk price pull → Fetch/Search verdict, not a full browser",
    question: "I need to pull prices from 500 public product pages daily",
    expect: ["fetch"],
  },
  {
    name: "3. what changed recently → cites changelog",
    question: "What changed in Browserbase in the last two weeks?",
    expect: ["changelog"],
  },
  {
    name: "4. browse.sh skill lookup (NASA picture of the day)",
    question: "Is there a browse.sh skill for NASA picture of the day?",
    expect: ["browse.sh/skills"],
  },
  {
    name: "5. does close() end a keepAlive session",
    question: "Does close() end a keepAlive session?",
    expect: ["docs.browserbase.com"],
  },
  {
    name: "6. corpus-miss honesty (out-of-corpus question)",
    question: "What is the seat pitch on a Boeing 787-9 in economy class?",
    // Refusals mention the assistant's scope; the real check is below —
    // it must NOT produce an actual seat-pitch figure.
    expect: ["browserbase"],
    reject: /\b3[0-4]\s*(inches|in\b|")/i,
  },
];

async function askNavigator(question: string): Promise<string> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          id: "eval-1",
          role: "user",
          parts: [{ type: "text", text: question }],
        },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`chat HTTP ${res.status}`);
  // The SSE stream carries text deltas and source-url parts as JSON lines —
  // raw stream text is enough for substring assertions.
  return await res.text();
}

describe.skipIf(!BASE)("golden questions", () => {
  for (const c of GOLDEN) {
    it(c.name, { timeout: 120_000 }, async () => {
      const answer = (await askNavigator(c.question)).toLowerCase();
      for (const needle of c.expect) {
        expect(answer).toContain(needle.toLowerCase());
      }
      if (c.reject) {
        expect(answer).not.toMatch(c.reject);
      }
    });
  }
});
