# Claude Code kickoff prompt: SureSend

How to use:
1. Open a terminal in `D:\Project\slite`.
2. Run `claude`.
3. Press **Shift+Tab** until the mode shows **plan mode**.
4. Paste everything under the line below.
5. When it shows the plan, read it and approve it with **auto-accept edits** (or answer its questions first).

---

You are building **SureSend** in this folder (`D:\Project\slite`). This is a fresh project. Do **not** copy or reuse anything from other folders in `D:\Project`.

## 1. Read first
Read `SPEC.md` (v2.2) and `IMPLEMENTATION_BRIEF.md` completely before doing anything.
- `SPEC.md` is the contract. If the brief and the spec disagree, the spec wins.
- If anything in the spec is contradictory or impossible, list it in your plan as a question. Do not silently reinterpret it.

## 2. Plan (plan mode, now)
Write a plan covering:
- the agent-loop setup (section 3 below)
- GitHub setup (section 4)
- Phases 0 to 4 from the brief: the files for each phase, the gate for each phase, and how the gate will be proven with evidence
- risks you see, especially in live AI extraction (SPEC 6.2, Appendix B)
- questions for me (keep this list short)

Then stop and wait for approval. After approval, save the plan as `PLAN.md` and execute it autonomously.

## 3. Build the agent loop first (fresh, cross-platform)
This machine runs Windows with PowerShell. Write every hook in **Node.js** (`.mjs`), not bash. Normalize backslashes to `/` before matching any path.

1. **Subagents** in `.claude/agents/`:
   - `designer.md`: produces `design/DESIGN.md` and static HTML mockups (Phase 3 only).
   - `builder.md`: implements code to the spec. It never edits locked files.
   - `tester.md`:
     - In Phase 0, writes tests T1 to T8 and the fixtures from SPEC 14.
     - After that, it only runs tests and reports the real output.
   - `qa.md`: an independent reviewer. It:
     - checks the work against SPEC acceptance and the phase gate
     - runs the app and the tests itself
     - writes findings to `.loop/qa-findings.md` with file, line, expected vs actual, and severity.
2. **Lock hook**, `.claude/hooks/protect-locked.mjs` (PreToolUse on Edit, Write, MultiEdit and Bash). Once `.loop/locked` exists, it blocks any change to `tests/`, `SPEC.md`, `IMPLEMENTATION_BRIEF.md` and `data/seed/`, and exits with code 2 and a clear message. It also blocks Bash commands that delete, move or redirect into those paths.
3. **Stop hook**, `.claude/hooks/gate-stop.mjs`. It blocks stopping unless one of these is true:
   - `PROGRESS.md` marks the current phase gate `PASSED`, with evidence pasted underneath
   - `.loop/await-human.md` exists (a human checkpoint)
   - `.loop/BLOCKER.md` exists

   When it blocks, it tells the agent the next step of the loop.
4. **Orchestrator command**, `.claude/commands/build.md` (`/build`). For the current phase, it loops:
   1. builder implements
   2. tester runs the tests and pastes the real output
   3. qa reviews
   4. if anything fails, builder fixes using `.loop/qa-findings.md`, and the loop repeats from step 2

   **Limits:** after 5 failed attempts on the same issue, write `.loop/BLOCKER.md` and stop. A gate passes only when the tests pass **and** qa approves.
5. Register the hooks in `.claude/settings.json`.
6. Write `CLAUDE.md` with the 7 rules from brief section 7.
7. **Canary check.** Create `.loop/locked`, try to edit a file in `tests/`, and paste the blocked output into `PROGRESS.md`.

## 4. GitHub
`gh` is installed and authenticated.
1. Run `git init`.
2. Write `.gitignore`: `node_modules`, `.next`, `.env*` except `.env.example`, `.vercel`, `test-results`, `playwright-report`.
3. Commit the docs.
4. Run `gh repo create answerguard --private --source . --push`.
5. Commit and push after every passed gate, with the message `Phase N: gate passed`.

**Before every commit:** run `git diff --cached` and make sure there are no API keys or tokens in it. If there are, abort the commit and fix it.

## 5. Execute Phases 0 to 4 exactly as the brief describes
Use `PROGRESS.md` as the live log. For each phase, record:
- what was built
- the real test output
- qa's verdict
- `GATE: PASSED` or `GATE: FAILED` (and why)

Hand-traced reasoning is never accepted as evidence.

## 6. Stop for me only at these points
Write `.loop/await-human.md`, explaining exactly what you need, then stop:
1. **Phase 2 start**, only if `.env.local` has no `ANTHROPIC_API_KEY`. In that case, finish everything that doesn't need the key first.
2. **Phase 3 design mockups**, for my approval before any UI is built.
3. **Phase 4 deploy**: Vercel login or linking, Upstash setup, and setting env vars in Vercel.
4. **Anything irreversible or costly**, such as making the repo public, deleting files outside this folder, or paid services.

Everything else: decide sensibly, record the decision in `DECISIONS.md`, and keep going.

## 7. Quality bar
This is a portfolio piece for Slite's engineering team. It should feel like a real product, not a hackathon demo:
- clean TypeScript (strict)
- a real trace in the Reasoning tab
- proper empty, loading and error states
- accessible UI
- an honest "independent concept · synthetic data" label on every screen

Speed matters, but never skip a gate to save time.
