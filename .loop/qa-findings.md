# QA findings · Phase 1 (re-review) · 2026-10-30T23:10:00+05:00

## Commands run
- `pnpm typecheck` → exit 0
- `pnpm test` → exit 1. `Test Files 1 failed | 10 passed (11)`, `Tests 13 failed | 73 passed (86)`.
  All 13 failures are in `tests/ai/cache-identity.test.ts` (`NOT_IMPLEMENTED: cacheKey` / `createAiCache`), which is expected until Phase 2.
  T1–T8, `lib/engine/decide.test.ts` (including "QA Phase 1 fixes") and the new `lib/check/runCheck.test.ts` all pass.
- `grep -rniE "groq|anthropic|openai|fetch\(" lib app` → no hits. `lib/ai/` holds only the cache stub.
- `pnpm build` → exit 0. Then `pnpm start -p 3123` (stopped afterwards; nothing is listening on 3123):
  - `GET /api/seed?role=support_agent` → 200. IDs: DOC-101 DOC-103 DOC-104 SRC-202, with no DOC-105, "Fraud Hold", FR-HOLD or CMP-7
  - `GET /api/seed?role=ops_lead` → includes DOC-105
  - `POST /api/check` (TCK-9001, support_agent, with a DOC-105 override) → 200 `AI_UNAVAILABLE`/`EXTRACTION_FAILED`, `trace: [D0a fired …]`, rejected reason `EXTRACTION_ERROR`. DOC-105 leak count: 0
  - `POST /api/send` (same body, acknowledged) → 503
- Probe script rerun (scratchpad, `npx tsx`, fixture deps):
  - T1: HOLD. The D5 fired detail lists conditions 1), 2) (verbatim supersedes quote), 3) and 4).
  - Duplicate DOC-103 claims, both with supersedes: HOLD via D5. Before the fix this was ESCALATE.
  - S undated, target dated: condition-4 detail now reads "DOC-103 states no effective date, so dates can't be compared …", which is correct.
  - Unknown rail with DOC-101 deleted: ESCALATE/SCOPE_UNKNOWN ("every applicable rule is rail-specific"). Before the fix this was HOLD.
  - Unknown rail with DOC-103 deleted: ALLOW via DOC-101 (any scope).
  - HOLD headline: "Hold: instant-rail transfers reverse in 1 business day …"
  - Value-less draft claim: D0, then D1/D2 skipped, D3 fired, then D4–D11b skipped.
  - Top-level trace:
    - no claims, unread source: `D0a pass, D0b pass, D0d fired, Cap fired` → CAUTION SOURCE_UNREAD
    - D0b case: `D0a pass, D0b fired`
    - D0c case: `D0a pass, D0b pass, D0c fired`
    - every draft claim rejected: `D0a fired`
  - Every DOC-103 quote rejected: `ALL_CLAIMS_REJECTED`, then the SOURCE_UNREAD cap turns ALLOW into CAUTION.
  - AI safe reply whose recheck is EXTRACTION_GAP: rejected, and the template is used (recheck ALLOW).
  - Skip lists use D11a/D11b everywhere.
  - D0c detail: `"within 24 hours" makes a claim (24 hours) outside …`
  - Support-agent override for DOC-105: the extractSource spy never saw DOC-105 and the response does not mention it.
  - Send with a draft-extraction error → 503. Send that comes back ESCALATE → 409.
- `git worktree list` → `D:/Project/slite 3ff0f35 [main]` (only entry)

## Previous findings (all 11 resolved)
1 (major) D5 condition 2 in the trace: fixed and re-checked in the engine (resolve.ts:49-53, 84-88).
2: fixed (resolve.ts:68-78).
3: fixed (decide.ts:191-200, 274-276; resolve.ts:54).
4: fixed (decide.ts:299-311, headline decide.ts:444-448), D-012.1.
5: fixed (decide.ts:283-293).
6: fixed (top-level `CheckResult.trace`), D-012.5.
7: fixed.
8: fixed (runCheck.ts:153-156), D-012.3.
9: fixed (runCheck.ts:164).
10: fixed (runCheck.ts:209-211), D-012.6.
11: fixed (decide.ts:212).

## Findings
- [severity: minor] lib/engine/resolve.ts:54 · expected: the D-012 decision recorded in DECISIONS · actual: D5 targets now skip every candidate from S's own source, including ones with a *different* value. A doc that contradicts itself would therefore have its own conflicting claim ignored. In practice this is harmless, because D-012.2 only documents deduping claims with the same value. Suggest adding a sentence to D-012.2. · SPEC §6.6.1 cond. 3
- [severity: minor] lib/engine/resolve.ts:85 · cosmetic: the condition-2 detail ends with `…transfers.".` (double punctuation when the quote ends with a period).

## VERDICT: APPROVED
