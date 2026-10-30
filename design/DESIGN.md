# AnswerGuard: Design spec (Phase 3)

Independent concept for Slite Agent · synthetic data · not affiliated with Slite.

This file is the build contract for the UI. SPEC.md wins if they disagree. Three static mockups go with it:

| File | Shows | Below the fold |
|---|---|---|
| `mockup-hold.html` | TCK-9001, Check tab, HOLD banner, safe reply "Rechecked ✓ Allow", send blocked inline in the composer | Every required state (no draft, checking, AI unavailable, Live AI paused, invalid AI output, blocked Escalate send, Caution acknowledgement, Escalate, Allow, slide-over, bottom sheet, status system) |
| `mockup-reasoning.html` | Reasoning tab: claim card, evidence (governing row expanded), start of the rule trace | The whole tab at full length (all rows open, D5 fired with its 4 numbered conditions, rejected extraction, AI run), label legend, trace outcomes, Raw JSON, extraction gap, Ops-lead DOC-105, D1 |
| `mockup-sources.html` | Sources tab editing DOC-103 (1 → 2 business days), sticky action bar: **Save draft** (primary) and **Save and verify (simulated)**, with the owner/admin note | Result after Save draft (B7 → CAUTION/WEAK_BASIS), after Save and verify (B1 → HOLD, suggestion says 2), persona tooltip, row states, Reset confirm |

`screenshot-*.png` are 1440×900 Playwright captures of the three mockups.

**Where the copy comes from.** The HOLD, ESCALATE (TCK-9002), ALLOW (TCK-9003), B1 and B7 headlines, trace details, standing rules and the safe-reply text are **real `runCheck` output**. I ran the engine with the hand-written extraction fixtures in `tests/fixtures/extractions` because `AI_MODE=saved` returned `AI_UNAVAILABLE`: the `data/ai-cache` is not recorded yet. That `AI_UNAVAILABLE` result supplies the AI-unavailable frame's headline. Model `openai/gpt-oss-120b` and prompt `2026-10-30.1` come from the runtime (DECISIONS D-013). Copy marked *illustrative* (the rejected extraction, the invalid-output frame) is mine and follows the engine's patterns.

---

## 1. Principles

1. **The decision first, then why.** Banner → safe reply → evidence. An agent should be able to act from the first 200 px of the panel.
2. **Status is never colour alone.** Each status has an icon, a label and a colour. The icons have different shapes: check, triangle, octagon, arrow.
3. **Show who did what.** "AI extracted" and "Rule" look different in fill, border, icon and word.
4. **Calm and compact.** Neutral surfaces, 13–14 px type, one accent, and motion only where it explains something.
5. **Honest.** The AI mode is always visible, the disclaimer footer is on every screen, and the persona switch says it is not security.

## 2. Tokens

Use these as CSS variables in `styles/tokens.css`. The mockups' `:root` is the reference implementation.

### 2.1 Colour

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F7F7F5` | App background, ticket list |
| `--surface` | `#FFFFFF` | Cards, thread, panel chrome |
| `--surface-2` | `#FBFBFA` | Panel body, message area, subtle wells |
| `--surface-3` | `#F2F2F0` | Hover, neutral tags, disabled fills |
| `--border` | `#E8E8E6` | All hairlines |
| `--border-strong` | `#D6D6D2` | Inputs, buttons, composer |
| `--text` | `#1F1F1F` | Body text, ink fills (Rule label, fired trace chip, "Governs") |
| `--muted` | `#6B6B6B` | Secondary text. **The lightest colour allowed for text.** |
| `--faint` | `#8A8A86` | Icons, skipped trace rows (non-essential), placeholder glyphs only |
| `--accent` | `#0B6E8A` | See 2.2 |
| `--accent-hover` | `#095B72` | Primary hover |
| `--accent-soft` | `#E7F2F5` | Editor focus halo, "unsaved" chip |
| `--quote` / `--quote-bd` | `#FFF1B8` / `#F0DC85` | Verbatim quote highlights. Yellow means a verbatim quote and nothing else. |

Status (foreground / tint / border):

| Status | Icon (lucide) | fg | bg | border |
|---|---|---|---|---|
| ALLOW | `circle-check` | `#17743A` | `#EAF6ED` | `#BFE2C9` |
| CAUTION | `triangle-alert` | text `#8A5300`, icon `#9A6200` | `#FFF5DB` | `#F1D798` |
| HOLD | `octagon-alert` | `#B42318` | `#FDEDEB` | `#F4C4BE` |
| ESCALATE | `circle-arrow-up` | `#4338CA` | `#EEEFFC` | `#C9CCF5` |
| AI unavailable | `cloud-off` | `#1F1F1F` | `#F2F2F0` | `#D6D6D2` |

### 2.2 The accent: petrol `#0B6E8A`

There is one accent and it means **"you can act here"**: primary buttons (Check answer, Use safe reply, Save draft, Retry), the active tab underline, the selected-ticket bar, links, toggles, checkboxes and the focus ring. It never marks a status, and it never marks AI output.

Why petrol:
- **Its hue is separate from all four status hues.** It sits at about 193°. Green is about 140°, amber about 40°, red about 4° and indigo about 245°. A blue accent would blur into ESCALATE indigo, and a teal-green one into ALLOW.
- **It is calm and slightly desaturated**, so it fits Slite-style neutrals without copying Slite's brand colour, and it reads as a tool rather than a marketing page.
- **It passes AA as text and as a fill with white text** (5.81:1), so one token works for links, buttons and the focus ring.

### 2.3 Contrast (WCAG 2.1, computed with the relative-luminance formula)

| Pair | Ratio | Pass |
|---|---|---|
| text `#1F1F1F` on white / on `#F7F7F5` | 16.48 / 15.37 | AAA |
| muted `#6B6B6B` on white / `#F7F7F5` / `#FBFBFA` / `#F2F2F0` | 5.33 / 4.97 / 5.15 / 4.75 | AA |
| accent `#0B6E8A` on white / `#F7F7F5` / accent-soft | 5.81 / 5.42 / 5.10 | AA |
| white on accent / on accent-hover | 5.81 / 7.63 | AA / AAA |
| ALLOW `#17743A` on tint / on white | 5.26 / 5.84 | AA |
| CAUTION text `#8A5300` on tint / on white | 5.83 / 6.33 | AA |
| CAUTION icon `#9A6200` on tint (non-text, ≥3:1) | 4.69 | AA |
| HOLD `#B42318` on tint / on white | 5.79 / 6.57 | AA |
| ESCALATE `#4338CA` on tint / on white | 6.92 / 7.90 | AA / AAA |
| text on quote yellow `#FFF1B8` / muted on quote | 14.54 / 4.70 | AAA / AA |
| white on ink (Rule label, fired chip) | 16.48 | AAA |
| faint `#8A8A86` on white | 3.47 | **icons and decorative text only, never body text** |

I first tried `#1A7F37` for ALLOW. On its tint it scored only 4.57:1, too close to the line, so I darkened it to `#17743A`.

### 2.4 Type

- Stack: `"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. Self-host Inter with `next/font` in the app. The mockups use the fallback stack only, with no external requests.
- Mono: `ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace`. Use it for IDs, reason codes, hashes and JSON only.
- Sizes: 11 px (footer, uppercase section labels with +0.04em tracking), 11.5–12 px (meta, chips), **13 px (UI default)**, 13.5–14 px (message text, draft, safe reply, banner headline), 15 px (banner label, thread title). Weights: 400, 550 (buttons, tabs), 600–650 (titles), 700 (banner label).
- Line height: 1.5 for UI, 1.55 for reading text.

### 2.5 Space, radius, elevation

- Spacing scale: 4 · 8 · 12 · 16 · 20 · 24 · 32. Panel body padding is 14/16 px, and the gap between cards is 12 px.
- Radii: 4 (chips, tags, labels), 6 (buttons, inputs, quote wells), 8 (cards, composer, banner), 12 (modals, sheet top), full (status pills, badges).
- Shadows: `--shadow-1` for cards, `--shadow-2` for the editor and gallery, `--shadow-3` for overlays (tooltip, slide-over, sheet, confirm).
- Heights: top bar 48, panel header 48, tabs 40, buttons 30 (26 small), panel footer 34.

### 2.6 Motion

- Panel transitions: slide-over and sheet use 200 ms `cubic-bezier(.2,.8,.2,1)`, and the scrim fades in 150 ms.
- Skeleton shimmer while checking runs at 1.2 s linear.
- When an edit changes the outcome, the result card animates **once**: the old status pill fades to 55% and slides, then the new banner fades in over 250 ms.
- `prefers-reduced-motion`: no slides or shimmer. Use opacity only.

## 3. Layout grid

| Breakpoint | Layout |
|---|---|
| **≥ 1100 px** | Top bar 48 px. Below it, 3 columns: ticket list **272 px** · thread **flex** (min 0) · side panel **400 px**, each scrolling independently. |
| **< 1100 px** | Ticket list and thread only. The panel becomes a **400 px slide-over** from the right over a 28% scrim. It opens on Check answer, Ctrl/⌘+Enter, or the "AnswerGuard" shield button added to the composer footer. Esc or a scrim click closes it. Focus is trapped while it is open and returns to the trigger. Below 900 px the ticket list collapses to a 64 px avatar rail. |
| **< 700 px** | Single column. The ticket list is its own screen. The panel is a **bottom sheet** with detents at 62% (banner and safe reply) and 100%, plus a drag handle and a close button. Tabs become a horizontally scrollable row. The composer stays pinned above the keyboard. |

The panel looks like a browser extension but is a normal component (`SidePanel`) placed in the grid.

## 4. Components and states

Names follow IMPLEMENTATION_BRIEF §3.

### Shell
- **TopBar**: the brand mark is an *own* shield-check glyph in an accent square (not Slite's hand). Then "AnswerGuard · independent concept for Slite Agent", RoleSwitch, Reset workspace (ghost) and AiModeBadge.
- **RoleSwitch**: a segmented control (Support agent | Ops lead) with an info button. Its tooltip, shown on hover or focus, reads exactly: "Simulated personas. Anyone can switch. DOC-105 is synthetic. Never use this design with real restricted data." Switching reruns the check.
- **AiModeBadge**: a pill with a dot. The states:
  - `Live AI` (green dot)
  - `Saved AI response` (grey dot)
  - `Live AI paused · showing saved responses` (amber tint and pause icon, when `ai.paused`)
  - `AI unavailable` (red dot)

  The badge tells the truth about the last check and never shows what was configured instead.

### Inbox
- **TicketList**: rows show avatar, name, time, a one-line preview, the ticket ID in mono, a rail tag, and the last check's status pill if one exists. The selected row has a white card and a 3 px accent bar. Arrow keys move between rows and Enter opens one.
- **Thread**: a header with the name, ID and topic tag, then an attributes row (Rail · Transfer · Channel · Created · Assignee), then the messages on `--surface-2`.
- **RailSelect**: a native `<select>` styled as a 26 px select with three options: Instant, Standard, Unknown. Changing it marks the current result **stale**: the banner dims and shows a "Rail changed. Recheck" link. It does not rerun automatically.
- **Composer**: Reply/Note tabs, the draft text and a footer with the hint `Ctrl / ⌘ + Enter to check`, **Check answer** (primary) and **Send** (secondary). After a check, the claim span gets a wavy underline in the decision colour.

  Composer states:
  - *Empty*: Check answer disabled. The panel shows the no-draft state.
  - *Edited after check*: the underline is removed and the panel banner shows "Draft changed since this check".
  - *Blocked (HOLD/ESCALATE, 409)*: an inline `role="alert"` bar in the status tint: "Send blocked · Hold. The server rechecked this exact draft…" with "Recorded as an intercept." and a Use safe reply / Use holding reply button. Send is disabled with a lock icon.
  - *CAUTION*: an acknowledgement checkbox row: "I've checked this against the source and want to send it anyway." Send reads "Send with caution" and stays disabled until the box is checked.
  - *AI_UNAVAILABLE (503)*: a neutral bar: "Not sent. AnswerGuard couldn't check this draft. Retry, or remove the policy claim." It is not counted as an intercept.
  - *Sent*: a toast, "Sent to Ayesha K.", and the message appears in the thread.

### Panel
- **SidePanel**: a 48 px header (mark + "Slite Agent · AnswerGuard", Recheck and Collapse icon buttons), tabs **Check · Reasoning · Sources · Impact** (`role=tablist`, arrow keys to move), a scrolling body on `--surface-2`, an optional sticky action bar (Sources editor), and the footer **"Independent concept for Slite Agent · synthetic data · not affiliated with Slite"**. The footer never scrolls away.
- **CheckTab**, top to bottom: DecisionBanner → "Your draft" card (span highlighted, Draft says vs Policy says (V)) → SafeReplyCard → Sources weighed (one row per source with its standing) → AI run line.
- **DecisionBanner**: a white card with the status tint across its top 44 px, a 20 px icon, the label ("Hold" + "· don't send this draft"), the reason code in mono on the right, the headline (`CheckResult.headline`, verbatim), and a meta row (claims · sources · governing rule · "Why ›", which opens Reasoning). Variants: allow, caution, hold, esc, off (AI unavailable).
- **SafeReplyCard**: the header "Safe reply" (or "Holding reply" for ESCALATE) with the **Rechecked ✓ {decision}** chip in that decision's colours. Then the text, the cited quote in yellow with the source line under it (title · ID · verified date · owner), and the actions **Use safe reply** (primary, puts the text in the composer) and Copy. The origin shows as "Template" or "AI worded". It is hidden when `suggestion` is null. For CAUTION it is replaced by a "What to verify" list.
- **ReasoningTab**: a status summary + Raw JSON toggle, then one **ClaimCard** per claim, then Evidence, Rule trace, Rejected extractions and AI run. Multiple claims are stacked, each with "Claim n of N".
- **ClaimCard**: the draft with the span highlighted, an "AI extracted" line (value · definitive/hedged), and a "Rule" line (V, the source, the rules that fired, the reason code).
- **EvidenceRow**: collapsible. Collapsed: chevron, kind icon, title, ID · kind, relation (supports / contradicts / n/a / ignored), standing chip. Expanded adds:
  - the quote in a well with "Open in Sources ↗" (opens Sources scrolled to the highlighted quote)
  - SignalChips
  - an "AI extracted" line
  - a "Rule" line: standing with its rule ID and text (`standingRule`), applicability, relation

  The governing row has a 2 px ink left rule and is expanded by default. Excluded rows sit on `--surface-2` with a muted title. An injection line found in an excluded source is shown in mono as "data, no effect", never highlighted yellow.
- **SignalChips**: Verified {date} (badge-check, green icon) · Owner {name} · Effective {date} · {Rail} rail only / All rails · Edited after verification (amber) · Flagged outdated: "{note}" (red) · Owner inactive (amber) · Unverified · Informal · Ops only (eye-off). Weakeners are always amber. Exclusion reasons are always red.
- **Standing chips**: Governs (ink fill) · Candidate (grey) · Proposal (outline) · Not yet effective (outline + calendar icon) · Excluded (outline, struck through, muted).
- **RuleTrace**: a 3-column list (rule code in mono · outcome · detail), in engine order, with nothing hidden.
  - *passed*: muted text, green check
  - *fired*: ink chip with a zap icon, tinted row, 2 px ink left rule
  - *skipped*: faint text, minus icon
  - *fail*: red circle-x

  D5's detail is split into a numbered list on its "1) 2) 3) 4)" markers, with green numerals, one per condition. Draft-level entries (`CheckResult.trace`: D0a, Cap, Overall) render as a small "Draft" trace above the claim cards.
- **Who-did-what labels**:
  - `AI extracted`: white fill, **dashed** `#8A8A86` border, sparkles icon, dark grey text
  - `Rule`: **solid ink fill**, white text, scales icon

  They differ in fill, border, icon and word, so they survive greyscale and colour blindness, and neither uses a status hue.
- **QuoteHighlight**: `<mark>` on `--quote` with a 1 px inset border. On a source doc, the quote stays highlighted after "Open in Sources" until another doc is opened.
- **Rejected extractions**: one row each: red circle-x, source ID, reason code in mono, and a plain sentence with the snippet. If there are none: "None. Every quote matched its source verbatim."
- **AI run**: a key–value list (mode badge, model, latency with "(replayed, no model call)" in saved mode, prompt version, check hash truncated).
- **RawJson**: a toggle button (`aria-pressed`) that reveals syntax-tinted, read-only JSON in mono 11 px, plus Copy.
- **SourcesTab**: a filter field and "N visible to {persona}", then a list of sources (title, chips, Edit). Editing expands the row in place into **SourceEditor**. Hidden sources are never rendered or counted.
- **SourceEditor**:
  - a header with the title, ID · kind · owner and a "v1 → v2 · unsaved" accent chip
  - a body textarea (Inter 12.5 px; changed lines get a green gutter)
  - a one-line diff summary and a character count (`/ 4,000`)
  - metadata: Verification select, Owner active switch, Flagged outdated switch, Effective date (read-only, "from the text"), Visibility (locked, "seed only")

  The **sticky action bar** holds **Save draft** (primary), **Save and verify (simulated)** (secondary, badge icon) and Cancel. Under them:
  - an amber line explaining the weakener: "Save draft keeps the Oct 26 verification, so DOC-103 gets Edited after verification."
  - the note: "In Slite, only the doc's owner or an admin verifies. Save and verify simulates that step. Both save and rerun the check."

  Saving switches to the Check tab and plays the one-time change animation with a "Changed because DOC-103 v2 …" chip.
- **ImpactTab** (P1, not mocked): a "Simulated · this browser" label, then three stat tiles: Drafts checked, Unsafe sends intercepted, False-alarm rate with n (below n = 3 it reads "Not enough reviewed flags yet"). Each tile has a one-line definition. Then a list of past flags with **Correct catch / False alarm** segmented buttons, and the line "These are not measured Slite results."
- **Reset workspace**: a confirm dialog: "Restores all seed sources (N edited) and clears this browser's metrics. This can't be undone."

### 4.1 Required states (all in the `mockup-hold.html` gallery)

| State | Trigger | Panel | Composer |
|---|---|---|---|
| No draft | Empty composer | Pencil empty state: "Write a reply to check it" + shortcut | Check disabled |
| Checking | Request in flight | Progress steps **Reading draft → Reading 4 sources → Applying rules** (done = green check, current = accent spinner with a count, todo = dashed circle), with skeleton cards under them, `aria-live="polite"` | Check button shows a spinner. Send still works and rechecks on the server. |
| AI unavailable | `decision = AI_UNAVAILABLE` | Neutral banner with cloud-off, the headline, a note, **Retry** and **Restore seed versions**, and the line "Send is blocked until this draft is rechecked. Not counted as an intercept." | 503 bar on Send |
| Live AI paused | `ai.paused = true` | The top-bar badge changes. A dismissible amber note: limits reached, still working from saved responses | Normal |
| Invalid AI output | Source: `INVALID_OUTPUT` / `EXTRACTION_ERROR` → `SOURCE_UNREAD` cap | Caution banner + a rejected-extraction row with "Retry reading DOC-103". If it was the draft that failed, show the AI unavailable state instead. | Caution acknowledgement |
| Blocked send | 409 | Banner unchanged | Inline alert in the status tint, Send locked, safe/holding reply button |
| Caution acknowledgement | `CAUTION` | Caution banner + weakener chip | Checkbox row, "Send with caution" |
| Extraction gap | `EXTRACTION_GAP` | Caution: "AnswerGuard couldn't confirm the timing in this draft. Check it manually." Detector matches get an **amber underline** (not yellow) | Caution acknowledgement |
| No policy claim | `NO_POLICY_CLAIM` | Allow banner: "No policy claims in this reply" | Normal |
| Stale | Draft, rail or persona changed after a check | Banner at 55% opacity + "Draft changed since this check · Recheck" | Underline removed |

## 5. Accessibility

- **Focus**: every interactive element shows a 2 px accent outline, 2 px offset, plus a 4 px `rgba(11,110,138,.35)` halo (`:focus-visible`). It is visible on white, `#F7F7F5` and the tints.
- **Keyboard order**: top bar (persona, info, Reset) → ticket list → Rail select → composer (text → Check answer → Send) → panel tabs → panel body → footer. Ctrl/⌘+Enter checks from the composer. In the tablist, ←/→ move between tabs and Home/End jump to the ends. Evidence rows are `button`s with `aria-expanded`. Esc closes the slide-over, sheet, tooltip and dialog.
- **Live regions**: progress steps and the banner use `aria-live="polite"`. The blocked-send bar uses `role="alert"`.
- **Status**: an icon, a text label and colour every time. Status pills carry the text, so screen readers get "Hold" without relying on the icon. The icons are `aria-hidden`.
- **Contrast**: see 2.3. No text lighter than `--muted`.
- **Targets**: at least 26 px high in the dense panel, 30 px for primary actions. Bottom-sheet actions are 44 px.
- **Reduced motion**: respected (2.6).

## 6. CheckResult → UI map

| Field | Where |
|---|---|
| `decision`, `reasonCode`, `headline` | DecisionBanner (label, mono code, headline verbatim); the ticket list pill |
| `claims[].draftClaim.span/valueText/definitive` | Composer underline, "Your draft" card, ClaimCard AI line |
| `claims[].governing` | "Policy says (V)", SafeReplyCard citation, the "Governs" chip on the matching EvidenceRow |
| `claims[].evidence[]` | EvidenceRow: `source.signals` → SignalChips; `standing` + `standingRule` → Rule line; `weakeners` → amber chips; `applicability`, `relation` |
| `claims[].trace[]` | RuleTrace (per claim) |
| `trace[]`, `caps[]` | Draft-level trace; the cap reason shows in the banner meta |
| `patternMatches[]` | Amber underline in ClaimCard / draft (extraction gap) |
| `suggestion` | SafeReplyCard (`origin` → "Template" or "AI worded"; `recheckDecision` → the Rechecked chip) |
| `rejectedExtractions[]` | Rejected extractions list; INVALID_OUTPUT/EXTRACTION_ERROR rows get a Retry link |
| `ai` | AiModeBadge, AI run block, the paused note |

## 7. Copy rules

- Write for an agent mid-conversation. Use the headline verbatim, and never put the AI's wording in the banner.
- Never say or imply that a reversal has started or finished.
- Use "Simulated" wherever the demo pretends: personas, verification, metrics.
- No Slite logo, wordmark, hand icon, illustrations or brand colour. "Slite" appears only in "Slite Agent · AnswerGuard", "independent concept for Slite Agent" and the footer disclaimer.

## 8. Open questions for review

1. The **rejected extraction** in the Reasoning mockup is illustrative. The real canonical run has zero, so the live tab would show "None." Keep the illustrative row for the demo video or not?
2. The **AI run** block shows `openai/gpt-oss-120b` (the Groq default from D-013). SPEC §10 still says `claude-haiku-5-5`. The UI shows whatever `ai.model` returns.
3. With B1 (Save and verify, 2 days), the real engine rechecks the template suggestion as **CAUTION**, not ALLOW. That is probably because no saved extraction exists yet for the new draft text. The Sources gallery shows the suggestion without a recheck chip. Confirm after `pnpm record`.
4. The Rail change is designed as "mark stale, the user rechecks" rather than an automatic rerun, so live AI isn't called on every dropdown change.
