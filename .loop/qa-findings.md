# QA findings · Phase 4 final gate (deployed) · 2026-10-30T19:56:58Z

Target: https://answerguard.vercel.app (Vercel, CLI deploy per D-025). HEAD `3a3ff86`. `git worktree list` → `D:/Project/slite 3a3ff86 [main]` (only). No local servers were started for this review.

## Commands run
- `curl https://answerguard.vercel.app/` → 200, `Server: Vercel`.
- **Bundle secret scan.** Fetched the HTML, the 9 referenced `/_next/static` JS/CSS chunks and any chunks referenced inside them (0 extra), 664 KB in total.
  - `gsk_`, `AIza`, `GEMINI_API_KEY=`, `GROQ_API_KEY=` and `sk-ant-`: 0 hits.
  - Entropy scan of quoted literals ≥24 chars next to key/token/secret/auth, and of all ≥32-char literals with entropy >4.5: 0 candidates.
  - DOC-105 / "Fraud Hold" / "Compliance: Fraud": only the required persona tooltip sentence "DOC-105 is synthetic…".
- **Live API.**
  - `GET /api/seed?role=support_agent` → DOC-101, DOC-103, SRC-202, DOC-104; 0 DOC-105 mentions. `role=ops_lead` → includes DOC-105.
  - `POST /api/check` canonical drafts:
    - TCK-9001 → `HOLD CONTRADICTS_GOVERNING`, suggestion "…within 1 business day."
    - TCK-9002 → `ESCALATE SCOPE_UNKNOWN`, holding reply.
    - TCK-9003 → `ALLOW SUPPORTED`.
    - All three `ai.mode: saved` (groq / openai/gpt-oss-120b, prompt 2026-10-30.2), with no DOC-105 in any response.
  - One novel draft (a single live call) → `ALLOW`, `ai: {mode: live, provider: groq, latencyMs: 1014}`, 0 rejected extractions. Live AI is configured; saved responses carry the canonical path.
- **Live Playwright** (scratchpad live.cjs; all edits use the exact variant bodies, so they replay saved responses):
  - TCK-9001 Hold. Send → 409 "Send blocked · Hold … Recorded as an intercept." Use safe reply → Send → "Sent".
  - B1 Save and verify → "Hold … reverse in 2 business days", and the safe reply says 2.
  - B2 Save and verify → "Caution … a change is signalled".
  - B3 Save and verify → "Escalate … applicable sources disagree and no rule can pick a winner".
  - B7 Save draft → "Caution … probably 2 business days … verification is in doubt".
  - Caution: the acknowledgement checkbox is visible; Send is disabled until it is ticked, then sends.
  - Impact: "Simulated · this browser", the three metric groups, the definitions and "not measured Slite results". The false-alarm guard shows "Not enough reviewed flags yet" at n=1. Reset clears metrics as specified, which is why intercepts read 0 after the variant resets.
  - Persona: Ops lead sees DOC-105 in Sources. After switching back to Support agent, the DOM has 0 DOC-105 or title hits on all 4 tabs.
  - Footer at 1440, 1024 and 390, on the inbox and on all 4 tabs: "Independent concept for Slite Agent · synthetic data · not affiliated with Slite", in view and unclipped. At 390 it wraps to 2 lines.
  - axe with TCK-9002 Escalate open: none at all three widths; no horizontal scroll.
  - The 390 phone smoke test passed: the bottom sheet opens from the composer toggle, and the top bar shows the mark, persona, info, tour, reset and the "Saved" badge.
  - Guided tour, live:
    - 1440: all 5 steps (Catch → Why → Recover with blocked + sent → Ambiguity → Live proof, applied → Caution). The card stays in view; Finish returns focus to "Guided tour".
    - 1024 and 390: all 5 steps, card in view, focus returns.
    - Esc in the Reset dialog closes only the dialog (tour stays open). Esc on the persona tooltip closes only the tooltip; a second Esc closes the tour. This confirms the previous minor is fixed live.
  - Console: only the browser's resource lines for the deliberate 409s.
- **CI.** `gh run list` → latest run 41118583389 on headSha `3a3ff861…` (= HEAD) completed, success, 1m52s. The job log shows:
  - all 12 vitest files, including tests/engine t1-hold, t2-allow, t3-escalate, t4-recency, t5-permissions, t6-send-integrity, t7-injection, t8-extraction-gap and tests/ai/cache-identity: `Test Files 12 passed (12)`, `Tests 105 passed (105)`;
  - `Decision accuracy: 100.0% (12/12)`, `Gate … PASS`;
  - `✓ 1 [chromium] › e2e/demo.spec.ts:8:5 …`, `1 passed (25.5s)`.
  - The previous run (41117036374) also succeeded.
- **README** (147 lines):
  - The live URL https://answerguard.vercel.app is at line 14.
  - Line 83 contains, verbatim: "Both keys are free tier with no billing account linked, so there is nothing to spend. When the quota runs out, requests are refused (429). That's a hard stop at $0."
  - The eval table (Groq 36/36, 39/39, 180/180 PASS; Gemini 36/36, 38/38, 180/180 PASS) matches evals/results.md lines 12-14 and 35-37.
  - It covers the problem, the mermaid architecture, AI vs rules, tests, eval, limitations (including "No shared rate limiter … Upstash skipped, D-025"), "what not to claim" and docs/demo.gif (verified last review).
- **Secrets locally.** `.vercelignore` excludes `.env*` (except .env.example), `.loop/`, `.claude/`, local screenshots and demo.webm. `.gitignore` still ignores `.env*` (line 4) and `.vercel` (line 6). `git check-ignore` confirms .env.local and .vercel/project.json are ignored.

## SPEC §18 checklist
1. Public URL, no setup, saved responses keep the canonical path working: **PASS** (HOLD/ESCALATE/ALLOW in saved mode; live path proven with one call).
2. All 8 tests + e2e pass in CI; eval published in README: **PASS** (run 41118583389 at HEAD; README table = results.md).
3. The 3 dynamic-proof edits change the outcome live: **PASS** (B1 Hold at 2 days, B2 Caution, B3 Escalate, plus B7 Caution).
4. Disclaimer visible on every screen: **PASS** (1440/1024/390, all tabs).
5. README covers everything required, with a demo GIF: **PASS**. The walkthrough video link is still a placeholder (expected; Abdullah records it).

Brief Phase 4 extras: send flow (409, acknowledgement) PASS · Impact PASS · tour PASS · phone smoke test PASS · bundle secret scan PASS · persona filter live PASS · `.vercelignore` PASS.

## Findings
- [severity: minor] README.md:15 · the walkthrough video link is a placeholder ("_link added after recording._"). It is expected and not a blocker; update it when Abdullah records the video.
- [severity: minor] live 503 path · not reproduced on the live site, because doing so would mean exhausting the Groq/Gemini free-tier quota. The 503 "AI unavailable: not sent … Not counted as an intercept" UI and server path were verified locally in Phase 3 (an arbitrary draft in saved mode → 503, intercepts unchanged). Please do a live check once quota naturally runs out, or accept the local evidence.
- [severity: minor] D-025 · the shared limiter is skipped (approved). The in-memory limiter is per serverless instance, and this is documented in the README limitations. A bare non-`AIza` Gemini key value in code would not be caught by prefix; this is documented, and the env-style pattern covers the normal case.
- [severity: minor] working tree · an uncommitted `.gitignore` change removes the duplicate `.vercel` / `.env*` lines that `vercel link` appended. It is harmless (both are still ignored at lines 4 and 6, and dropping the trailing `.env*` stops it overriding `!.env.example`); commit it.
- [severity: minor] .github/workflows/ci.yml · GitHub annotations: actions/checkout@v4, setup-node@v4 and pnpm/action-setup@v4 target the deprecated Node 20 runtime, and ubuntu-latest is moving to Ubuntu 26. Not failing now; bump the actions when convenient.
- Note: the deploy is made via the CLI, so QA can't prove from GitHub that the live build is byte-for-byte HEAD. Its behaviour matches HEAD, including the Esc fix.

## VERDICT: APPROVED
