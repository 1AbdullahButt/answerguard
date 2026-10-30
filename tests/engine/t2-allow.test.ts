// T2 (SPEC §14): TCK-9003 standard rail, draft "4 business days" → ALLOW / SUPPORTED, citing DOC-101.
import { describe, expect, it } from "vitest";
import { runCheck } from "@/lib/check/runCheck";
import { CANONICAL_DRAFT, DECISION_TIME, evidenceFrom, firstClaim, fixtureDeps } from "../helpers/fixtures";

describe("T2: TCK-9003 standard, 4 business days → ALLOW", () => {
  it("ALLOW / SUPPORTED with DOC-101 governing", async () => {
    const { deps } = fixtureDeps();
    const result = await runCheck(
      { ticketId: "TCK-9003", rail: "standard", draft: CANONICAL_DRAFT, role: "support_agent", overrides: [], decisionTime: DECISION_TIME },
      deps,
    );
    const claim = firstClaim(result);

    expect(result.decision).toBe("ALLOW");
    expect(claim.reasonCode).toBe("SUPPORTED");
    expect(claim.governing?.sourceId).toBe("DOC-101");

    const doc101 = evidenceFrom(result, "DOC-101");
    expect(doc101.length).toBeGreaterThan(0);
    expect(doc101.map((e) => e.relation)).toContain("supports");
  });
});
