# QA findings · Phase 4 pre-deploy (re-review) · 2026-10-30T19:35:19Z

## Commands run
- `git worktree list` → `D:/Project/slite e3f21ac [main]` (only). Before and after: no listeners on :3100/:3200. QA's :3200 server was stopped with `taskkill /T /F` on its shell PID, and netstat confirmed it was gone.
- `pnpm typecheck` → exit 0
- `pnpm test` → exit 0 · `Test Files 12 passed (12)` · `Tests 105 passed (105)`
- `pnpm exec playwright test` (cold, saved mode) → exit 0 · `ok 1 … Impact shows 1 intercept` · `1 passed (1.8m)`
- `pnpm exec tsx scripts/ui-audit.ts --serve` → exit 0 · `stale 1440/1024/390 axe: none` · `Serious/critical axe violations: 0. Horizontal page scroll: none.` Its server was gone afterwards.
- precommit-scan, throwaway repo with random fake keys generated at runtime. One file staged at a time:
  - Blocked (exit 1): raw `AIza…` in .ts; `GEMINI_API_KEY=AIza…` in .md; `const GEMINI_API_KEY = "<48 hex>"`; `GROQ_API_KEY=<hex>`; `UPSTASH_REDIS_REST_TOKEN=<hex>`; `DB_PASSWORD: <hex>`.
  - Clean (exit 0): empty `GEMINI_API_KEY=`/`GROQ_API_KEY=`; `process.env.GEMINI_API_KEY`; `GROQ_MODEL=openai/gpt-oss-120b`; the full .env.example; a short `SOME_TOKEN=abc123`.
  - False-positive check: all 197 committable files staged in a throwaway repo → `precommit-scan: clean (197 staged files checked)`, so the real commit won't be falsely blocked.
- QA tour driver (scratchpad tour2.cjs / esc.cjs, saved mode, :3200):
  - Fix 3, Back → Next: apply B7 in step 5 → Back → Next fires 0 checks on entry. The tour shows "DOC-103 is already edited in this workspace, so the before/after won't show." with a visible "Restore DOC-103 to its seed version" button and Apply hidden. Restore → 1 check, overrides `{}`, Apply visible. Apply → "Hold | Caution | Changed because DOC-103 v2 saved as a draft".
  - Fix 3, pre-edited DOC-103 (B1 Save and verify before the tour): step 5 shows the same message and the Restore button. Minor caveat: step 1 still narrates "1 business day" while the banner says "Hold … 2 business days", which is accurate for that workspace.
  - Fix 4, Esc in the Reset dialog with the tour open: before Esc, tour open = 1, reset dialog = 1, focus on Cancel. After Esc, **tour open = 0**, reset dialog = 0. Control: closing the dialog with Cancel keeps the tour open (1).
  - Fix 4, persona tooltip: focus on "About personas", tooltip visible/1, tour open = 1. After Esc, **tour open = 0**, tooltip hidden.
  - 390 top bar: `markVisible: true, tourBtn: true, badge "Idle", hScroll: false, overflowHeader: false`. The screenshot shows mark · persona switch · info · tour · reset · badge.
  - Stale pill: after check → safe reply → Send, axe at 1440 shows none. The screenshot shows the "Allow" pill at full contrast with a dashed outline.
  - Console errors: none.
- README.md:83: "a provider spend limit on a dedicated demo key (its behaviour, hard stop vs alert, is confirmed and recorded at deploy)".

## Findings
- [severity: minor] components/tour/GuidedTour.tsx:211-221 · expected (fix 4 / D-023): Esc inside the Reset dialog or on the persona tooltip closes only that control · actual: it closes the tour too (see the measurements above). Cause: React runs the dialog's or tooltip's own Esc handler (App.tsx:53 `onCancel`, RoleSwitch.tsx:68 `setTip(false)`) and flushes that update *before* the native event reaches the tour's `document` listener. By then the Reset dialog is unmounted and focus is no longer inside it. For the tooltip, focus is on the "About personas" button, which is never inside `[role="tooltip"]`. So `inOtherDialog` is false both times. Fix: have those handlers call `e.preventDefault()` (the listener already checks `e.defaultPrevented`), or register the tour listener in the capture phase and record the target before React handles it. The impact is low: the tour can be reopened and nothing is lost.
- [severity: minor] carried over · CI depends on the still-untracked lib/workspace/variantBodies.ts, components/tour/*, docs/demo.gif and scripts/record-demo.ts. Commit them together with the modified files, as noted.

Previous majors verified fixed:
1. Stale pill contrast: no opacity, dashed outline, axe clean in the new audit state and in the real send flow.
2. Secret scan: Gemini and env-style patterns block every test case, with no false positives on the repo.

Fix 3 is verified for both scenarios, fix 5 (390 top bar) is verified, and fix 6 (README spend-limit wording) is verified.

## VERDICT: APPROVED
