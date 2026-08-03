import { describe, expect, it } from "vitest";
import { resolveShowcaseRef, suggestShowcaseRefs } from "../lib/showcase";

/**
 * Ref resolution against the live catalog. The failure mode these lock in:
 * the model invents a plausible path where every segment is wrong except the
 * last one, which is the template's real name (seen in prod 2026-08-02).
 */
describe("resolveShowcaseRef", () => {
  it("resolves an invented GitHub path by its identifying tail segment", async () => {
    const resolved = await resolveShowcaseRef(
      "https://github.com/browserbase/examples/tree/main/stagehand/amazon-product-scraping",
    );
    expect(resolved).not.toBeNull();
    expect(resolved!.sourceUrl).toMatch(/amazon-product-scraping/);
  }, 30_000);

  it("resolves a bare template name", async () => {
    const resolved = await resolveShowcaseRef("amazon-product-scraping");
    expect(resolved?.sourceUrl).toMatch(/amazon-product-scraping/);
  }, 30_000);

  it("still refuses a ref with no catalog entry", async () => {
    expect(
      await resolveShowcaseRef(
        "https://github.com/browserbase/nope/tree/main/zzz-not-a-real-entry",
      ),
    ).toBeNull();
  }, 30_000);

  it("suggests candidates for a near-miss ref", async () => {
    const suggestions = await suggestShowcaseRefs(
      "https://github.com/browserbase/examples/tree/main/form-filling",
    );
    expect(suggestions.length).toBeGreaterThan(0);
  }, 30_000);
});
