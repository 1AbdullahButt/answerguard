// T5 (SPEC §14, §8, DECISIONS D-002.7): a hidden source never reaches the AI or any response.
import { describe, expect, it } from "vitest";
import { handleCheck, handleSeed } from "@/lib/check/handlers";
import type { SourceForExtraction, SourceOverride } from "@/lib/engine/types";
import { CANONICAL_DRAFT, DECISION_TIME, fixtureDeps, seedBody } from "../helpers/fixtures";

const FORBIDDEN_TOKENS = ["DOC-105", "Compliance: Fraud Hold Procedure", "FR-HOLD", "CMP-7"];
// D-002.7: "no substring of its body" = no line of the body that is ≥ 12 chars after trimming.
const DOC105_LINES = seedBody("DOC-105")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l.length >= 12);

function expectNoDoc105(serialized: string) {
  for (const token of FORBIDDEN_TOKENS) expect(serialized).not.toContain(token);
  for (const line of DOC105_LINES) expect(serialized).not.toContain(line);
}

function expectSpyNeverSawDoc105(calls: Array<[SourceForExtraction]>) {
  for (const [source] of calls) {
    expect(source.id).not.toBe("DOC-105");
    for (const line of DOC105_LINES) expect(source.body).not.toContain(line);
  }
}

function checkBody(role: string, overrides: SourceOverride[] = []) {
  return { ticketId: "TCK-9001", rail: "instant", draft: CANONICAL_DRAFT, role, overrides, decisionTime: DECISION_TIME };
}

describe("T5: support agent never sees DOC-105", () => {
  it("sanity: DOC-105 has lines to look for", () => {
    expect(DOC105_LINES.length).toBeGreaterThan(0);
  });

  it("check response and seed response contain nothing from DOC-105; the AI never receives it", async () => {
    const { deps, extractSource } = fixtureDeps();
    const res = await handleCheck(checkBody("support_agent"), deps);
    expect(res.status).toBe(200);
    expectNoDoc105(JSON.stringify(res.body));

    const seed = await handleSeed({ role: "support_agent" });
    expectNoDoc105(JSON.stringify(seed.body));

    expect(extractSource).toHaveBeenCalled();
    expectSpyNeverSawDoc105(extractSource.mock.calls);
  });

  it("a hostile override that tries to make DOC-105 visible is ignored", async () => {
    const { deps, extractSource } = fixtureDeps();
    // `visibility` is not an override field; a malicious client can still send it (SPEC §8).
    const hostile = { id: "DOC-105", visibility: "everyone", body: "x" } as unknown as SourceOverride;
    const res = await handleCheck(checkBody("support_agent", [hostile]), deps);
    expect(res.status).toBe(200);
    expectNoDoc105(JSON.stringify(res.body));
    expectSpyNeverSawDoc105(extractSource.mock.calls);
  });

  it("control: for ops_lead the AI does receive DOC-105 (so the test cannot pass trivially)", async () => {
    const { deps, extractSource } = fixtureDeps();
    const res = await handleCheck(checkBody("ops_lead"), deps);
    expect(res.status).toBe(200);
    expect(extractSource.mock.calls.some(([source]) => source.id === "DOC-105")).toBe(true);
  });
});
