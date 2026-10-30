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

## Phase 2
**Built:** the live AI layer, with two providers behind one adapter (D-001, D-017). Files: `lib/ai/client.ts` (Groq `openai/gpt-oss-120b` with strict JSON schema; Gemini `gemini-3.5-flash-lite` with native JSON schema; Anthropic off by default; 429/quota detection; throttling for scripts), `lib/ai/aiDeps.ts` (memory → saved → live primary → fallback once → paused/unavailable; zod; retry once), `lib/ai/{schemas,prompts,cache}.ts` (PROMPT_VERSION 2026-10-30.2, `<document>` envelope, full cache identity incl. provider + model), `lib/rateLimit.ts` (Upstash per-IP + global daily, in-memory fallback), `lib/workspace/variants.ts`, `scripts/{eval,record-ai-cache,probe-extract,groq-models}.ts`, `evals/{golden.json,results.md}`, `data/ai-cache/` (17 saved responses), `.github/workflows/ci.yml`.

**Amendments during the phase:** D-017 (Groq + Gemini, fallback on 429/quota, eval on both). The v2 prompt fix (proposals are claims; quotes exclude markdown labels) fixed Gemini's missed SRC-202 claim and its rejected DOC-104 quotes, without touching rules or tests.

**QA loop:** the first review returned CHANGES_REQUIRED (2 major: saved lookups tied to the configured provider; template-reply extractions not recorded; plus 9 minor). All were fixed (D-018). The re-review came back APPROVED; 2 of its 4 remaining minors were fixed afterwards (fixed tie-break order, escaped governing quote).

**Live eval** (`pnpm eval`, both providers, 3 runs each, throttled), from `evals/results.md`:
```
**Selection:** `AI_PROVIDER=groq`, `AI_FALLBACK_PROVIDER=gemini`. Both passed the gate and tied on every metric (0 quote rejections each, equal field accuracy); the incumbent primary (groq) is kept.
  [groq] `openai/gpt-oss-120b`
- Runs per case: 3 · date: 2026-10-30T17:22:19.643Z · throttled to stay under the free tier
- Decision accuracy: **100.0%** (36/36)
- Quote validity: **100.0%** (39/39 extracted quotes/spans verbatim; 0 rejected)
- Extraction field accuracy (vs hand-written fixtures): **100.0%** (180/180)
- Gate (canonical tickets + B1, B2, B3, B7 correct on every run): **PASS**
  [gemini] `gemini-3.5-flash-lite`
- Runs per case: 3 · date: 2026-10-30T17:25:27.542Z · throttled to stay under the free tier
- Decision accuracy: **100.0%** (36/36)
- Quote validity: **100.0%** (38/38 extracted quotes/spans verbatim; 0 rejected)
- Extraction field accuracy (vs hand-written fixtures): **100.0%** (180/180)
- Gate (canonical tickets + B1, B2, B3, B7 correct on every run): **PASS**
```

**Recording** (`pnpm record`, Groq, throttled):
```
✓ support_agent canon-9001  HOLD/CONTRADICTS_GOVERNING · safe reply (ai) rechecks ALLOW/SUPPORTED
✓ support_agent canon-9002  ESCALATE/SCOPE_UNKNOWN · safe reply (template) rechecks ALLOW/NO_POLICY_CLAIM
✓ support_agent canon-9003  ALLOW/SUPPORTED
✓ support_agent B1          HOLD/CONTRADICTS_GOVERNING · safe reply (ai) rechecks CAUTION/CHANGE_SIGNALLED
✓ support_agent B2          CAUTION/CHANGE_SIGNALLED
✓ support_agent B3          ESCALATE/CONFLICT_UNRESOLVED · safe reply (template) rechecks ALLOW/NO_POLICY_CLAIM
✓ support_agent B4          CAUTION/CHANGE_SIGNALLED
✓ support_agent B5          CAUTION/CHANGE_SIGNALLED
✓ support_agent B6          CAUTION/WEAK_BASIS
✓ support_agent B7          CAUTION/WEAK_BASIS
✓ support_agent allow-1day  ALLOW/SUPPORTED
✓ support_agent no-claim    ALLOW/NO_POLICY_CLAIM
✓ ops_lead      canon-9001  HOLD/CONTRADICTS_GOVERNING · safe reply (ai) rechecks ALLOW/SUPPORTED
✓ ops_lead      canon-9002  ESCALATE/SCOPE_UNKNOWN · safe reply (template) rechecks ALLOW/NO_POLICY_CLAIM
✓ ops_lead      canon-9003  ALLOW/SUPPORTED
✓ ops_lead      B1          HOLD/CONTRADICTS_GOVERNING · safe reply (ai) rechecks CAUTION/CHANGE_SIGNALLED
✓ ops_lead      B2          CAUTION/CHANGE_SIGNALLED
✓ ops_lead      B3          ESCALATE/CONFLICT_UNRESOLVED · safe reply (template) rechecks ALLOW/NO_POLICY_CLAIM
✓ ops_lead      B4          CAUTION/CHANGE_SIGNALLED
✓ ops_lead      B5          CAUTION/CHANGE_SIGNALLED
✓ ops_lead      B6          CAUTION/WEAK_BASIS
✓ ops_lead      B7          CAUTION/WEAK_BASIS
✓ ops_lead      allow-1day  ALLOW/SUPPORTED
✓ ops_lead      no-claim    ALLOW/NO_POLICY_CLAIM
Recorded 17 saved responses in data/ai-cache (groq / openai/gpt-oss-120b). Mismatches: 0
RECORD_EXIT=0
```

**Saved-mode replay with no keys** (`GROQ_API_KEY= GEMINI_API_KEY= AI_PROVIDER= AI_FALLBACK_PROVIDER= pnpm eval --saved`):
```
  ✓ canon-9001: HOLD/CONTRADICTS_GOVERNING
  ✓ canon-9002: ESCALATE/SCOPE_UNKNOWN
  ✓ canon-9003: ALLOW/SUPPORTED
  ✓ B1: HOLD/CONTRADICTS_GOVERNING
  ✓ B2: CAUTION/CHANGE_SIGNALLED
  ✓ B3: ESCALATE/CONFLICT_UNRESOLVED
  ✓ B4: CAUTION/CHANGE_SIGNALLED
  ✓ B5: CAUTION/CHANGE_SIGNALLED
  ✓ B6: CAUTION/WEAK_BASIS
  ✓ B7: CAUTION/WEAK_BASIS
  ✓ allow-1day: ALLOW/SUPPORTED
  ✓ no-claim: ALLOW/NO_POLICY_CLAIM
- Decision accuracy: **100.0%** (12/12)
- Quote validity: **100.0%** (13/13 extracted quotes/spans verbatim; 0 rejected)
- Extraction field accuracy (vs hand-written fixtures): **100.0%** (60/60)
- Gate (canonical tickets + B1, B2, B3, B7 correct on every run): **PASS**
| canon-9001 | gate | HOLD / CONTRADICTS_GOVERNING | ✓ | 1/1 |
| canon-9002 | gate | ESCALATE / SCOPE_UNKNOWN | ✓ | 1/1 |
| canon-9003 | gate | ALLOW / SUPPORTED | ✓ | 1/1 |
| B1 | gate | HOLD / CONTRADICTS_GOVERNING | ✓ | 1/1 |
| B2 | gate | CAUTION / CHANGE_SIGNALLED | ✓ | 1/1 |
| B3 | gate | ESCALATE / CONFLICT_UNRESOLVED | ✓ | 1/1 |
| B4 |  | CAUTION / CHANGE_SIGNALLED | ✓ | 1/1 |
| B5 |  | CAUTION / CHANGE_SIGNALLED | ✓ | 1/1 |
| B6 |  | CAUTION / WEAK_BASIS | ✓ | 1/1 |
| B7 | gate | CAUTION / WEAK_BASIS | ✓ | 1/1 |
| allow-1day |  | ALLOW / SUPPORTED | ✓ | 1/1 |
| no-claim |  | ALLOW / NO_POLICY_CLAIM | ✓ | 1/1 |
SAVED_EVAL_EXIT=0
```

**Typecheck and full test run:**
```
TYPECHECK_EXIT=0
 Test Files  12 passed (12)
      Tests  105 passed (105)
TEST_EXIT=0
```

**QA verdict:** APPROVED (re-review, `.loop/qa-findings.md`). QA ran the typecheck, the tests and the build, plus `pnpm eval --saved` with keys unset and again with AI_PROVIDER=gemini (still replays 12/12), `pnpm eval --combine`, an identity check on all 17 cache files, a secret grep, and offline probes (DOC-105 never reaches a provider; paused on 429; limiter charged once per check, never on cache hits).

**Worktrees:**
```
D:/Project/slite 6a14f10 [main]
```

GATE: PASSED

## Phase 3
**Built:** the UI, from the approved mockups plus the D-021 changes. Design: `design/DESIGN.md`, three mockups, and `design/UI-CONTRACT.md` (the accessible names shared with the e2e test). Code:
- `app/` and `styles/tokens.css`
- `components/shell|inbox|panel|ui`: inbox, side panel, Check / Reasoning / Sources / Impact tabs, states, responsive slide-over and bottom sheet
- `lib/client/`: workspace overrides and metrics in localStorage, with try/catch and a memory fallback
- `e2e/demo.spec.ts` + `playwright.config.ts` (locked), `scripts/ui-audit.ts`, and an e2e step in CI

**Process notes:**
- Your approval came with 4 changes (D-021) and the narrow stop-hook waiting marker (D-020, plus the helper fix D-020a).
- While adding the e2e to the lock, a shell-escaping slip briefly put `/(^|D)1(D|$)/` in the Impact assertion. I removed `e2e/` from `.loop/locked`, fixed the regex to `/(^|\D)1(\D|$)/` (verified against "1", "10" and "11"), and re-locked it before any UI work used it.

**QA loop:** the first review returned CHANGES_REQUIRED (1 major: the footer disclaimer was truncated at 390 px; 5 minor). I fixed all six. The re-review came back APPROVED with 2 minors: duplicated banner copy (fixed) and the phone bottom sheet covering the composer (as designed; noted for the Phase 4 phone smoke test).

**UI audit** (`pnpm exec tsx scripts/ui-audit.ts --serve`, saved mode, 6 states × 3 widths):
```
empty       1440px  axe: none
check-hold  1440px  axe: none
reasoning   1440px  axe: none
sources     1440px  axe: none
impact      1440px  axe: none
escalate    1440px  axe: none
empty       1024px  axe: none
check-hold  1024px  axe: none
reasoning   1024px  axe: none
sources     1024px  axe: none
impact      1024px  axe: none
escalate    1024px  axe: none
empty        390px  axe: none
check-hold   390px  axe: none
reasoning    390px  axe: none
sources      390px  axe: none
impact       390px  axe: none
escalate     390px  axe: none
Serious/critical axe violations: 0. Horizontal page scroll: none.
EXIT=0
```

**Final run on the committed code** (`pnpm typecheck && pnpm test && pnpm exec playwright test`, cold build, saved mode):
```
 Test Files  12 passed (12)
      Tests  105 passed (105)
  ok 1 [chromium] › e2e\demo.spec.ts:8:5 › wrong draft → HOLD → blocked send → use safe reply → sent → Impact shows 1 intercept (1.7s)
  1 passed (1.6m)
FINAL_EXIT=0
```

**QA verdict:** APPROVED (re-review, `.loop/qa-findings.md`). QA ran the e2e and the audit itself and looked at every screenshot. It also drove the flows in a browser:
- B1, B7, B2, B3 and B4 Sources edits give the expected outcomes.
- Send returns 409, ack-required or 503 as specified.
- The metrics show the n<3 guard.
- DOC-105 never appears in the Support agent's DOM.
- No reason codes appear on the Check tab, and there is no overflow at 400 px.
- localStorage failures are handled.

**Worktrees:**
```
D:/Project/slite 20d9dfd [main]
```

GATE: PASSED

## Phase 4
**Pre-deploy work (QA APPROVED; the Phase 4 gate is the SPEC §18 check against the deployed URL, still to come):**
- Guided tour (5 steps, following SPEC §16; skippable; keyboard accessible; bottom card on phones), `components/tour/`, D-023.
- README: problem, mermaid architecture, AI vs rules, tests, eval numbers, limitations, what not to claim, and `docs/demo.gif` (19 s, recorded by `scripts/record-demo.ts`).
- CI runs the e2e test (`.github/workflows/ci.yml`). The secret scan now covers Gemini keys.
- QA loop: the first review returned CHANGES_REQUIRED (2 major: stale-pill contrast; scan missed Gemini keys). Both were fixed (D-024). The re-review came back APPROVED; its minor (Esc closing the tour from other dialogs) was fixed afterwards and verified in a browser.

**Evidence (final pre-deploy run):**
```
PASS  Esc in Reset dialog: dialog closed
PASS  Esc in Reset dialog: tour still open
PASS  Esc on persona tooltip: tour still open
PASS  Esc in the tour itself: tour closed
 Test Files  12 passed (12)
      Tests  105 passed (105)
  ok 1 [chromium] › e2e\demo.spec.ts:8:5 › wrong draft → HOLD → blocked send → use safe reply → sent → Impact shows 1 intercept (2.4s)
  1 passed (51.6s)
ESC_EXIT=0
stale       1440px  axe: none
stale       1024px  axe: none
stale        390px  axe: none
Serious/critical axe violations: 0. Horizontal page scroll: none.
```

Status: waiting for deploy setup (`.loop/await-human.md`).

**Deploy (D-025):**
- Vercel project `answerguard` under the account's default team, deployed with the CLI.
- Live at **https://answerguard.vercel.app**.
- 7 Production env vars added through stdin; no values printed.
- Upstash skipped, since it needs a browser terms click; no money is at risk, only quota.

**Live smoke test** (curl against https://answerguard.vercel.app):
```
GET / → 200 (1.41s)
seed support_agent: DOC-101,DOC-103,SRC-202,DOC-104 | DOC-105 mentions: 0
seed ops_lead: DOC-101,DOC-103,SRC-202,DOC-104,DOC-105
check TCK-9001: HOLD CONTRADICTS_GOVERNING | ai: saved, groq openai/gpt-oss-120b | suggestion: ai | HTTP 200 1.26s
live check (novel draft): ALLOW SUPPORTED | ai: live, groq, latencyMs 1607 | claims: 4 business days (hedged) | HTTP 200 2.24s
send HOLD draft with forged ALLOW result → HTTP 409
```

**Live UI audit, desktop and phone** (`pnpm exec tsx scripts/ui-audit.ts https://answerguard.vercel.app`):
```
empty       1440px  axe: none
check-hold  1440px  axe: none
reasoning   1440px  axe: none
sources     1440px  axe: none
impact      1440px  axe: none
stale       1440px  axe: none
escalate    1440px  axe: none
empty       1024px  axe: none
check-hold  1024px  axe: none
reasoning   1024px  axe: none
sources     1024px  axe: none
impact      1024px  axe: none
stale       1024px  axe: none
escalate    1024px  axe: none
empty        390px  axe: none
check-hold   390px  axe: none
reasoning    390px  axe: none
sources      390px  axe: none
impact       390px  axe: none
stale        390px  axe: none
escalate     390px  axe: none
Serious/critical axe violations: 0. Horizontal page scroll: none.
LIVE_AUDIT_EXIT=0
```

**CI on GitHub (latest run):**
```
completed	success	Deploy to Vercel: live URL, spend-limit and limiter decisions	CI	main	push	41118583389	1m52s	2026-10-30T19:50:59Z
```

**QA verdict:** APPROVED (final gate against the deployed URL, `.loop/qa-findings.md`).
- SPEC §18: all 5 items pass.
  1. The URL works with no setup: the canonical HOLD/ESCALATE/ALLOW checks come from saved responses, and live Groq works.
  2. CI is green: 105 tests, saved eval 12/12, e2e passes. The README eval table matches evals/results.md.
  3. The live dynamic-proof edits behave as specified: B1 → HOLD at 2 days, B2 → CAUTION, B3 → ESCALATE, B7 → CAUTION.
  4. The disclaimer is on every screen at all three widths.
  5. The README is complete, with the exact spend-limit wording.
- Extras: the live send flow and Impact tab work, the tour works at all widths, the Esc fix holds live, and the phone layout is fine.
- Secrets: none in the 664 KB of deployed JS/CSS.
- Personas: DOC-105 never reaches Support agent.
- Open notes (not blocking):
  - The walkthrough video link is a placeholder; Abdullah records it.
  - The 503 path wasn't triggered live, to save quota; it was verified locally in Phase 3.
  - CI warns that some actions target the deprecated Node 20 runtime.

**Worktrees:**
```
D:/Project/slite 3a3ff86 [main]
```

GATE: PASSED

## Phase 5
**Design v2 restyle** (brief `design/v2/REDESIGN_PROMPT.md`; artboards `design/v2/*.dc.html`; D-026, D-027, D-028).
- Send runs the check through `/api/send`: held → "Held by Slite Agent" + disabled "Send (held)" + intercept; Double-check → acknowledgement + Send anyway; AI unavailable → "Not sent, nothing was lost".
- Layout: three cards. The Slite Agent card has 2 tabs (Check, Docs); Why and Trace are built from the real CheckResult.
- Plain outcome names. Demo menu holds personas, Impact, AI mode, tour, reset. Figtree tokens; responsive at 1100/700; tour updated.
- Engine, AI pipeline, API and engine tests unchanged.
- **One-time unlock of the demo test (approved):** the test was rewritten to the v2 contract. QA compared it with the old test (every guarantee kept, two strengthened) and approved it, then the folder was re-locked:
```
# Locked paths (in addition to tests/, SPEC.md, IMPLEMENTATION_BRIEF.md, data/seed/). One per line.
e2e/
```
- QA verdict: APPROVED. It checked the screenshots side by side with all 9 artboards at 1440 and 390, accepted the 5 D-027 deviations, and confirmed dynamic proof in v2 (B1 → Hold at 2 days, B2 → Double-check, B3 → Ask first, B7 → Double-check), outcome contrast 5.67–8.35:1, and DOC-105 hidden for Support agent. Minors were fixed or recorded in D-028.

**Final local run** (`pnpm build && record-demo && pnpm typecheck && pnpm test && pnpm exec playwright test && ui-audit --serve`):
```
wrote docs/demo.gif and docs/demo.webm
 Test Files  12 passed (12)
      Tests  105 passed (105)
  ok 1 [chromium] › e2e\demo.spec.ts:15:5 › wrong draft → Send → held → Use this reply → Send → sent → Demo menu shows 1 stopped (683ms)
  1 passed (22.2s)
Serious/critical axe violations: 0. Horizontal page scroll: none. States that failed to reach: none.
P5_EXIT=0
```

**Deployed** to https://answerguard.vercel.app (CLI, production). Live smoke test:
```
GET / → 200 (1.09s) · GET /how-it-works → 200 · GET /demo.gif → 200 (4,672,703 B)
support_agent seed: DOC-105 mentions 0
POST /api/send wrong 4-day draft (TCK-9001) → HTTP 409 blocked HOLD (saved)
Docs tab live: PASS docs@1024, PASS docs@390 (edit applied, no horizontal scroll)
```
**Live UI audit, desktop + phone** (`ui-audit.ts https://answerguard.vercel.app`; the AI-unavailable state is local-only because live AI answers):
```
empty         1440px  axe: none
held          1440px  axe: none
why           1440px  axe: none
trace         1440px  axe: none
docs          1440px  axe: none
double-check  1440px  axe: none
ask-first     1440px  axe: none
sent          1440px  axe: none
demo-menu     1440px  axe: none
empty         1024px  axe: none
held          1024px  axe: none
why           1024px  axe: none
trace         1024px  axe: none
docs          1024px  axe: none
double-check  1024px  axe: none
ask-first     1024px  axe: none
sent          1024px  axe: none
demo-menu     1024px  axe: none
empty          390px  axe: none
held           390px  axe: none
why            390px  axe: none
trace          390px  axe: none
docs           390px  axe: none
double-check   390px  axe: none
ask-first      390px  axe: none
sent           390px  axe: none
demo-menu      390px  axe: none
Serious/critical axe violations: 0. Horizontal page scroll: none. States that failed to reach: none.
LIVE_EXIT=0
```

**Worktrees:**
```
D:/Project/slite e40fd2b [main]
```

GATE: PASSED
