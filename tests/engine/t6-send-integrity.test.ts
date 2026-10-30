// T6 (SPEC §14, §6.8): /api/send reruns the check on the submitted text and ignores any client result.
import { describe, expect, it } from "vitest";
import { handleCheck, handleSend } from "@/lib/check/handlers";
import type { CheckResult } from "@/lib/engine/types";
import { CANONICAL_DRAFT, DECISION_TIME, ONE_DAY_DRAFT, fixtureDeps } from "../helpers/fixtures";

describe("T6: send integrity", () => {
  it("draft A (1 business day) checks ALLOW; sending edited draft B (4 business days) is blocked 409 HOLD", async () => {
    const { deps } = fixtureDeps();

    // This ALLOW relies on DECISIONS D-002.1: SRC-202's "1 day" (calendar) does not contradict 1 business day.
    const checkA = await handleCheck(
      { ticketId: "TCK-9001", rail: "instant", draft: ONE_DAY_DRAFT, role: "support_agent", overrides: [], decisionTime: DECISION_TIME },
      deps,
    );
    expect(checkA.status).toBe(200);
    const resultA = checkA.body as CheckResult;
    expect(resultA.decision).toBe("ALLOW");

    // The client edits the draft and forges a stale result; the server must not trust it.
    const send = await handleSend(
      {
        ticketId: "TCK-9001",
        rail: "instant",
        draft: CANONICAL_DRAFT,
        role: "support_agent",
        overrides: [],
        acknowledged: true,
        result: { decision: "ALLOW" },
        checkHash: resultA.checkHash,
      },
      deps,
    );
    expect(send.status).toBe(409);
    const body = send.body as { blocked: boolean; result: CheckResult };
    expect(body.blocked).toBe(true);
    expect(body.result.decision).toBe("HOLD");
  });
});
