# QA findings · Phase 2 · 2026-10-30T17:34:07Z

This is a re-review after the fixes in DECISIONS D-018 and D-019. The gate is PLAN §3 Phase 2 as amended by D-001, D-013, D-015, D-016, D-017, D-018 and D-019.
Per instruction I did not run `pnpm eval` (live) or `pnpm record`. The live eval and recording evidence was checked from the
committed artifacts (`evals/results*.{md,json}`, `data/ai-cache/`, the recorder log) plus my own offline replays.

## Commands run
- `pnpm typecheck` → exit 0
- `pnpm test` → exit 0 · `Test Files 12 passed (12)` · `Tests 105 passed (105)` (includes the locked tests/ai/cache-identity.test.ts and the new aiDeps tests for D-018)
- `pnpm build` → exit 0 · `/api/check`, `/api/seed`, `/api/send` dynamic; `maxDuration = 60` on check and send
- Env check: `GROQ_API_KEY= GEMINI_API_KEY= AI_PROVIDER= AI_FALLBACK_PROVIDER= npx tsx envcheck.ts` → `after loadEnvConfig: GROQ len 0 GEMINI len 0 AI_PROVIDER ""` (`.env.local` does not refill empty env vars, so the next run really had no keys)
- `GROQ_API_KEY= GEMINI_API_KEY= ANTHROPIC_API_KEY= AI_PROVIDER= AI_FALLBACK_PROVIDER= pnpm eval --saved` → exit 0
  - `Decision accuracy: 100.0% (12/12)` · `Quote validity: 100.0% (13/13 … 0 rejected)` · `Extraction field accuracy: 100.0% (60/60)` · `Gate … PASS`
  - every case ✓, including canon-9001 HOLD (suggestion "1 business day"), canon-9002 ESCALATE, canon-9003 ALLOW, B1, B2, B3, B7 and B4
- `GROQ_API_KEY= GEMINI_API_KEY= AI_PROVIDER=gemini AI_FALLBACK_PROVIDER= pnpm eval --saved` → exit 0 · `## gemini · gemini-3.5-flash-lite (saved responses replay)` · `12/12` · `Gate PASS`. The Groq recording replays when Gemini is configured, so the D-018.1 savedLookup works and former Major 1 is fixed.
- `pnpm eval --combine` → exit 0, no model calls. `results.md` came out identical to the committed one apart from the date lines.
  - `Selection: AI_PROVIDER=groq, AI_FALLBACK_PROVIDER=gemini. Both passed the gate and tied on every metric (0 quote rejections each, equal field accuracy); the incumbent primary (groq) is kept.`
  - groq `openai/gpt-oss-120b`: runs 3 · 36/36 decisions · quotes 39/39 · fields 180/180 · Gate PASS · B4 3/3
  - gemini `gemini-3.5-flash-lite`: runs 3 · 36/36 decisions · quotes 38/38 · fields 180/180 · Gate PASS · B4 3/3 (the earlier B4 false ALLOW is gone)
  - results-*.json: both `runs: 3, promptVersion: '2026-10-30.2', gatePass: true, quoteRejections: 0, fieldsCorrect: 180/180`
- Saved-cache integrity (`npx tsx cachecheck.ts`, reads data/ai-cache): 17 files: 9 source_extraction, 6 draft_extraction, 2 safe_reply. All are `groq/openai/gpt-oss-120b`, prompt `2026-10-30.2`, schema `2026-10-30.1`. `identity mismatches 0`. `escalate template draft extraction recorded true`. The DOC-105 entry exists (ops_lead persona). Secret grep (`API_KEY|gsk_|AIza`) over data/ai-cache and evals: no hits.
- Recorder log (scratchpad/record.txt): 24 lines ✓ (12 cases × 2 personas). Each suggestion was rechecked: AI HOLD replies → ALLOW/SUPPORTED (canon-9001) and CAUTION/CHANGE_SIGNALLED (B1); ESCALATE template → ALLOW/NO_POLICY_CLAIM. `Recorded 17 saved responses … Mismatches: 0`, `RECORD_EXIT=0`. 17 matches the unique inputs I count: 9 source bodies (B6 and B7 reuse earlier bodies), 6 drafts (3 golden, 2 AI replies, 1 ESCALATE template) and 2 safe replies. Former Major 2 is fixed.
- Offline probe with fake providers (`npx tsx probe.ts`, real runCheck + aiDeps):
  - support_agent: 5 provider requests, `doc105 in requests false in response false`; ops_lead `true` (so the probe can detect it)
  - both providers 429 → `AI_UNAVAILABLE`, ai `{"mode":"unavailable",…,"provider":"gemini","paused":true}`
  - 429 then provider error → ai `{…,"paused":true}` (former minor fixed)
  - primary error → fallback → ai `{"mode":"live","model":"g",…,"provider":"gemini","fellBack":true}` (provider and fellBack now reach CheckResult.ai)
  - limiter: `gate calls first check 1 second (cache hits) 0`
  - `AI_MODE=saved` with keys set → providers `[null]`; no keys → `[null]`
- `git worktree list` → `D:/Project/slite 6a14f10 [main]` (only one)

## Gate items
- Prompts with PROMPT_VERSION, `<document>` tags and the "data, not instructions" rule: OK. `escapeEnvelope` now neutralizes `</document>`/`</reply>` (prompts.ts:51) and has a unit test.
- Per-source structured extraction, zod-validated, retry once then reject: OK. Groq 400 `json_validate_failed` → AiInvalidOutputError → retried on the same provider and never handed to the fallback (client.ts:56, aiDeps.ts callLive, unit test).
- Draft extraction and safe reply: OK. The reply prompt gets only V, its quote and the draft. The output is re-extracted, span-validated and rechecked via `decide()`, with the template as fallback.
- Quote validation: OK (runCheck.ts validateSourceClaims/validateDraftClaims).
- Cache: full SPEC §10 identity plus provider and model; the file loader checks identity against key; 0 mismatches across 17 files. OK.
- Record and eval scripts: OK. Both are throttled per provider (Groq 12 s, Gemini 4.5 s). The recorder checks the provider before clearing the cache. The eval selection counts only reports with runs ≥ 3 and the current prompt version, with the D-019 tie-break.
- Layered limits: OK. Upstash per-IP plus a global daily cap, an in-memory fallback, and the paused flag reaching CheckResult.ai. Input caps are 1000/4000/6. The per-call timeout is 9 s and maxDuration 60 s.
- Two providers with fallback once on 429/quota or provider error: OK. AI_PROVIDER/AI_FALLBACK_PROVIDER are set in `.env.example` and CI (`AI_PROVIDER: groq`, `AI_FALLBACK_PROVIDER: gemini`, `AI_MODE: saved`).
- Eval 3/3 on the canonical tickets plus B1, B2, B3 and B7: OK for both providers (results.md / results-*.json, prompt 2026-10-30.2).
- Cache recorded: OK. With the key unset and AI_MODE=saved, the canonical results reproduce: OK (my own run above).
- Full test suite including the cache test: OK (105/105).
- Hidden sources never reach a provider: OK (probe plus T5).

## Findings
- [severity: minor] evals/results-groq.json, evals/results-gemini.json · `runs`/`promptVersion`/`fieldsCorrect` were backfilled by hand from each report's own markdown instead of written by the eval. This is disclosed in D-019, and the values match the embedded markdown ("Runs per case: 3", "180/180"). The timestamps (groq 17:22:19Z, gemini 17:25:27Z) fit one sequential throttled run. Acceptable. The next live eval will write these fields natively. · SPEC §14, D-019
- [severity: minor] scripts/eval.ts (writeCombined) · the last tie-break reads `process.env.AI_PROVIDER`, so after a perfect tie `pnpm eval --combine` can pick a different provider depending on the caller's env. It is documented in D-019 and harmless today, but a fixed tie-break order would make the selection reproducible. · D-019
- [severity: minor] lib/ai/prompts.ts (replyUserPrompt) · the governing quote sits outside the `<reply>` envelope and is not escaped. It is always a verbatim substring of a visible source body, and the reply output is rechecked by the engine, so the impact is negligible. · SPEC §10
- [severity: minor] process · `data/ai-cache/`, `evals/`, `lib/ai/*`, `.github/` are still untracked, and PROGRESS.md has no `## Phase 2` / `GATE: PASSED` block yet. They must be committed with the gate, because CI's `pnpm eval --saved` needs data/ai-cache in the repo. · CLAUDE.md loop mechanics

No blocker or major findings remain. Both earlier majors are fixed and proven by output (saved replay with a different configured provider; the recorder log and cache contents show the template-reply extraction).

## VERDICT: APPROVED
