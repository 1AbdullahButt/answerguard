# QA findings · Phase 3 (re-review) · 2026-10-30T18:46:19Z

## Commands run
- Before the run, no listeners on :3100 or :3200, and `git worktree list` → `D:/Project/slite 20d9dfd [main]` (only).
- `pnpm typecheck` → exit 0
- `pnpm test` → exit 0 · `Test Files 12 passed (12)` · `Tests 105 passed (105)`
- `pnpm exec playwright test` (real config, cold build, nothing to reuse) → exit 0 · `ok 1 [chromium] › e2e\demo.spec.ts:8:5 › wrong draft → HOLD → blocked send → use safe reply → sent → Impact shows 1 intercept` · `1 passed (1.6m)`
- `pnpm exec tsx scripts/ui-audit.ts --serve` → exit 0 · `Serious/critical axe violations: 0. Horizontal page scroll: none.` Nothing was listening on :3100 afterwards (the server was stopped). QA viewed the 390 screenshots (empty, check-hold) and reasoning-1440.
- QA regression driver (scratchpad qa.cjs, own saved-mode server on :3200) → exit 0. Same results as the first review:
  - The Check tab has no raw codes. The banner is one line. Inbox chips don't wrap.
  - The Reasoning tab is complete (governing DOC-103 row now listed first), shows the real provider/model groq / openai/gpt-oss-120b, and has Raw JSON. "Open in Sources" lands on the quote.
  - B1 → HOLD with 2 days in the suggestion. B7 → CAUTION (edited after verification). B2 → CAUTION. B3 → ESCALATE. B4 → CAUTION. An arbitrary source edit → CAUTION "Capped: DOC-103 unread".
  - Toggles rerun the check. Reset clears both localStorage keys and the metrics.
  - Send: 409 blocks and counts an intercept. CAUTION needs the ack, then sends. 503 → not sent, 0 intercepts.
  - Drafts checked counts distinct pairs (2). False-alarm: n=1, n=2 "Not enough…", then n=3 "33%".
  - Support agent: 0 DOC-105 or title hits on every tab, and the seed responses are clean. Ops lead sees DOC-105.
  - The Sources editor has no overflow at 390/1024/1440; Cancel, the counter and "Flagged outdated" are visible.
  - Console: only the browser's resource lines for the deliberate 409/503.
- QA fix-check driver (scratchpad fixes.cjs) at 390/1024/1440 → exit 0:
  - Footer: `footerClipped:false, footerInView:true` at all widths. At 390 it wraps to two lines with the full "…not affiliated with Slite".
  - Top bar at 390: the mark is visible. The badge is not clipped and reads Idle / Saved / Paused / AI off. aria-label is complete ("AI mode: Saved AI response", "AI mode: Live AI paused, showing saved responses", "AI mode: AI unavailable"). At 1024/1440 the badge shows full text. No horizontal scroll.
  - AI-unavailable banner: "Sending will be refused until this draft can be checked. Retry, or rewrite it without the policy claim. Not counted as an intercept."
  - Toast: top 60px (under the 48px header), does not overlap Check answer or Send, lasts ~4.0s.

## Findings
- [severity: minor] components/panel/DecisionBanner.tsx:74 · the AI-unavailable banner now says "Retry, or rewrite it without the policy claim." twice (the engine headline already ends with that sentence) · suggest dropping it from the meta line. Copy only.
- [severity: minor] 390px · with the bottom sheet open at its first detent, it covers the composer's Check answer and Send, so the user must close it (× or Esc) to recheck. This matches DESIGN.md §3 (sheet over the thread). Noted for Phase 4 phone smoke-testing only.

All six previous findings are verified fixed:
1. Footer wraps at 390.
2. Top bar keeps the mark and shows a readable short badge.
3. Banner copy matches behaviour.
4. Governing evidence row comes first.
5. Toast moved and shortened.
6. No stray servers; the e2e built fresh.

## VERDICT: APPROVED
