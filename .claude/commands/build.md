---
description: Run the gated build loop for the current phase (builder → tester → qa → fix → repeat).
---

Run the AnswerGuard build loop for the phase in `.loop/phase` (create it with `0` if missing). Read `CLAUDE.md`, `PLAN.md` (the phase's files and gate) and `PROGRESS.md` first.

Loop:
1. **builder** subagent: implement the phase's remaining work from PLAN.md (or fix every blocker/major item in `.loop/qa-findings.md` if it says `CHANGES_REQUIRED`).
2. **tester** subagent: run `pnpm typecheck` and `pnpm test` (plus `pnpm eval` / `pnpm e2e` when the gate needs them) and paste the raw output.
3. **qa** subagent: independent review against SPEC and the phase gate; it writes `.loop/qa-findings.md` ending in a VERDICT.
4. If tests fail or the verdict is `CHANGES_REQUIRED`: go back to step 1 with the findings.

Attempt limit: keep `.loop/attempts.json` as `{ "<issue key>": <count> }`, where the issue key is the failing test name or the QA finding's file:line + summary. Increment it each time the same issue survives a fix. When any count reaches 5, write `.loop/BLOCKER.md` (issue, the 5 attempts and what each changed, raw output of the last run, what a human must decide) and stop.

Gate passes only when the tests pass **and** QA says `VERDICT: APPROVED`. Then:
- Append to `PROGRESS.md` under `## Phase N`: what was built, the raw test output (fenced), QA's verdict, `git worktree list` output (fenced), and `GATE: PASSED`. On failure write `GATE: FAILED` and why.
- `git add -A`, run `node scripts/precommit-scan.mjs` (abort and fix on a hit), commit `Phase N: gate passed`, `git push`.
- Clear `.loop/attempts.json` and `.loop/qa-findings.md`, write N+1 to `.loop/phase`, and continue with the next phase unless PLAN.md puts a human stop point there (write `.loop/await-human.md` explaining exactly what is needed, then stop).

Never use git worktrees or sibling folders. Never skip a gate.
