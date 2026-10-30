# QA findings · Phase 0 (pre-lock test review) · 2026-10-30T21:45:00Z

## Commands run
- `pnpm typecheck` → exit 0 (tsc --noEmit, tsconfig includes `**/*.ts`, so tests/ are type-checked)
- `pnpm test` → exit 1. `Test Files 9 failed (9)`, `Tests 34 failed | 25 passed (59)`
- `pnpm exec vitest run --reporter=verbose` → every failure's error, grouped:
  - `Error: NOT_IMPLEMENTED: runCheck` (15 groups), `handleCheck` (4), `cacheKey` (4), `createAiCache` (2) = 34 failed tests
  - No import, syntax, type or assertion errors. The 25 passes are the T1 fixture-sanity block (body matches seed/variant, quotes and supersedes.quote are verbatim, draft spans verbatim) plus the T5 sanity check
- Node byte-compare of SPEC Appendix A code blocks vs `data/seed/docs/*.md` → DOC-101, DOC-103, SRC-202, DOC-104, DOC-105 all BYTE-EQUAL, LF only, single trailing `\n`
- `git worktree list` → `D:/Project/slite 8a96403 [main]` (only entry)

## Review summary (hand trace, decisionTime 2026-10-30T12:00Z, D-002 defaults)
- T1 TCK-9001: C = {DOC-101 any 4bd, DOC-103 instant 1bd}. D5: DOC-103 is a candidate that applies; supersedes.quote verbatim; targetText normalizes (D-002.6) to contain "outgoing transfers reversal sop"; DOC-101 has no effectiveFrom → V = 1bd. D9 → HOLD. No weakeners, so D11a doesn't fire. ✔
- T2 TCK-9003: DOC-103 and SRC-202 (instant) don't apply; DOC-104 is excluded. D4 V = 4bd, D10 ALLOW. DOC-101 has no weakeners (updated 09-30 < verified 10-01). ✔
- T3 TCK-9002: DOC-103 is SCOPE_UNRESOLVED (1) vs DOC-101 (4) → D1 ESCALATE SCOPE_UNKNOWN. The template regex matches §6.7 plus the §6.6.2 detector words. ✔
- T4a: D4 V = 4 → ALLOW. SRC-202 is a PROPOSAL that applies (instant), and 1 ≠ 4 is an amount difference → D11b CHANGE_SIGNALLED. ✔
- T4b (B3, verified): two `any` candidates disagree, no supersedes, no specific scope → D7 CONFLICT_UNRESOLVED. ✔
- T4c (B5 2030-01-01 per D-007, SRC-202 deleted): DOC-103 is NOT_YET_EFFECTIVE, DOC-101 governs at 4 → ALLOW → D11b CHANGE_SIGNALLED. ✔
- T4d (draft save): DOC-103 gets EDITED_AFTER_VERIFICATION (10-29 > 10-26). D5 still sets V = 1 → HOLD → D11a WEAK_BASIS. ✔
- B1 (verified): updatedAt == verifiedAt, so no weakener. D5 V = 2 → HOLD, and the template reads "2 business days". B2: pending_approval → PROPOSAL → D11b. B6: DOC-101 weakened → D11a. B7: D5 V = 2 → D11a. ✔
- T5: the forbidden tokens and ≥12-char lines follow D-002.7. A spy on extractSource covers the AI path, the hostile `visibility` override is checked, and an ops_lead control stops a trivial pass. ✔
- T6: draft A 1bd → D5 V = 1bd, D10 ALLOW. SRC-202 has amount 1 (calendar), so it doesn't contradict per D-002.1 and D11b doesn't fire. Send B → HOLD 409, with the forged `result`/`checkHash` ignored. ✔
- T7: the seed DOC-104 fixture deliberately extracts the injected line as an in_force reversal_window claim (adversarial), so the "never CANDIDATE" assertion means something. Flagged outdated → EXCLUDED for all 3 tickets. ✔
- T8a: zero claims and the detector matches "4 business days" → D0b. T8b: D0a and send 503 (§6.8). T8c: without DOC-103 it would be ALLOW; the SOURCE_UNREAD cap makes it exactly CAUTION. ✔
- Fixtures vs SPEC 6.2 / brief §5: "all rails" → any; "instant-rail transfers only" → instant; B3 → any (title isn't scope); "5-7 days" → 5..7 calendar_days; SRC-202 "1 day" → calendar_days, proposed; B2 → pending_approval, effectiveFrom null. ✔
- Seed metadata matches Appendix A: kinds, verification, dates, owners and active flags, flaggedOutdated and flagNote, visibility. SPEC gives no `updatedAt` for DOC-105 or SRC-202; the seed uses 2026-10-10 (= verifiedAt, so no weakener) and 2026-10-24 (the Slack date), both harmless. ✔
- Cache identity covers task, promptVersion, schemaVersion, provider (D-001), model, inputText, sourceKind and governing {value, quote, decision}. It also checks key-order independence, the save/load round trip and refusal of a tampered file (§10). ✔

## Findings
- [severity: minor] tests/engine/t4-recency.test.ts:52-54 · expected (SPEC §14 T4d): "V = 1 shown in the trace" · actual: requires a `D5` trace entry with outcome `fired` whose `detail` contains the literal "1 business day". An engine that writes V as "V = 1 (business_days)", or puts V in a separate trace entry, would fail. Satisfiable (put the governing valueText in the D5 detail) but tighter than SPEC. Optional loosening: accept any trace entry whose detail matches `/\b1\b/` and mentions D5/V. · SPEC §14 T4(d), §7.3
- [severity: minor] tests/ai/cache-identity.test.ts:51-55 · expected (SPEC §10): sourceKind is part of the identity "for source_extraction", and V/quote/decision "for safe_reply" · actual: the variants add `sourceKind` and `governing` to a `draft_extraction` identity and expect the key to change. An implementation that hashes only the task-relevant fields would fail even though it follows SPEC. Consistent with the Phase 0 contract in lib/ai/cache.ts ("sha256 of a canonical JSON of the identity"), so hashing every present field passes. Over-inclusion is never unsafe. · SPEC §10
- [severity: minor] tests/ai/cache-identity.test.ts:84-90 · expected (SPEC §10): "Each cache file stores its full identity next to the output" · actual: the save test checks the file exists and round-trips, but not that the JSON contains `identity` equal to the input identity. Test (5) covers this only indirectly. Coverage gap, not a wrong assertion. · SPEC §10
- [severity: minor] tests/engine/t4-recency.test.ts:67 · expected (Appendix B B1): "suggestion says 2" · actual: requires "2 business days". Consistent with the HOLD template "{V}" and with T1's "1 business day", and fixtureDeps has no suggestReply, so the template is always used. Acceptable. Noted so the builder formats V as "<n> business day(s)". · SPEC App. B, §6.7
- [severity: minor] tests/helpers/fixtures.ts:157-162 (fixtureDeps) · note: extractDraft throws FIXTURE_MISSING for any draft without a fixture. Recheck of the HOLD and ESCALATE templates must therefore be deterministic, with no extractDraft call. This matches D-005 (HOLD) and PLAN Phase 1 (ESCALATE: assertion only), but D-005 does not mention the ESCALATE template. Consider adding one line to DECISIONS.md. No test change needed. · SPEC §6.7, D-005

No blocker or major findings. Every T1–T8 assertion follows from SPEC rules S, A, D0–D11 plus the D-002/D-004/D-005/D-007 defaults using the committed fixtures. None asserts headline text or other incidental wording beyond the T4d trace detail noted above. Gate items proven: 9 test files run, all 34 failures are NOT_IMPLEMENTED, typecheck clean, seed byte-exact, single worktree. (Canary and lock creation happen after this approval and are not part of this review.)

## VERDICT: APPROVED
