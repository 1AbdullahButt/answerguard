# UI contract: accessible names (shared by the builder and the e2e test)

The e2e test (`e2e/demo.spec.ts`) selects elements **only** by role and accessible name, using the names below. The builder
must render exactly these roles and names (visible text or `aria-label`). Changing one means changing the locked e2e test,
which needs a human. Text matches are case-sensitive substrings unless marked "exact".

| Element | Role | Accessible name |
|---|---|---|
| Inbox | `navigation` | "Inbox" |
| Ticket row | `button` (inside Inbox) | contains customer name and ticket ID, e.g. "Ayesha K. TCK-9001" |
| Rail dropdown | `combobox` (`<select>`) | "Rail" |
| Composer text area | `textbox` | "Reply to customer" |
| Check button | `button` | "Check answer" (exact) |
| Send button | `button` | "Send" (exact) |
| CAUTION acknowledgement | `checkbox` | "I've checked this and want to send it" |
| Blocked-send message | `alert` | text contains "Send blocked" |
| Sent confirmation | `status` | text contains "Sent" |
| Side panel | `complementary` | "Slite Agent · SureSend" |
| Panel tabs | `tab` | "Check", "Reasoning", "Sources", "Impact" (exact) |
| Decision banner | `region` | "Decision"; its text contains the label "Allow", "Caution", "Hold", "Escalate" or "AI unavailable" |
| Safe reply card | `region` | "Safe reply" |
| Use safe reply | `button` | "Use safe reply" (exact) |
| Persona switch | `radiogroup` | "Persona", with `radio` "Support agent" and "Ops lead" |
| Reset | `button` | "Reset workspace" |
| AI mode badge | `status` | name starts with "AI mode:" |
| Impact metric | `group` | "Drafts checked", "Unsafe sends intercepted", "False-alarm rate"; each contains its value as text |
| Disclaimer footer | `contentinfo` | text contains "Independent concept for Slite Agent" |

Behaviour the e2e relies on (SPEC §5, §6.8, §11):
- Selecting a ticket loads its draft into the composer (tickets.json `draft`).
- **Check answer** calls `POST /api/check`; the Decision region then shows the label.
- **Send** calls `POST /api/send`. A 409 shows the blocked alert and records one intercept (Impact, "this browser").
  A 200 shows the Sent status.
- **Use safe reply** puts the suggestion text into the composer.
- Impact metrics live in the browser (localStorage with try/catch and a memory fallback) and start at 0 in a fresh context.
