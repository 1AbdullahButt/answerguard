# QA findings · Phase 5 (Design v2) · 2026-10-30T21:08:41Z

## Commands run
- `git worktree list` → `D:/Project/slite 250e6d1 [main]` (only). Locked paths `tests/`, `data/seed/`, SPEC.md and IMPLEMENTATION_BRIEF.md are unchanged in `git status`. `.loop/locked` currently has `e2e/` commented out (temporary unlock).
- `pnpm typecheck` → exit 0
- `pnpm test` → exit 0 · `Test Files 12 passed (12)` · `Tests 105 passed (105)`
- `pnpm eval --saved` → exit 0 · `Decision accuracy: 100.0% (12/12)` · `Gate … PASS`; evals/ unchanged.
- `pnpm exec playwright test` → `1 passed (23.4s)`. Re-run with `CI=1` (no reuse; fresh `pnpm build`; .next/BUILD_ID written 11 s before the run ended) → exit 0, `ok 1 … wrong draft → Send → held → Use this reply → Send → sent → Demo menu shows 1 stopped`, `1 passed (22.4s)`.
- `pnpm exec tsx scripts/ui-audit.ts --serve` → exit 0 · 10 v2 states (empty, held, why, trace, docs, double-check, ask-first, not-sent, sent, demo-menu) × 1440/1024/390, all "axe: none" · `Serious/critical axe violations: 0. Horizontal page scroll: none. States that failed to reach: none.` Its server was gone afterwards.
- AA contrast, recomputed by QA from styles/tokens.css with the WCAG formula. All AA:
  - outcome text on its own background: Good 5.67, Double-check 7.32, Hold 7.33, Ask first 5.98;
  - outcome word in the white pill: 6.35 / 8.06 / 8.35 / 6.66;
  - headline ink on Hold 11.76; sentence on Double-check 9.02; muted on soft 5.56;
  - Hold tag on the ink row 6.32; amber tag 6.11; disabled button 4.67.
  - These match DESIGN-NOTES.md. axe color-contrast is clean in every state at every width.
- QA v2 driver (scratchpad v2.cjs, own saved-mode server :3200, fresh build). Key output:
  - **Header:** "AnswerGuard | Concept for Slite Agent | Demo menu | Guided tour". No "Check answer" button, no Ctrl+Enter hint. Tabs = Check, Docs.
  - **Checking** (send delayed 1.8 s): "Reading your reply (done) | Reading 4 docs (done) | Applying the rules (in progress)".
  - **409:** API HOLD/CONTRADICTS_GOVERNING, V = 1 business day.
    - UI: "Hold | Don't send this yet | Instant transfers now reverse in 1 business day. Your reply says 4."
    - The held `status` is shown, "Send (held)" is disabled, and the Suggested reply equals the API's `suggestion.text`.
    - Engine/reason codes in the whole DOM: `[]`.
  - **Why:**
    - title "Why it's on hold"; 1 · "4 business days";
    - 2 · DOC-103 with the API's governing quote and the highlight, "Verified Oct 26" and "Replaces Outgoing Transfers: Reversal SOP for instant", DOC-101 "Replaced", "2 sources didn't count";
    - 3 · So; "AI read the docs. Fixed rules made the call."; codes `[]`.
  - **Trace:**
    - UI rule order `D0a,S,D0,D1…D11b,Overall` == API order (true), and the D5 detail is verbatim from the API.
    - Head: "HOLD | AI extracted: 5 claims | Rules decided | groq · gpt-oss-120b · saved response | CONTRADICTS_GOVERNING".
    - Raw JSON == the API result (deep-equal true).
  - **Use this reply** puts "We'll reverse failed transfers within 1 business day." in the composer and enables Send. 200 → "Sent · checked by Slite Agent"; payoff "Ayesha got the right answer | The 4-business-day reply never reached Ayesha." with "Wrong replies stopped today 1".
  - **Demo menu** (dialog "Demo menu", focus on its title):
    - radiogroup "Viewing as"; Replies checked = 2; Wrong ones stopped = 1; False alarms "–" (need 3 reviews);
    - "AI mode: Saved AI response · groq · gpt-oss-120b"; Review flagged replies (1); Start guided tour; Reset demo; How it works.
    - axe none. Esc closes it and focus returns to the trigger.
  - **Variants** (exact bodies):
    - B1 Save and verify → HOLD, "Instant transfers now reverse in 2 business days. Your reply says 4."
    - B2 → CAUTION, "Double-check | Right today, changing soon | …a change to 1 business day is pending sign-off."
    - B3 → ESCALATE, "Ask first | Your docs disagree | Outgoing Transfers: Reversal SOP says 4 business days and Instant Rail: Reversal Exception says 1 business day, and no rule picks a winner."
    - B7 Save and re-check → CAUTION/WEAK_BASIS, "Double-check | The doc behind this changed | …is edited after verification, so it's trusted less." Codes in the DOM: `[]`.
  - **428:** the ack checkbox is shown and "Send anyway" stays disabled until it is ticked; once ticked → 200 sent. A fresh Send of the Caution draft → http 428, with the ack and "Send anyway" visible.
  - **503** (arbitrary draft in saved mode): "Couldn't check | Not sent, nothing was lost | The AI didn't answer…" plus "Try again"; Wrong ones stopped stays 0.
  - TCK-9002 → 409, "Ask first | Depends on the transfer", holding reply, buttons "Use holding reply / Why?". TCK-9003 → 200, sent ("Sent to Hina").
  - **Persona:** Support agent has 0 DOC-105 / "Fraud Hold" hits in the DOM (Check, Docs, menu open). Ops lead's Docs show "Fraud Hold". After switching back, 0 again.
  - **Responsive:**
    - 1100: three columns, agent card static.
    - 1099/1024/700: the left column becomes a 534–609 px switcher row and the agent card is a fixed slide-over (420 px) that opens on Send.
    - 699/390: conversation pills, the agent card as a bottom sheet (0,354 390×450 at 390), the header reads "Demo menu" visually as "Demo", and the Guided tour pill is hidden.
    - The footer is full and unclipped at every width; no horizontal scroll anywhere. axe at 1024/390 with the held state: none.
    - At 1024 and 390, "Use this reply" → Send visible → sent.
  - **Console:** only the browser's resource lines for the deliberate 409s.
- QA tour driver (v2tour.cjs), 1440 and 390 (started from the Demo menu on phones). No auto-offer under webdriver.
  - S1 "Send runs the check": 0 sends until "Press Send for me" is pressed → 1 send, Hold.
  - S2 "Why it's on hold".
  - S3 "Use this reply and send it" → send 2, sent.
  - S4 "Ask first: no guessing": "Press Send for me" → Ask first.
  - S5 "Live proof: edit a doc": "Apply the edit (2 business days)" → 0 extra sends, 2 checks, Double-check "The doc behind this changed".
  - The card stays in view and axe is clean at every step. Finish returns focus to the trigger. Esc in the Demo menu closes only the menu; a second Esc closes the tour.
- `/how-it-works` (curl 200, 37 KB):
  - links only to `/` and `https://answerguard.vercel.app`; no github.com or 1AbdullahButt;
  - no key prefixes, no local paths; `.env.local` appears only in the README's own `cp .env.example .env.local` instruction; full footer present.
  - `grep -rn github.com|1AbdullahButt app components lib README.md` finds nothing.
- **Side by side.** QA rendered all 9 artboards from design/v2/*.dc.html at their canvas sizes and compared them with its own app screenshots. Montages: v2shots/sbs-A.png (Why, Trace), sbs-B.png (Checking, Docs), sbs-phone.png, plus AB-Main vs held-1440, AB-Mobile vs held-390, AB-Sent vs sent-1440, AB-States vs the four outcome screens, AB-DemoMenu vs demomenu-1440/390.
  - Layout, spacing, radii, colours, type hierarchy and copy match.
  - Differences seen: the trace shows the engine's real details (longer than the artboard's paraphrase, as item 3 requires); the suggested reply text comes from the saved AI response; the phone sheet also carries the tabs and the suggested reply; the phone footer uses the full disclaimer (item 9 overrides the artboard's short version).

## E2E review (old vs new)
Every v1 guarantee is kept, and several are stronger.
- **Server recheck blocks the wrong draft (409/HOLD).** Old: alert "Send blocked". New: the Decision region contains "Hold", the held `status` "Held by Slite Agent" is visible, and "Send (held)" is disabled. The decision only appears after `/api/send` returns, because Send is the check.
- **Not sent.** Kept: the composer still equals WRONG_DRAFT. New: also asserts 0 "Sent · checked by Slite Agent" statuses.
- **Safe reply sends.** Kept: "Use this reply" → composer contains "1 business day". New: also asserts Send is re-enabled, then the sent `status` appears.
- **Exactly one intercept.** Kept: same `(^|\D)1(\D|$)` regex on the group "Wrong ones stopped" inside the dialog "Demo menu" (UI-CONTRACT v2: the group holds only its value).
- **Footer.** Kept.
- **Selectors:** all role and accessible-name, matching design/v2/UI-CONTRACT.md (navigation "Conversations", textbox "Your reply", button "Send"/"Send (held)", region "Decision", status texts, button "Use this reply", button and dialog "Demo menu", group "Wrong ones stopped", contentinfo).
- **Nothing weakened.** Neither version asserts the HTTP status directly, but the intercept count is only incremented on a 409, so it remains a server-backed signal.
- **Approved for re-lock:** restore `e2e/` in `.loop/locked`.

## D-027 deviations: judgement
- No Send inside the Good-to-send card: **accept.** A second "Send" would break the contract's exact name, and an ALLOW send goes out straight from the composer ("Sent to Hina").
- "Your docs disagree" for B3 and reason-line headlines for other Caution codes: **accept.** "Depends on the transfer" would be false when the rail is known, and the sentences are generated from the result.
- Doc settings (SPEC §9 toggles) and flag review in the Demo menu: **accept.** They are required by SPEC §9/§11 and kept out of the way.
- "Demo" on phones: **accept.** It matches the Mobile artboard, and the accessible name stays "Demo menu".
- Composer border at 1.28:1: **accept for now (minor below).** It is the artboard value, and the field is identified by its placeholder text (5.96:1), the adjacent round Send button and an ink border on focus.

## Findings
- [severity: minor] components/shell/DemoMenu.tsx:129-137 · the approved DemoMenu artboard drops parts of SPEC §11: the one-line definition of each metric, "Show n" when n < 3 (the tile reads "– / need 3 reviews"), and the "Simulated · this browser" / "not measured Slite results" wording. The current wording is "Impact · this session" and "Simulated in your browser, not real Slite data". Since Abdullah approved the artboard this is acceptable, but D-026/D-027 don't record it as a §11 amendment. Add one line to DECISIONS (or show `n = x reviewed` under the tile and a short definition tooltip).
- [severity: minor] components/agent/TraceView.tsx · SPEC §7 items now visible only in Raw JSON: rejected extractions (§7.5), prompt version, and each evidence row's standing rule and relation. Passed rules carry no "passed" marker (§7.3); fired, failed and skipped are marked. The redesign brief scopes Trace this way. Suggest a "Rejected extractions: N" chip when the list is non-empty, so a rejected quote is visible without opening the JSON.
- [severity: minor] README.md:43 says "Every rule writes a trace entry that the Reasoning tab shows" (now the Trace view). docs/demo.gif still shows the v1 UI, and `/how-it-works` renders the GIF as the text "[Image: …]". Update the README line and re-record the GIF before the Phase 5 deploy.
- [severity: minor] DemoMenu "How it works · GitHub" (artboard copy) opens the internal /how-it-works page, not GitHub. Consider "How it works" while the repo is private.
- [severity: minor] 390 px · while the bottom sheet is open, its scrim covers the header, so the "Demo" button can't be clicked until the sheet is closed (×). Keyboard users can still Tab to it. Consider starting the scrim below the header, as in the Mobile artboard.
- [severity: minor] composer border `#E8E3DB` on white is 1.28:1 (WCAG 1.4.11 asks 3:1 for the boundary of an input). Mitigated as described above; consider `#8B9099` (3.21:1, already used for the switch track) if Abdullah agrees to deviate from the artboard.
- [severity: minor] process · `.loop/locked` still has `e2e/` commented out. Re-lock as part of the gate, now that the e2e is approved.

## VERDICT: APPROVED
