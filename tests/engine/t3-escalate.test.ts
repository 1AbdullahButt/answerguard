// T3 (SPEC §14): TCK-9002 unknown rail → ESCALATE / SCOPE_UNKNOWN; the template reply has no timeline (§6.7).
import { describe, expect, it } from "vitest";
import { runCheck } from "@/lib/check/runCheck";
import { CANONICAL_DRAFT, DECISION_TIME, firstClaim, fixtureDeps } from "../helpers/fixtures";

describe("T3: TCK-9002 unknown rail → ESCALATE", () => {
  it("ESCALATE / SCOPE_UNKNOWN with a timeline-free template reply", async () => {
    const { deps } = fixtureDeps();
    const result = await runCheck(
      { ticketId: "TCK-9002", rail: "unknown", draft: CANONICAL_DRAFT, role: "support_agent", overrides: [], decisionTime: DECISION_TIME },
      deps,
    );

    expect(result.decision).toBe("ESCALATE");
    expect(firstClaim(result).reasonCode).toBe("SCOPE_UNKNOWN");

    expect(result.suggestion).not.toBeNull();
    const suggestion = result.suggestion!;
    expect(suggestion.origin).toBe("template");
    expect(suggestion.text).not.toMatch(/\d/);
    expect(suggestion.text).not.toMatch(/\b(day|days|hour|hours|week|weeks|today|tomorrow|within)\b/i);
  });
});
