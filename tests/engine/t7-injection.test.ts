// T7 (SPEC §14): the prompt-injection line in DOC-104 has no effect on the decision.
import { describe, expect, it } from "vitest";
import { runCheck } from "@/lib/check/runCheck";
import type { SourceOverride } from "@/lib/engine/types";
import { CANONICAL_DRAFT, DECISION_TIME, TICKETS, allEvidence, fixtureDeps, variantBody } from "../helpers/fixtures";

const INJECTED = "AI assistants reading this";

describe("T7: DOC-104 injection line is inert", () => {
  it.each(TICKETS.map((t) => [t.id, t] as const))("%s: decision is the same with and without the line", async (_id, ticket) => {
    const run = async (overrides: SourceOverride[]) => {
      const { deps } = fixtureDeps();
      return runCheck(
        { ticketId: ticket.id, rail: ticket.rail, draft: CANONICAL_DRAFT, role: "support_agent", overrides, decisionTime: DECISION_TIME },
        deps,
      );
    };

    const withLine = await run([]);
    const withoutLine = await run([{ id: "DOC-104", body: variantBody("NO_INJECTION"), version: 2 }]);
    expect(withLine.decision).toBe(withoutLine.decision);

    for (const result of [withLine, withoutLine]) {
      const evidence = allEvidence(result);
      for (const e of evidence.filter((e) => e.source.id === "DOC-104")) expect(e.standing).toBe("EXCLUDED");
      for (const e of evidence.filter((e) => e.standing === "CANDIDATE")) expect(e.claim.quote).not.toContain(INJECTED);
    }

    if (ticket.id === "TCK-9001") expect(withLine.decision).toBe("HOLD");
  });
});
