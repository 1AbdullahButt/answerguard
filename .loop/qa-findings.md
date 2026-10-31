# QA findings · Phase 6 · 2026-10-31T12:12:52+05:00

Scope: re-review of the rename AnswerGuard → SureSend (PLAN.md §9, D-031, D-032) after fixes for the 04:25 findings.
Uncommitted working tree on `main` at 5f46364. Files touched since the last review (mtime listing, excluding ignored
build output): `PROGRESS.md`, `lib/client/storage.ts`, `lib/client/storage.test.ts` (new), `.loop/await-human.md`,
`.loop/qa-findings.md`. `.git/info/exclude` has a new entry.

## Commands run
- `pnpm typecheck` → exit 0 (`tsc --noEmit`, no output).
- `pnpm test` → exit 0, `Test Files 13 passed (13) · Tests 108 passed (108)`.
- `pnpm exec vitest run lib/client/storage.test.ts --reporter=verbose` → exit 0, 3/3:
  - moves a legacy value to the new key when the new key is empty
  - keeps the new value and still removes the legacy key when both exist
  - returns the fallback when neither key exists

  The second case would fail on the pre-fix logic, which only migrated when the new key was missing.
- `git diff PROGRESS.md` → 2 hunks only:
  - line 1: `# AnswerGuard · Progress log` → `# SureSend · Progress log`
  - line 308: adds "(renamed `suresend` in Phase 6)" after "Vercel project `answerguard`"

  `grep -c suresend.vercel.app PROGRESS.md` → 0. Lines 309, 313, 323, 401 and 408 again read `https://answerguard.vercel.app`, the same as HEAD. The previous MAJOR is resolved.
- `git diff lib/client/storage.ts` (vs HEAD) → `LEGACY_PREFIX` and `migrateLegacy(key, current)`, called from `readJson`. It copies only when `current === null` and calls `removeItem(legacy)` whenever a legacy value exists.
- Real-browser migration check. I ran `pnpm start -p 3200` (AI_MODE=saved, build from the e2e run), then scratchpad `mig4.mjs` (`navigator.webdriver=false`, so the tour-seen key is read):
  - Both keys present: legacy metrics had 3 intercepts and new had 7; legacy tour.seen was "false" and new was "true". Result: the Demo menu shows "stopped 7", and localStorage holds only `suresend.metrics.v1` (7) and `suresend.tour.seen.v1` ("true"). The legacy keys are gone.
  - Legacy keys only, at 390 px: the Demo menu shows "stopped 5". localStorage holds only `suresend.metrics.v1` (5) and `suresend.tour.seen.v1` ("true").
  - Page errors: none.
  - With the default automated context (`webdriver=true`), `answerguard.tour.seen.v1` stays because App.tsx:132 skips the tour read for automated browsers. This is expected and harmless.
  - I stopped the server with `taskkill /PID 34876 /T /F` (my own pnpm → cmd → next tree): 3 SUCCESS lines.
- `pnpm exec playwright test` (cold: nothing listening on 3000/3100/3200) → exit 0, `1 passed (1.1m)` "wrong draft → Send → held → Use this reply → Send → sent → Demo menu shows 1 stopped". Port 3100 was free afterwards.
- Axe audit, rerun on the new code without touching `design/audit/`: I ran `pnpm start -p 3100` (AI_MODE=saved), then `tsx D:/Project/slite/scripts/ui-audit.ts http://127.0.0.1:3100` with the scratchpad `audit6b/` as cwd.
  - exit 0, 30/30 `axe: none`. Summary line: `Serious/critical axe violations: 0. Horizontal page scroll: none. States that failed to reach: none.`
  - The project's `design/audit/*` mtimes are unchanged (04:09).
  - I stopped the server with `taskkill /PID 36648 /T /F`: 3 SUCCESS lines. Nothing is listening on 3000/3100/3200.
- Locked paths, `tests e2e data/seed SPEC.md IMPLEMENTATION_BRIEF.md`:
  - `git diff --stat HEAD` → empty. `git diff --cached --stat` → empty. `git status --short --untracked-files=all` → empty.
  - Raw-byte check (`git hash-object --no-filters` vs `HEAD:<path>`) → `files=33 diffs=0`. `.loop/locked` exists.
- VIDEO_SCRIPT:
  - `git check-ignore -v docs/VIDEO_SCRIPT.md` → `.git/info/exclude:9:docs/VIDEO_SCRIPT.md`, exit 0.
  - `git status --short` does not list it; `--ignored` shows `!! docs/VIDEO_SCRIPT.md`.
  - `git log --all -- docs/VIDEO_SCRIPT.md` → empty, so it was never committed.
  - `app/icon.svg` and `lib/client/storage.test.ts` are untracked and not ignored, so both must be staged in the Phase 6 commit.
- Case-insensitive `answer[ _-]?guard` grep over `git ls-files -co --exclude-standard` (180 text files; png/gif/webm skipped; the GIF frames were checked in the last review). No file path contains the name. Hits outside SPEC/brief/tests/e2e/seed, all of them allowed:
  - README.md:3 and DECISIONS.md:3: the note "SureSend was called AnswerGuard in SPEC v2.2 and the brief."
  - DECISIONS.md:270: D-025, annotated "(renamed `suresend` in D-031)".
  - DECISIONS.md:377-401: D-031 and D-032.
  - PLAN.md:6, 45 (annotated), 165, 178: historical repo-name records.
  - PLAN.md:191: the §9 rename item itself.
  - KICKOFF_PROMPT.md:65: historical `gh repo create answerguard` command, covered by D-031. Accepted as is.
  - PROGRESS.md:308 (annotated) and 309/313/323/401/408: historical answerguard.vercel.app URLs, identical to HEAD.
  - lib/client/storage.ts:5-6 and lib/client/storage.test.ts:1, 23, 26, 30, 34: migration constant and its test.
  - .loop/await-human.md:3: old-URL mention.
  - .loop/qa-findings.md: this file.
- Live:
  - `curl https://answerguard.vercel.app/` → 200, `<title>SureSend · a concept for Slite Agent</title>`, 0 "AnswerGuard" hits.
  - `curl https://suresend.vercel.app/` → 404, as stated (the alias was removed; waiting on the dashboard step).
- Live bundle vs local build. The deployed chunk has the old migration: `if(null===a&&(a=function(e){if(!e.startsWith(p.to))return null;…`. The local `.next` chunk has the new one: `if(null===(a=function(e,t){if(!e.startsWith(p.to))return t;…`.
- `git worktree list` → `D:/Project/slite 5f46364 [main]` only. Branches: `main`, `remotes/origin/main`.

## Findings
- [severity: minor] Live deployment vs working tree. Expected: the deployed build matches the code that will be committed as Phase 6. Actual: https://answerguard.vercel.app still serves the pre-fix `migrateLegacy`, which runs only when the new key is missing (bundle excerpt above). Fix: redeploy after the dashboard step and before recording the gate, then smoke-test both URLs again. PLAN.md §9 gate ("deployed").
- [severity: minor] lib/client/storage.ts:15-20. If `setItem(key, raw)` throws (quota), the catch returns `current` (null). That read then falls back to the default even though the legacy value was in hand. The legacy key stays, so the next load retries and nothing is lost. Optional: return `raw` (or put it in `memory`) in that path. SPEC §9 (storage degrades to memory).
- [severity: minor] DECISIONS.md:396-402 (D-032) still describes the alias as set and redirecting to Vercel SSO. Per `.loop/await-human.md` it was removed with `vercel alias rm` and the URL is now 404. The entry says it will be updated once the domain serves publicly; include the alias removal in that update.
- Resolved from the 04:25 review:
  - PROGRESS.md URLs (MAJOR): fixed.
  - VIDEO_SCRIPT exclusion: fixed.
  - Storage legacy-key removal plus automated test: fixed and verified in a browser.
  - KICKOFF_PROMPT:65: accepted under D-031.

## Pending gate items (lead verifies; not code findings, per the review brief)
- https://suresend.vercel.app must load publicly (currently 404, waiting on Abdullah's Vercel dashboard step, D-032). Until then the README "Live demo" link (README.md:16) and the og:url/og:image (app/layout.tsx:15, 21) point at a 404.
- Redeploy (see the first finding), then a live check that the header says SureSend on both URLs.
- PROGRESS.md needs a `## Phase 6` section with `GATE: PASSED` and a fenced evidence block.
- Stage `app/icon.svg` and `lib/client/storage.test.ts`, and do not stage `docs/VIDEO_SCRIPT.md`, which is excluded.

## VERDICT: APPROVED
