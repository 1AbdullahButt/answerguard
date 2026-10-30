# AnswerGuard · Progress log

Live log of the gated build. Each phase records what was built, the real test output, QA's verdict and the gate result.
Hand-traced reasoning is never evidence.

## Agent loop
- Subagents: `.claude/agents/{designer,builder,tester,qa}.md`
- Hooks: `.claude/hooks/protect-locked.mjs` (PreToolUse), `.claude/hooks/gate-stop.mjs` (Stop), registered in `.claude/settings.json`
- Orchestrator: `.claude/commands/build.md`
- Hook self-test: `node scripts/hook-selftest.mjs` (18 lock cases + 3 stop cases, all PASS before Phase 0)

## Phase 0
**Built:** Next.js 15 / TS strict scaffold (hand-written, pnpm 9), deps (zod, lucide-react, @anthropic-ai/sdk, openai for Groq,
@upstash/*, vitest, playwright, tsx). Seed data in `data/seed/` generated from SPEC Appendix A by `scripts/extract-seed.mjs`
(byte-for-byte; QA re-verified by byte compare). `lib/engine/types.ts` (SPEC 6.2/6.3/12 + D-002.4 extensions) and typed stubs
for the test seams (D-004). Tester wrote T1–T8 + cache-identity test + 13 extraction fixtures. QA reviewed the tests against
SPEC §14 before locking (APPROVED, 5 minor findings; #3 fixed pre-lock by asserting the saved file stores its identity; #5 noted in D-005).
Then `.loop/locked` was created.

**Test run with the stubs in place** (`pnpm test`, captured before any engine code was wired in; failures are all NOT_IMPLEMENTED, no import/syntax/type errors):
```
 ❯ tests/ai/cache-identity.test.ts (13 tests | 13 failed) 18ms
 ❯ tests/engine/t2-allow.test.ts (1 test | 1 failed) 12ms
 ❯ tests/engine/t6-send-integrity.test.ts (1 test | 1 failed) 10ms
 ❯ tests/engine/t7-injection.test.ts (3 tests | 3 failed) 15ms
 ❯ tests/engine/t5-permissions.test.ts (4 tests | 3 failed) 14ms
 ❯ tests/engine/t8-extraction-gap.test.ts (3 tests | 3 failed) 15ms
 ❯ tests/engine/t4-recency.test.ts (8 tests | 8 failed) 23ms
 ❯ tests/engine/t3-escalate.test.ts (1 test | 1 failed) 13ms
 ❯ tests/engine/t1-hold.test.ts (25 tests | 1 failed) 18ms
 Test Files  9 failed (9)
      Tests  34 failed | 25 passed (59)
TEST_EXIT=1
--- every distinct failure reason (vitest groups identical errors), counted:
      4 Error: NOT_IMPLEMENTED: cacheKey
      2 Error: NOT_IMPLEMENTED: createAiCache
      4 Error: NOT_IMPLEMENTED: handleCheck
     15 Error: NOT_IMPLEMENTED: runCheck
```
The 25 passes are the fixture-sanity block (every fixture quote/span verbatim, bodies equal seed/variants) and one T5 precondition.

**Canary (real tool calls after `.loop/locked` was created):**
```
Write tests/engine/canary.test.ts
  PreToolUse:Write hook error: BLOCKED by protect-locked: "tests/engine/canary.test.ts" is locked (SPEC is the contract; see CLAUDE.md rule 1). If a locked test or doc is wrong, write .loop/BLOCKER.md with the test, line, expected vs actual and SPEC section, then stop.
Edit tests/ai/cache-identity.test.ts
  PreToolUse:Edit hook error: BLOCKED by protect-locked: "tests/ai/cache-identity.test.ts" is locked (SPEC is the contract; see CLAUDE.md rule 1). …
Bash: rm -f tests/engine/t2-allow.test.ts
  PreToolUse:Bash hook error: BLOCKED by protect-locked: "rm" on "tests/" is locked (SPEC is the contract; see CLAUDE.md rule 1). …
PowerShell: Set-Content -Path data\seed\docs\DOC-103.md -Value "tampered"
  PreToolUse:PowerShell hook error: BLOCKED by protect-locked: "set-content" on "data/seed/" is locked (SPEC is the contract; see CLAUDE.md rule 1). …
```
Hook self-test (`node scripts/hook-selftest.mjs`): 18/18 lock cases and 3/3 stop cases PASS (Windows backslash paths, redirects, copies, node fs writes, `git checkout --`, `git reset --hard`, and the worktree-add command all blocked; reads/runs allowed).

**QA verdict:** APPROVED (`.loop/qa-findings.md`, pre-lock review): typecheck exit 0; 9/9 files run, all failures NOT_IMPLEMENTED; seed byte-equal to Appendix A; all T1–T8 outcomes hand-traced by QA as following from SPEC + D-002 defaults (QA's trace is review, not evidence; evidence is the test output).

**Worktrees:**
```
D:/Project/slite 8a96403 [main]
```

GATE: PASSED

## Phase 1
**Built:** the deterministic rules engine, with no AI code. Files: `lib/engine/{normalize,patterns,standing,applicability,resolve,decide,severity}.ts` (rules S, A, D0a–D11, the SOURCE_UNREAD cap and a trace entry for every rule); `lib/workspace/{seed,merge,permissions}.ts` (persona filter before extraction, visibility never overridable); `lib/check/{runCheck,handlers,deps}.ts` (quote validation, safe replies with recheck, send integrity, zod bodies); `lib/replies/templates.ts`; thin routes `app/api/{seed,check,send}/route.ts`; builder unit tests `lib/engine/decide.test.ts` and `lib/check/runCheck.test.ts`.

**QA loop:** the first review returned CHANGES_REQUIRED (1 major: the D5 trace omitted condition 2; 10 minor). The builder fixed all 11 and recorded the spec-gap choices as D-012. The re-review came back APPROVED with 2 minors (self-contradicting source, double punctuation), both fixed afterwards and covered by a unit test.

**Typecheck and full test run** (`pnpm typecheck`, `pnpm test`). The only failures are the cache-identity test, which is Phase 2 by design:
```
TYPECHECK_EXIT=0
 ❯ tests/ai/cache-identity.test.ts (13 tests | 13 failed) 25ms
 Test Files  1 failed | 10 passed (11)
      Tests  13 failed | 74 passed (87)
TEST_EXIT=1
--- every failure reason:
      4 Error: NOT_IMPLEMENTED: cacheKey
      2 Error: NOT_IMPLEMENTED: createAiCache
```

**Acceptance tests T1–T8** (`pnpm vitest run --reporter=verbose`, passing lines):
```
 ✓ tests/engine/t3-escalate.test.ts > T3: TCK-9002 unknown rail → ESCALATE > ESCALATE / SCOPE_UNKNOWN with a timeline-free template reply
 ✓ tests/engine/t2-allow.test.ts > T2: TCK-9003 standard, 4 business days → ALLOW > ALLOW / SUPPORTED with DOC-101 governing
 ✓ tests/engine/t4-recency.test.ts > T4: recency and verification don't decide > (a) DOC-103 removed, SRC-202 present → CAUTION / CHANGE_SIGNALLED, never HOLD
 ✓ tests/engine/t4-recency.test.ts > T4: recency and verification don't decide > (b) DOC-103 as B3 (scope any, no supersession, newer, re-verified) → ESCALATE / CONFLICT_UNRESOLVED
 ✓ tests/engine/t4-recency.test.ts > T4: recency and verification don't decide > (c) DOC-103 effective in the future (B5), SRC-202 removed → CAUTION / CHANGE_SIGNALLED via NOT_YET_EFFECTIVE
 ✓ tests/engine/t4-recency.test.ts > T4: recency and verification don't decide > (d) DOC-103 saved as draft after verification → CAUTION / WEAK_BASIS with V = 1 in the trace
 ✓ tests/engine/t4-recency.test.ts > Appendix B variants > B1 (verified, 2 business days) → HOLD, suggestion says 2 business days
 ✓ tests/engine/t4-recency.test.ts > Appendix B variants > B2 (pending approval wording) → CAUTION / CHANGE_SIGNALLED
 ✓ tests/engine/t4-recency.test.ts > Appendix B variants > B6 (DOC-101 saved as draft, TCK-9003 standard) → CAUTION / WEAK_BASIS
 ✓ tests/engine/t4-recency.test.ts > Appendix B variants > B7 (B1 saved as draft) → CAUTION / WEAK_BASIS with V = 2 through D5
 ✓ tests/engine/t1-hold.test.ts > T1: TCK-9001 instant, 4 business days → HOLD > HOLD / CONTRADICTS_GOVERNING via EXPLICIT_SUPERSESSION from DOC-103
 ✓ tests/engine/t6-send-integrity.test.ts > T6: send integrity > draft A (1 business day) checks ALLOW; sending edited draft B (4 business days) is blocked 409 HOLD
 ✓ tests/engine/t7-injection.test.ts > T7: DOC-104 injection line is inert > TCK-9001: decision is the same with and without the line
 ✓ tests/engine/t7-injection.test.ts > T7: DOC-104 injection line is inert > TCK-9002: decision is the same with and without the line
 ✓ tests/engine/t7-injection.test.ts > T7: DOC-104 injection line is inert > TCK-9003: decision is the same with and without the line
 ✓ tests/engine/t5-permissions.test.ts > T5: support agent never sees DOC-105 > sanity: DOC-105 has lines to look for
 ✓ tests/engine/t5-permissions.test.ts > T5: support agent never sees DOC-105 > check response and seed response contain nothing from DOC-105; the AI never receives it
 ✓ tests/engine/t5-permissions.test.ts > T5: support agent never sees DOC-105 > a hostile override that tries to make DOC-105 visible is ignored
 ✓ tests/engine/t5-permissions.test.ts > T5: support agent never sees DOC-105 > control: for ops_lead the AI does receive DOC-105 (so the test cannot pass trivially)
 ✓ tests/engine/t8-extraction-gap.test.ts > T8: extraction gaps and failures > (a) zero draft claims but the policy-pattern detector fires → CAUTION / EXTRACTION_GAP, never ALLOW
 ✓ tests/engine/t8-extraction-gap.test.ts > T8: extraction gaps and failures > (b) draft extraction throws → AI_UNAVAILABLE / EXTRACTION_FAILED, and send returns 503
 ✓ tests/engine/t8-extraction-gap.test.ts > T8: extraction gaps and failures > (c) DOC-103 extraction throws on a standard ticket → at most CAUTION with SOURCE_UNREAD naming DOC-103
```

**QA verdict:** APPROVED (re-review, `.loop/qa-findings.md`). QA independently ran the typecheck, the tests and `pnpm build` + `pnpm start`, and curled the API. `/api/seed` for support_agent has no DOC-105 and ops_lead has it; `/api/check` returns 200 AI_UNAVAILABLE with the D0a trace; `/api/send` returns 503. A grep for AI provider code in lib/ and app/ found nothing.

**Worktrees:**
```
D:/Project/slite 3ff0f35 [main]
```

GATE: PASSED
