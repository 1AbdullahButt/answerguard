# Decisions

Each entry: date, decision, reason. SPEC.md is never edited; amendments to it are recorded here.

## 2026-10-30

### D-001 · AI provider is Groq (amendment to SPEC §10)
- Requested by Abdullah after plan approval. All AI calls (source extraction, draft extraction, safe reply) go
  through `lib/ai/client.ts`, a provider adapter. `AI_PROVIDER=groq` (default) uses Groq's OpenAI-compatible
  API with JSON-schema structured output. `AI_PROVIDER=anthropic` keeps an Anthropic adapter, off by default.
- Env: `GROQ_API_KEY`, `GROQ_MODEL`, `AI_PROVIDER` (plus `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` for the off-by-default adapter).
- Unchanged: zod validation, retry once, quote validation, saved fallback, eval gate 3/3.
- Cache identity adds `provider` next to `model` (SPEC §10 lists `model`; provider is added so two providers serving
  a model with the same name can never share an entry).
- Groq 429 → treated like a limiter hit: that request uses saved responses and shows "Live AI paused".
- Model choice: recorded in D-010 once verified against Groq's live model list.

### D-002 · Spec ambiguity defaults (plan §5)
1. **"Contradicts" across units.** D11(b) compares amount ranges only; a unit-only difference is written to the trace,
   not treated as a contradiction. Reason: Brief §5 makes SRC-202's "1 day" calendar days, and SPEC T6 requires
   "1 business day" on TCK-9001 to be ALLOW. D1/D4 "agree" requires same amount, amountMax and unit.
2. **Quote normalization.** Whitespace collapse + Unicode NFKC + dash variants (– — ‑ ‒ −) → "-" and smart quotes → straight,
   applied to both quote and text. Reason: SPEC says "normalize whitespace"; models routinely swap the en dash in
   "Outgoing Transfers – Reversal SOP", which would silently break D5. Still a strict substring check.
3. **D0b vs D0c overlap.** When there are zero reversal_window claims: if every detector match lies inside the span of an
   extracted `other` claim with a value → D0c `OUTSIDE_COVERAGE`; any uncovered match → D0b `EXTRACTION_GAP`.
4. **Overall reason fields.** `CheckResult` is extended (no existing field changed) with `reasonCode` (overall),
   `caps` (e.g. `SOURCE_UNREAD` naming the source) and `patternMatches` (detector hits for highlighting).
5. **Hedged contradiction** reason code: `HEDGED_CONTRADICTION` (CAUTION).
6. **Supersession target matching.** Normalize by lowercasing and collapsing every non-alphanumeric run to one space,
   then containment of the source title or ID. "Outgoing Transfers: Reversal SOP" thus matches
   "Outgoing Transfers – Reversal SOP".
7. **T5 "no substring of its body".** Tested as: no line of the body ≥ 12 chars, no title, no `DOC-105`, `FR-HOLD`, `CMP-7`.
8. **Locking.** The Phase 2 cache-identity unit test is written in Phase 0 (tests/ locks then). `e2e/` is added to the lock
   list once written in Phase 3.
9. **Next.js 15** pinned, per the brief.

### D-003 · Tooling
- pnpm was not installed; installed via corepack (falls back to `npm i -g pnpm`).
- Next.js scaffolded by hand (create-next-app refuses a non-empty folder).
- Hook matchers include `PowerShell` and `NotebookEdit` in addition to Edit/Write/MultiEdit/Bash, because those tools exist
  in this environment and would otherwise bypass the lock.
- No git worktrees (CLAUDE.md rule 8). `git worktree add` is blocked by the lock hook regardless of lock state.

### D-004 · Test seams
- Tests call `runCheck(input, deps)` and `handleCheck/handleSend(body, deps)` from `lib/check/`. `deps` injects
  `extractDraft`, `extractSource`, optional `suggestReply`, and `now`. Route files are thin wrappers that pass the real
  AI deps. This lets fixtures replace the AI and lets T5 spy on what the AI would receive.
- Phase 0 ships typed stubs that throw `NOT_IMPLEMENTED` so the Phase 0 gate fails on behaviour, not imports.
- All tests use `decisionTime = 2026-10-30T12:00:00Z`.

### D-005 · Safe-reply recheck for templates
- The HOLD template is rechecked through `decide()` with a deterministic draft claim (we authored the text, so the span
  and value are known). No AI call; the recheck still runs the full rule set. AI-written replies are rechecked with a real
  draft extraction.

### D-006 · Golden eval cases (12)
3 canonical tickets + B1–B7 + TCK-9001 "1 business day" (ALLOW) + a draft with no policy claim (ALLOW `NO_POLICY_CLAIM`).

### D-007 · B5 future date
B5 uses "Effective 1 Jan 2030" so the variant stays in the future for the life of the demo.
