# Design v2: build notes and contrast

Companion to `REDESIGN_PROMPT.md` and the nine artboards in this folder. Built in Phase 5 (DECISIONS D-026, D-027).

## Tokens as built (`styles/tokens.css`)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FDF9F4` | Page background, suggested-reply well, Docs editor |
| `--card` | `#FFFFFF` | The three cards, radius 24px, shadow `0 1px 2px rgba(45,47,52,.06)` |
| `--soft` | `#F6F7F9` | Soft surfaces: tabs track, conversation rows, "Not sent" card |
| `--bubble` | `#F6F2EC` | Customer chat bubble |
| `--text` / `--ink` / `--muted` | `#3F434A` / `#2D2F34` / `#5E646E` | Body / headings + primary buttons / secondary text |
| `--mark` | `#F67748` | The AnswerGuard mark only, plus the in-progress arc in the Checking artboard, which uses it. Never text, never a status. |
| Outcomes (bg / text) | Good to send `#ECF4ED`/`#2E6B45` · Double-check `#FEF3DC`/`#6B4A00` · Hold `#FCEDEA`/`#8F2A1C` · Ask first `#F2F2FA`/`#4552B8` | Always a word in a white pill plus an icon; colour never carries the meaning alone |
| Tags | Verified `#ECF4ED`/`#2E6B45` · Proposal `#F2F2FA`/`#4552B8` · Outdated/Edited `#FEDC9B`/`#6B4A00` (Edited uses ink text, as in the Docs artboard) | |

Fonts: Figtree 400/500/600/700 and JetBrains Mono 400/500 (rule IDs in the trace only), both self-hosted by `next/font/google`.
Buttons are pills (radius 999px), 44–50px high: primary filled `#2D2F34`, secondary with a 1.5px `#2D2F34` outline.
Focus is a 2px ink ring with a 3px white gap (`--focus`), never the accent.

## Contrast (WCAG 2.1 relative luminance)

AA needs 4.5:1 for normal text and 3:1 for large text and meaningful non-text graphics. Every text pair below passes AA.

| Pair | Colours | Ratio |
|---|---|---|
| Body text | `#3F434A` on `#FFFFFF` | 9.94:1 |
| Body text | `#3F434A` on `#FDF9F4` | 9.48:1 |
| Body text | `#3F434A` on `#F6F7F9` | 9.27:1 |
| Body text in bubble | `#3F434A` on `#F6F2EC` | 8.91:1 |
| Headings / primary | `#2D2F34` on `#FFFFFF` | 13.39:1 |
| Headings on bg | `#2D2F34` on `#FDF9F4` | 12.78:1 |
| Muted | `#5E646E` on `#FFFFFF` | 5.96:1 |
| Muted on bg | `#5E646E` on `#FDF9F4` | 5.68:1 |
| Muted on soft | `#5E646E` on `#F6F7F9` | 5.56:1 |
| Muted on bubble | `#5E646E` on `#F6F2EC` | 5.34:1 |
| White on primary button | `#FFFFFF` on `#2D2F34` | 13.39:1 |
| Conversation subtitle on ink | `#C9CBD1` on `#2D2F34` | 8.26:1 |
| Good to send text on bg | `#2E6B45` on `#ECF4ED` | 5.67:1 |
| Double-check text on bg | `#6B4A00` on `#FEF3DC` | 7.32:1 |
| Hold text on bg | `#8F2A1C` on `#FCEDEA` | 7.33:1 |
| Ask first text on bg | `#4552B8` on `#F2F2FA` | 5.98:1 |
| Good to send word in white pill | `#2E6B45` on `#FFFFFF` | 6.35:1 |
| Double-check word in white pill | `#6B4A00` on `#FFFFFF` | 8.06:1 |
| Hold word in white pill | `#8F2A1C` on `#FFFFFF` | 8.35:1 |
| Ask first word in white pill | `#4552B8` on `#FFFFFF` | 6.66:1 |
| Headline on Good to send | `#2D2F34` on `#ECF4ED` | 11.95:1 |
| Headline on Double-check | `#2D2F34` on `#FEF3DC` | 12.16:1 |
| Headline on Hold | `#2D2F34` on `#FCEDEA` | 11.76:1 |
| Headline on Ask first | `#2D2F34` on `#F2F2FA` | 12.03:1 |
| Sentence on Good to send | `#3F434A` on `#ECF4ED` | 8.86:1 |
| Sentence on Double-check | `#3F434A` on `#FEF3DC` | 9.02:1 |
| Sentence on Hold | `#3F434A` on `#FCEDEA` | 8.73:1 |
| Sentence on Ask first | `#3F434A` on `#F2F2FA` | 8.92:1 |
| Sentence on Not sent | `#3F434A` on `#F6F7F9` | 9.27:1 |
| Tag Verified | `#2E6B45` on `#ECF4ED` | 5.67:1 |
| Tag Proposal / Concept | `#4552B8` on `#F2F2FA` | 5.98:1 |
| Tag Outdated | `#6B4A00` on `#FEDC9B` | 6.11:1 |
| Tag Edited (ink) | `#2D2F34` on `#FEDC9B` | 10.16:1 |
| Quote highlight | `#2D2F34` on `#FEDC9B` | 10.16:1 |
| Hold tag on ink row | `#8F2A1C` on `#F9D9D3` | 6.32:1 |
| Held tag (composer) | `#8F2A1C` on `#FCEDEA` | 7.33:1 |
| Sent note | `#2E6B45` on `#FFFFFF` | 6.35:1 |
| Trace fired row | `#2D2F34` on `#FEF6E7` | 12.47:1 |
| Trace fired detail | `#3F434A` on `#FEF6E7` | 9.25:1 |
| Trace rule ID | `#5E646E` on `#FFFFFF` | 5.96:1 |
| Disabled button text | `#5E646E` on `#E8E3DB` | 4.67:1 |
| Rail pill text | `#3F434A` on `#FDF9F4` | 9.48:1 |
| Phone title card meta | `#C9CBD1` on `#2D2F34` | 8.26:1 |
| Non-text: mark glyph | `#FFFFFF` on `#F67748` | 2.74:1 |
| Non-text: switch off track vs card | `#8B9099` on `#FFFFFF` | 3.21:1 |
| Non-text: composer border vs card | `#E8E3DB` on `#FFFFFF` | 1.28:1 |
| Non-text: focus ring (ink) vs bg | `#2D2F34` on `#FDF9F4` | 12.78:1 |

Notes on the non-text rows:
- **Mark glyph (2.74:1)**: the white shield on `#F67748` is decorative (`aria-hidden`); the product name "AnswerGuard" is text next to
  it, so WCAG 1.4.11 doesn't apply. It is exactly as specified.
- **Composer border (1.28:1)**: `#E8E3DB` is the artboard's value. The field is also identified by its placeholder/text and the
  adjacent round Send button, and on focus the border turns ink (12.78:1). Flagged here rather than changed, because the prompt fixes
  the colour.
- The Doc settings switch (not in the artboards) uses `#8B9099` for its off track (3.21:1), so its state is visible.

The axe audit (`pnpm exec tsx scripts/ui-audit.ts --serve`) reports 0 serious/critical issues at 1440, 1024 and 390px across the
ten v2 states (empty, held, why, trace, docs, double-check, ask-first, not-sent, sent, demo-menu).
