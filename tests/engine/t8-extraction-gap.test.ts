// T8 (SPEC §14, §6.6.2): "nothing found" and "extraction failed" are never treated as safe.
import { describe, expect, it } from "vitest";
import { runCheck } from "@/lib/check/runCheck";
import { handleSend } from "@/lib/check/handlers";
import { CANONICAL_DRAFT, DECISION_TIME, T8A_DRAFT, fixtureDeps } from "../helpers/fixtures";

describe("T8: extraction gaps and failures", () => {
  it("(a) zero draft claims but the policy-pattern detector fires → CAUTION / EXTRACTION_GAP, never ALLOW", async () => {
    const { deps } = fixtureDeps();
    const result = await runCheck(
      { ticketId: "TCK-9003", rail: "standard", draft: T8A_DRAFT, role: "support_agent", overrides: [], decisionTime: DECISION_TIME },
      deps,
    );
    expect(result.decision).toBe("CAUTION");
    expect(result.decision).not.toBe("ALLOW");
    expect(result.reasonCode).toBe("EXTRACTION_GAP");
    expect(result.patternMatches.some((m) => m.text.includes("4 business days"))).toBe(true);
  });

  it("(b) draft extraction throws → AI_UNAVAILABLE / EXTRACTION_FAILED, and send returns 503", async () => {
    const { deps } = fixtureDeps({ failDraft: true });
    const result = await runCheck(
      { ticketId: "TCK-9001", rail: "instant", draft: CANONICAL_DRAFT, role: "support_agent", overrides: [], decisionTime: DECISION_TIME },
      deps,
    );
    expect(result.decision).toBe("AI_UNAVAILABLE");
    expect(result.reasonCode).toBe("EXTRACTION_FAILED");

    const send = await handleSend(
      { ticketId: "TCK-9001", rail: "instant", draft: CANONICAL_DRAFT, role: "support_agent", overrides: [], acknowledged: true },
      deps,
    );
    expect(send.status).toBe(503);
  });

  it("(c) DOC-103 extraction throws on a standard ticket → at most CAUTION with SOURCE_UNREAD naming DOC-103", async () => {
    const { deps } = fixtureDeps({ failSources: ["DOC-103"] });
    const result = await runCheck(
      { ticketId: "TCK-9003", rail: "standard", draft: CANONICAL_DRAFT, role: "support_agent", overrides: [], decisionTime: DECISION_TIME },
      deps,
    );
    expect(result.decision).toBe("CAUTION");
    expect(result.decision).not.toBe("ALLOW");
    expect(result.caps).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SOURCE_UNREAD", sourceId: "DOC-103" })]));
  });
});
