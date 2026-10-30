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

### D-008 · Toolchain pins and subagent invocation
- `corepack enable` failed with EPERM (Program Files); pnpm 9.15.9 installed with `npm i -g pnpm@9` instead.
- TypeScript pinned to 5.9 (pnpm resolved 7.0, which Next 15's type-check integration doesn't support); `@next/env` pinned to 15 to match `next@15.5`.
- Line endings forced to LF via `.gitattributes` so seed docs stay byte-exact on Windows.
- Project subagents in `.claude/agents/` load only when a Claude Code session starts. In the session that created them,
  each role runs as a general-purpose agent instructed to read and follow its `.claude/agents/<role>.md` file. Future
  sessions (and `/build`) use the named agents directly.

### D-009 · Groq structured output mode
Groq supports `response_format: {type: "json_schema", strict: true}` (constrained decoding) only on a few models, and
not together with tool use or streaming. Strict mode requires every property in `required`, `additionalProperties: false`
and nullable unions for optional values, so the JSON schemas sent to Groq make `amountMax` nullable and zod maps
`null` → absent before validation.

### D-010 · ESCALATE template recheck is deterministic too
Extends D-005: the ESCALATE template is asserted timeline-free (no digits, no day/hour words, no detector hit) and rechecked
through `decide()` with zero draft claims (→ ALLOW `NO_POLICY_CLAIM`). No AI call. (QA Phase 0 finding #5.)

### D-011 · Sequencing note
While QA reviewed the Phase 0 tests, the orchestrator drafted the Phase 1 engine in `lib/engine/` (files QA was not reviewing).
To keep the Phase 0 evidence honest, the stubs were temporarily restored to capture the failing test run, then the engine was
put back. Phase 1 still goes through its own tester run and independent QA review.

### D-012 · Phase 1 QA fixes (spec gaps closed conservatively)
1. **D1 also fires when every candidate is SCOPE_UNRESOLVED** (unknown rail, only rail-specific rules apply). SPEC's D1
   needs two differing values; without this, D4 would set V from an instant-only rule on a ticket whose rail is unknown
   and HOLD with a timeline. Escalating is the conservative reading of "escalate when unsure" (SPEC §17).
2. **Duplicate claims collapse**: candidates from the same source with the same value count once (the one carrying a
   supersedes sentence wins), so an extractor that splits one doc into two claims can't make it fail D5/D6 "exactly one".
   Claims from the same source with *different* values still conflict: a source can't supersede its own claim (D5 condition 3 fails).
3. **A source whose every extracted claim fails quote validation counts as unread** (`ALL_CLAIMS_REJECTED` → the
   SOURCE_UNREAD cap), mirroring D0a on the draft side. "The AI found nothing usable" is never treated as "safe".
4. **A draft claim with no value** records D1/D2 as skipped and D3 fired ("unsupported"), so the trace never jumps.
5. **Top-level trace**: `CheckResult.trace` (extension) holds D0a/D0b/D0c/D0d, the SOURCE_UNREAD cap and the roll-up.
6. **AI safe replies**: accepted only when the recheck is ALLOW, or CAUTION for WEAK_BASIS / CHANGE_SIGNALLED /
   SOURCE_UNREAD. A CAUTION meaning "couldn't understand the reply" (EXTRACTION_GAP, OUTSIDE_COVERAGE, …) falls back to
   the template. SPEC §6.7's "ALLOW or CAUTION" is the outer bound.
7. Provider/API errors are listed as `EXTRACTION_ERROR`; `INVALID_OUTPUT` is reserved for output that failed validation.
8. D5's fired trace lists conditions 1–4 explicitly; condition 2 (supersedes quote verbatim) is re-checked in the engine.
