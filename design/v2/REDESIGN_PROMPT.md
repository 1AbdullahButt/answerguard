# Claude Code prompt: restyle AnswerGuard to design v2

Paste everything below the line into the slite session.

---

Abdullah has approved a full visual redesign. The UI is too complicated: too much happens at once. Restyle and simplify the app to match **design v2**. The rules engine, AI pipeline, API and engine tests stay exactly as they are.

## Source of truth
- `design/v2/*.dc.html`: 9 approved artboards, plus `design/v2/canvas.json` for their order and titles. Read every file.
- These are Claude Design canvas files. The visual markup is plain HTML with inline styles: follow the layout, spacing, colours, copy and hierarchy exactly, and ignore the `<x-dc>`/`<helmet>` wrappers and the DCLogic script.
- The live canvas is also at https://claude.ai/artifact/KoctDgDrhFHyphQLWpPva3. If your Claude Design MCP can read it, use it to cross-check; the files in `design/v2/` are the source of truth either way.
- Artboard map: Main (agent presses Send → held), Checking (progress + AI unavailable), Why (plain explanation), Trace (full rule trace), Docs (edit + re-check), States (4 outcomes), Sent (payoff), Mobile (phone), DemoMenu (roles, impact, tour, reset).

## Design tokens (v2)
- Background `#FDF9F4`. Cards `#FFFFFF`, radius 24px, shadow `0 1px 2px rgba(45,47,52,.06)`. Soft surfaces `#F6F7F9`. Chat bubbles `#F6F2EC`.
- Text: `#3F434A` (body), `#2D2F34` (headings, primary buttons), `#5E646E` (muted).
- Accent `#F67748`: the AnswerGuard mark only. Never on text, and never as a status colour.
- Font: Figtree (self-host through `next/font/google`, weights 400/500/600/700). Use JetBrains Mono only for rule IDs in the trace.
- Buttons are pills (radius 999px): primary filled `#2D2F34`, secondary with a 1.5px `#2D2F34` outline. Height 44–50px.
- Outcome colours (background / text): Good to send `#ECF4ED` / `#2E6B45`; Double-check `#FEF3DC` / `#6B4A00`; Hold `#FCEDEA` / `#8F2A1C`; Ask first `#F2F2FA` / `#4552B8`. Every outcome is shown as a word in a white pill tag; colour never carries the meaning alone.
- Tags: Verified `#ECF4ED` / `#2E6B45`, Proposal `#F2F2FA` / `#4552B8`, Outdated or Edited `#FEDC9B` / `#6B4A00`.

## Behaviour and layout changes (implement all of them)
1. **Send runs the check.** Remove the separate "Check answer" button and the Ctrl+Enter hint. On Send, the server check runs, using the existing `/api/send` integrity path:
   - Good to send (ALLOW): the reply sends.
   - Hold or Ask first (HOLD/ESCALATE): the reply is held, the composer shows the "Held by Slite Agent" tag, and the send button is greyed out.
   - Double-check (CAUTION): the panel shows the checkbox "I've checked and want to send it", plus a "Send anyway" button.
   - AI unavailable: the "Couldn't check: not sent, nothing was lost" card with "Try again".
   - Keep the existing rule that a held send counts as an intercept.
2. **Layout:** three rounded cards.
   - Left: the customer card (big name, ticket ID, rail pill dropdown, amount) and the Conversations list (active item black, with the outcome tag).
   - Middle: the chat card (big bold title "Failed transfer", bubbles, a pill composer with a round send button).
   - Right: the Slite Agent card.
   - The ticket metadata row (transfer ID, channel, created, assignee) is gone.
3. **The Slite Agent card has 2 tabs:** Check and Docs. Reasoning and Impact are no longer tabs.
   - **Check:** the outcome card (tag + bold headline + one sentence), the suggested reply with the "Checked against your docs" tag, and two buttons, "Use this reply" and "Why?". No reason codes, AI/Rule chips, source lists or draft-vs-policy rows on this view.
   - **Why?** replaces the Check tab's content (with a back button), as in the Why artboard: 1 · Your reply says, 2 · Your docs say (the governing source with its highlighted quote and tags, the replaced source, "N sources didn't count" collapsed), 3 · So. Then "AI read the docs. Fixed rules made the call." and a link to the trace.
   - **Trace:** the full rule trace from the existing engine output, as in the Trace artboard: the fired rule highlighted, AI/rule/model chips, Raw JSON, Open the docs. All content comes from the real `CheckResult` trace; nothing is hard-coded.
   - **Docs:** as in the Docs artboard. Rename the buttons to "Save and re-check" (primary, which is the old Save draft and keeps its weakener behaviour) and "Save and verify (simulated)".
4. **Checking state:** three steps with progress (Reading your reply → Reading N docs → Applying the rules), as in the Checking artboard.
5. **Sent payoff:** after a successful send that followed a held draft, show the Sent artboard's card ("<Name> got the right answer" / "The 4-day reply never reached her.", written from the real values) and the "Wrong replies stopped today" count.
6. **The header** has only the AnswerGuard mark and name, the "Concept for Slite Agent" tag, a "Demo menu" pill and a "Guided tour" pill. The persona switch, Reset, the AI mode badge and Impact all move into the **Demo menu** popover (DemoMenu artboard). The AI mode badge goes inside the menu, under the Impact numbers, as one line.
7. **Plain-language outcome names** in the UI: ALLOW → "Good to send", CAUTION → "Double-check", HOLD → "Hold", ESCALATE → "Ask first". Engine names appear only in the Trace and Raw JSON. Headlines:
   - "Your reply is right"
   - "Right today, changing soon" or the existing reason line
   - "Don't send this yet"
   - "Depends on the transfer"
   - AI unavailable: "Not sent, nothing was lost"

   Each is followed by one generated sentence from the real result.
8. **Phone (under 700px):** the dark title card, the chat, and the verdict in a bottom sheet, as in the Mobile artboard. **Under 1100px:** the left column collapses into a conversation switcher, and the agent card becomes a slide-over.
9. **Footer** everywhere: "Independent concept for Slite Agent · synthetic data · not affiliated with Slite". No Slite logo, wordmark or hand icon.
10. **Guided tour:** keep the 5 steps, but update the copy and targets to the new flow (Send is now the check).

## Tests and locks
- `tests/`, `SPEC.md`, `IMPLEMENTATION_BRIEF.md` and `data/seed/` stay locked and must not change. All engine and route tests must still pass.
- **`e2e/` is unlocked for this task only, with Abdullah's approval.** The UI flow changed (Send runs the check), so the tester rewrites `e2e/demo.spec.ts` to cover the same journey: wrong draft → Send → held (counts as an intercept) → Use this reply → Send → sent → Demo menu Impact shows 1 stopped. Use role/label selectors. QA reviews the new test against the old one, to confirm it covers the same guarantees. Then it is re-locked: add `e2e/` back to `.loop/locked`.
- Rerun the accessibility audit at 1440, 1024 and 390px: no serious or critical issues, no horizontal scroll, AA contrast (check the outcome text colours on their backgrounds).
- Record "Design v2 restyle" in DECISIONS.md: Send-runs-check, 2 tabs, plain outcome names, and the e2e unlock with the reason.

## Process
Run it as a new mini-phase, **Phase 5: Design v2**, with the same loop (builder → tester → QA → fix) and a gate in PROGRESS.md.

**Gate evidence:**
- typecheck, the full test suite, the rewritten e2e test and the axe audit all passing
- screenshots of each v2 state at 1440 and 390px, compared side by side with the artboards by QA

Then deploy to Vercel production, smoke-test the live URL (desktop and phone), commit "Phase 5: gate passed" and push. No worktrees.
