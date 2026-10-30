# Waiting for Abdullah: Phase 3 design mockup approval

Phases 0–2 have passed and been pushed (see PROGRESS.md). Per the plan, no UI is built until you approve the mockups.

## Please review
- `design/mockup-hold.html`: TCK-9001 on the Check tab: HOLD banner, rechecked safe reply, send blocked inline. Below the fold:
  every required state (no draft, checking, AI unavailable, Live AI paused, invalid AI output, ESCALATE blocked send,
  CAUTION acknowledgement, slide-over and bottom-sheet layouts).
- `design/mockup-reasoning.html`: claim card, evidence rows with highlighted quotes and signal chips, the "AI extracted" vs
  "Rule" labels, the rule trace with D5 fired, a rejected extraction, AI run info and raw JSON.
- `design/mockup-sources.html`: editing DOC-103, with **Save draft** (primary) vs **Save and verify (simulated)**, both results,
  the persona tooltip and the Reset confirm.
- `design/DESIGN.md`: tokens, contrast table, layout grid, every component and state, accessibility notes.
- Screenshots: `design/screenshot-{hold,reasoning,sources}.png`.

The accent is petrol `#0B6E8A`, used only for things you can act on; it never marks a status. Status colours always come
with an icon and a label. There is no Slite logo, wordmark or hand icon.

## Decisions I'll take unless you say otherwise
1. The illustrative rejected-extraction row is kept only in the mockup. The live Reasoning tab shows real data ("None" on the canonical run).
2. The AI run block shows the real provider and model (`groq / openai/gpt-oss-120b`, or Gemini when the fallback answers).
3. A safe reply that rechecks CAUTION shows "Rechecked · Caution" with the reason. For example, B1's 2-day reply is CAUTION
   because the Slack proposal still signals 1 day.
4. Changing the Rail marks the result as stale and asks for a recheck, rather than rerunning automatically (this saves live AI calls).

## What I need from you
Reply **"approved"** (optionally with changes) and I'll build Phase 3 from these mockups.
