# AnswerGuard: rules for every agent

Read `SPEC.md` (the contract), `IMPLEMENTATION_BRIEF.md`, `PLAN.md` and `DECISIONS.md` before working.
If the brief and the spec disagree, the spec wins. Amendments to the spec live in `DECISIONS.md` (e.g. D-001: Groq is the AI provider).

1. SPEC.md is the contract. Never edit `tests/`, `SPEC.md`, `IMPLEMENTATION_BRIEF.md` or `data/seed/` once `.loop/locked` exists.
2. The engine stays pure and deterministic. The AI never decides outcomes. "The AI found nothing" is never treated as "safe".
3. If the AI misbehaves, fix the prompts or schemas, not the rules or tests.
4. Every rule writes a trace entry. Every AI output passes zod and quote validation.
5. Hidden sources never reach the AI or a response.
6. Finish a phase only when its gate passes. Paste the gate evidence (real command output) into `PROGRESS.md`.
7. Ask Abdullah only at the design-mockup checkpoint or on a real blocker (plus the stop points in `PLAN.md`: deploy setup, anything irreversible or costly).
8. **No git worktrees.** Work directly in `D:\Project\slite` on `main`. Never run `git worktree add` and never create sibling
   folders such as `slite-b2`. For risky work, create a branch in this same folder (`git switch -c <name>`), merge it back
   into `main` when the gate passes, delete the branch, and push. At the end of every phase, `git worktree list` must show
   only `D:\Project\slite`. Never spawn subagents with worktree isolation.

## Loop mechanics
- Current phase: `.loop/phase` (a single number). Gate status: `PROGRESS.md`, section `## Phase N`, line `GATE: PASSED` plus a fenced evidence block.
- QA findings: `.loop/qa-findings.md`, ending in `VERDICT: APPROVED` or `VERDICT: CHANGES_REQUIRED`.
- Human checkpoint: `.loop/await-human.md`. Blocker: `.loop/BLOCKER.md` (after 5 failed attempts on one issue).
- Long background command: run it as `node scripts/waiting.mjs run "<what>" -- <command>` so the Stop hook lets you wait (D-020: running PID + under 30 minutes only).
- Before every commit: `node scripts/precommit-scan.mjs` (also the git pre-commit hook). A secret in the staged diff aborts the commit.
- Commit and push after each passed gate: `Phase N: gate passed`.

## Code conventions
- TypeScript strict, `noUncheckedIndexedAccess`. No `any` without a comment explaining why.
- Engine code (`lib/engine/`) has no I/O, no `Date.now()`; time is passed in.
- Every API body and AI output is validated with zod.
- Windows machine: Node scripts only (`.mjs`/`.ts`), normalize `\` to `/` when matching paths.
