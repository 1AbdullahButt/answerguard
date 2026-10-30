// T1 (SPEC §14): TCK-9001 instant rail, draft "4 business days" → HOLD via explicit supersession (D5).
import { describe, expect, it } from "vitest";
import { runCheck } from "@/lib/check/runCheck";
import {
  CANONICAL_DRAFT,
  DECISION_TIME,
  evidenceFrom,
  expectedFixtureBody,
  firstClaim,
  fixtureDeps,
  loadDraftFixtures,
  loadSourceFixtures,
  seedBody,
} from "../helpers/fixtures";

// Guards the fixtures themselves: every quote must be verbatim (SPEC §6.2), every body must match the seed
// or its Appendix B variant. This block passes before the engine exists.
describe("fixture sanity", () => {
  const sources = loadSourceFixtures();
  const drafts = loadDraftFixtures();

  it("has the expected fixture files", () => {
    expect(sources.map((f) => `${f.sourceId}:${f.variant}`).sort()).toEqual(
      [
        "DOC-101:seed",
        "DOC-103:B1",
        "DOC-103:B2",
        "DOC-103:B3",
        "DOC-103:B5",
        "DOC-103:seed",
        "DOC-104:NO_INJECTION",
        "DOC-104:seed",
        "DOC-105:seed",
        "SRC-202:seed",
      ].sort(),
    );
    expect(drafts).toHaveLength(3);
  });

  it.each(sources.map((f) => [f.file, f] as const))("%s: body matches seed/variant", (_file, f) => {
    expect(f.body).toBe(expectedFixtureBody(f));
  });

  it.each(sources.map((f) => [f.file, f] as const))("%s: quotes are verbatim substrings of the body", (_file, f) => {
    expect(f.claims.length).toBeGreaterThan(0);
    for (const c of f.claims) {
      expect(c.sourceId).toBe(f.sourceId);
      expect(f.body).toContain(c.quote);
      if (c.supersedes) expect(f.body).toContain(c.supersedes.quote);
    }
  });

  it.each(drafts.map((f) => [f.file, f] as const))("%s: spans are verbatim substrings of the draft", (_file, f) => {
    for (const c of f.claims) expect(f.draft).toContain(c.span);
  });
});

describe("T1: TCK-9001 instant, 4 business days → HOLD", () => {
  it("HOLD / CONTRADICTS_GOVERNING via EXPLICIT_SUPERSESSION from DOC-103", async () => {
    const { deps } = fixtureDeps();
    const result = await runCheck(
      { ticketId: "TCK-9001", rail: "instant", draft: CANONICAL_DRAFT, role: "support_agent", overrides: [], decisionTime: DECISION_TIME },
      deps,
    );
    const claim = firstClaim(result);

    expect(result.decision).toBe("HOLD");
    expect(claim.reasonCode).toBe("CONTRADICTS_GOVERNING");
    // §6.6.1: canonical TCK-9001 resolves through D5.
    expect(claim.trace).toEqual(expect.arrayContaining([expect.objectContaining({ rule: "D5", outcome: "fired" })]));
    expect(claim.governing?.via).toBe("EXPLICIT_SUPERSESSION");
    expect(claim.governing?.sourceId).toBe("DOC-103");

    // §6.7: the safe reply uses V and must recheck as ALLOW or CAUTION.
    expect(result.suggestion).not.toBeNull();
    expect(result.suggestion?.text).toContain("1 business day");
    expect(["ALLOW", "CAUTION"]).toContain(result.suggestion?.recheckDecision);

    // The cited quote is an exact substring of DOC-103.
    const doc103 = seedBody("DOC-103");
    const doc103Evidence = evidenceFrom(result, "DOC-103");
    expect(doc103Evidence.length).toBeGreaterThan(0);
    for (const e of doc103Evidence) expect(doc103).toContain(e.claim.quote);
    expect(doc103).toContain(claim.governing?.quote ?? "<missing governing quote>");

    // §4: SRC-202 is a proposal, DOC-104 is excluded.
    const src202 = evidenceFrom(result, "SRC-202");
    expect(src202.length).toBeGreaterThan(0);
    for (const e of src202) expect(e.standing).toBe("PROPOSAL");
    for (const e of evidenceFrom(result, "DOC-104")) expect(e.standing).toBe("EXCLUDED");
  });
});
