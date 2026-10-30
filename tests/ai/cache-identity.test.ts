// Cache identity (SPEC §10, DECISIONS D-001 adds provider, D-002.8 locks this test in Phase 0).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cacheKey, createAiCache, type CacheFile, type CacheIdentity } from "@/lib/ai/cache";

const draftIdentity: CacheIdentity = {
  task: "draft_extraction",
  promptVersion: "p1",
  schemaVersion: "s1",
  provider: "groq",
  model: "m",
  inputText: "Failed transfers are reversed within 4 business days.",
};

const tmpDirs: string[] = [];
function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ag-cache-"));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("cacheKey", () => {
  it("(1) is 64 lowercase hex chars and independent of key order", () => {
    const key = cacheKey(draftIdentity);
    expect(key).toMatch(/^[0-9a-f]{64}$/);

    const reordered: CacheIdentity = {
      inputText: draftIdentity.inputText,
      model: draftIdentity.model,
      provider: draftIdentity.provider,
      schemaVersion: draftIdentity.schemaVersion,
      promptVersion: draftIdentity.promptVersion,
      task: draftIdentity.task,
    };
    expect(cacheKey(reordered)).toBe(key);
  });

  const variants: Array<[string, CacheIdentity]> = [
    ["task", { ...draftIdentity, task: "source_extraction" }],
    ["promptVersion", { ...draftIdentity, promptVersion: "p2" }],
    ["schemaVersion", { ...draftIdentity, schemaVersion: "s2" }],
    ["provider", { ...draftIdentity, provider: "anthropic" }],
    ["model", { ...draftIdentity, model: "m2" }],
    ["inputText", { ...draftIdentity, inputText: "Failed transfers are reversed within 1 business day." }],
    ["sourceKind", { ...draftIdentity, sourceKind: "sop" }],
    [
      "governing",
      { ...draftIdentity, governing: { value: { amount: 1, unit: "business_days" }, quote: "q", decision: "HOLD" } },
    ],
  ];

  it.each(variants)("(2) changes when %s changes", (_field, changed) => {
    expect(cacheKey(changed)).not.toBe(cacheKey(draftIdentity));
  });

  it("(2) changes when the governing value, quote or decision changes", () => {
    const gov: CacheIdentity = {
      ...draftIdentity,
      task: "safe_reply",
      governing: { value: { amount: 1, unit: "business_days" }, quote: "q", decision: "HOLD" },
    };
    const base = cacheKey(gov);
    expect(cacheKey({ ...gov, governing: { ...gov.governing!, value: { amount: 2, unit: "business_days" } } })).not.toBe(base);
    expect(cacheKey({ ...gov, governing: { ...gov.governing!, quote: "q2" } })).not.toBe(base);
    expect(cacheKey({ ...gov, governing: { ...gov.governing!, decision: "ESCALATE" } })).not.toBe(base);
  });
});

describe("createAiCache", () => {
  it("(3) a different task or source kind never hits the draft entry", () => {
    const cache = createAiCache({ dir: tmpDir() });
    const X = { claims: [{ claimId: "draft#1" }] };
    cache.set(draftIdentity, X);
    expect(cache.get({ ...draftIdentity, task: "source_extraction", sourceKind: "sop" })).toBeUndefined();
    expect(cache.get(draftIdentity)).toEqual(X);
  });

  it("(4) save() writes <dir>/<key>.json and a fresh cache reads it back", () => {
    const dir = tmpDir();
    const X = { claims: [], note: "saved" };
    createAiCache({ dir }).save(draftIdentity, X);
    const file = path.join(dir, `${cacheKey(draftIdentity)}.json`);
    expect(fs.existsSync(file)).toBe(true);
    // SPEC §10: each cache file stores its full identity next to the output.
    const stored = JSON.parse(fs.readFileSync(file, "utf8")) as CacheFile;
    expect(stored.key).toBe(cacheKey(draftIdentity));
    expect(stored.identity).toEqual(draftIdentity);
    expect(stored.output).toEqual(X);
    expect(createAiCache({ dir }).get(draftIdentity)).toEqual(X);
  });

  it("(5) refuses a file whose stored identity does not match its key", () => {
    const dir = tmpDir();
    const A = draftIdentity;
    const B: CacheIdentity = { ...draftIdentity, inputText: "Failed transfers are reversed within 1 business day." };
    const tampered: CacheFile = { key: cacheKey(A), identity: B, output: { claims: ["evil"] }, recordedAt: "2026-10-29T09:00:00Z" };
    fs.writeFileSync(path.join(dir, `${cacheKey(A)}.json`), JSON.stringify(tampered), "utf8");
    expect(createAiCache({ dir }).get(A)).toBeUndefined();
  });
});
