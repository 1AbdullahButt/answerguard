// T4 (SPEC §14) and Appendix B: recency and verification never decide; weakeners downgrade, they don't exclude.
import { describe, expect, it } from "vitest";
import { runCheck } from "@/lib/check/runCheck";
import type { Rail, SourceOverride } from "@/lib/engine/types";
import {
  CANONICAL_DRAFT,
  DECISION_TIME,
  draftSave,
  evidenceFrom,
  firstClaim,
  fixtureDeps,
  seedBody,
  variantBody,
  verifiedSave,
} from "../helpers/fixtures";

async function check(overrides: SourceOverride[], ticketId = "TCK-9001", rail: Rail = "instant") {
  const { deps } = fixtureDeps();
  return runCheck({ ticketId, rail, draft: CANONICAL_DRAFT, role: "support_agent", overrides, decisionTime: DECISION_TIME }, deps);
}

describe("T4: recency and verification don't decide", () => {
  it("(a) DOC-103 removed, SRC-202 present → CAUTION / CHANGE_SIGNALLED, never HOLD", async () => {
    const result = await check([{ id: "DOC-103", deleted: true }]);
    expect(result.decision).toBe("CAUTION");
    expect(result.decision).not.toBe("HOLD");
    expect(firstClaim(result).reasonCode).toBe("CHANGE_SIGNALLED");
  });

  it("(b) DOC-103 as B3 (scope any, no supersession, newer, re-verified) → ESCALATE / CONFLICT_UNRESOLVED", async () => {
    const result = await check([verifiedSave("DOC-103", variantBody("B3"))]);
    expect(result.decision).toBe("ESCALATE");
    expect(firstClaim(result).reasonCode).toBe("CONFLICT_UNRESOLVED");
  });

  it("(c) DOC-103 effective in the future (B5), SRC-202 removed → CAUTION / CHANGE_SIGNALLED via NOT_YET_EFFECTIVE", async () => {
    const result = await check([verifiedSave("DOC-103", variantBody("B5")), { id: "SRC-202", deleted: true }]);
    expect(result.decision).toBe("CAUTION");
    expect(firstClaim(result).reasonCode).toBe("CHANGE_SIGNALLED");
    const doc103 = evidenceFrom(result, "DOC-103");
    expect(doc103.length).toBeGreaterThan(0);
    for (const e of doc103) expect(e.standing).toBe("NOT_YET_EFFECTIVE");
  });

  it("(d) DOC-103 saved as draft after verification → CAUTION / WEAK_BASIS with V = 1 in the trace", async () => {
    const result = await check([draftSave("DOC-103", seedBody("DOC-103"))]);
    const claim = firstClaim(result);
    expect(result.decision).toBe("CAUTION");
    expect(claim.reasonCode).toBe("WEAK_BASIS");

    // §6.6.1: a weakened source can still supersede; D5 sets V, D11(a) downgrades.
    const d5 = claim.trace.filter((t) => t.rule === "D5" && t.outcome === "fired");
    expect(d5.length).toBeGreaterThan(0);
    expect(d5.some((t) => t.detail.includes("1 business day"))).toBe(true);
    expect(claim.governing?.value.amount).toBe(1);

    const doc103 = evidenceFrom(result, "DOC-103");
    expect(doc103.length).toBeGreaterThan(0);
    expect(doc103.some((e) => e.weakeners.includes("EDITED_AFTER_VERIFICATION"))).toBe(true);
  });
});

describe("Appendix B variants", () => {
  it("B1 (verified, 2 business days) → HOLD, suggestion says 2 business days", async () => {
    const result = await check([verifiedSave("DOC-103", variantBody("B1"))]);
    expect(result.decision).toBe("HOLD");
    expect(result.suggestion?.text).toContain("2 business days");
  });

  it("B2 (pending approval wording) → CAUTION / CHANGE_SIGNALLED", async () => {
    const result = await check([verifiedSave("DOC-103", variantBody("B2"))]);
    expect(result.decision).toBe("CAUTION");
    expect(firstClaim(result).reasonCode).toBe("CHANGE_SIGNALLED");
  });

  it("B6 (DOC-101 saved as draft, TCK-9003 standard) → CAUTION / WEAK_BASIS", async () => {
    const result = await check([draftSave("DOC-101", seedBody("DOC-101"))], "TCK-9003", "standard");
    expect(result.decision).toBe("CAUTION");
    expect(firstClaim(result).reasonCode).toBe("WEAK_BASIS");
  });

  it("B7 (B1 saved as draft) → CAUTION / WEAK_BASIS with V = 2 through D5", async () => {
    const result = await check([draftSave("DOC-103", variantBody("B1"))]);
    expect(result.decision).toBe("CAUTION");
    expect(firstClaim(result).reasonCode).toBe("WEAK_BASIS");
    expect(firstClaim(result).governing?.value.amount).toBe(2);
  });
});
