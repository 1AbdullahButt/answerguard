// Builder-owned tests for orchestration behaviour beyond the locked acceptance tests.
import { describe, expect, it } from "vitest";
import { runCheck } from "./runCheck";
import type { CheckDeps, SourceClaim } from "@/lib/engine/types";

const NOW = "2026-10-30T12:00:00Z";
const DRAFT = "Failed transfers are reversed within 4 business days.";

const draftDeps = (): Pick<CheckDeps, "extractDraft"> => ({
  extractDraft: async () => ({
    claims: [{ claimId: "d#1", topic: "reversal_window", value: { amount: 4, unit: "business_days" }, valueText: "4 business days", span: "reversed within 4 business days", definitive: true }],
    info: { mode: "saved", model: "test", latencyMs: 0, promptVersion: "test" },
  }),
});

function claim(sourceId: string, quote: string, amount: number): SourceClaim {
  return {
    claimId: `${sourceId}#1`, sourceId, sourceVersion: 1, topic: "reversal_window",
    value: { amount, unit: "business_days" }, valueText: `${amount} business days`, scope: { rail: "any" },
    effectiveFrom: null, statusWording: "unstated", supersedes: null, quote,
  };
}

describe("runCheck", () => {
  it("treats a source whose every claim fails quote validation as unread (D-012.3)", async () => {
    const deps: CheckDeps = {
      ...draftDeps(),
      extractSource: async (s) => ({
        claims: s.id === "DOC-101"
          ? [claim("DOC-101", "When an outgoing transfer fails, the amount is reversed to the customer's wallet within 4 business days.", 4)]
          : s.id === "DOC-103" ? [claim("DOC-103", "This sentence is not in DOC-103 at all.", 1)] : [],
        info: { mode: "saved", model: "test", latencyMs: 0, promptVersion: "test" },
      }),
    };
    const r = await runCheck({ ticketId: "TCK-9003", rail: "standard", draft: DRAFT, role: "support_agent", decisionTime: NOW }, deps);
    expect(r.decision).toBe("CAUTION");
    expect(r.reasonCode).toBe("SOURCE_UNREAD");
    expect(r.rejectedExtractions.map((x) => x.reason)).toEqual(expect.arrayContaining(["QUOTE_NOT_FOUND", "ALL_CLAIMS_REJECTED"]));
  });

  it("labels a provider error EXTRACTION_ERROR, not INVALID_OUTPUT", async () => {
    const deps: CheckDeps = {
      ...draftDeps(),
      extractSource: async (s) => {
        if (s.id === "DOC-103") throw Object.assign(new Error("network down"), { kind: "provider_error" });
        return { claims: [], info: { mode: "saved", model: "test", latencyMs: 0, promptVersion: "test" } };
      },
    };
    const r = await runCheck({ ticketId: "TCK-9003", rail: "standard", draft: DRAFT, role: "support_agent", decisionTime: NOW }, deps);
    expect(r.rejectedExtractions.find((x) => x.sourceId === "DOC-103")?.reason).toBe("EXTRACTION_ERROR");
  });
});
