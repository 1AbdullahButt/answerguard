import { expect, test } from "@playwright/test";

// SPEC §14 (the one e2e test) and SPEC §16 demo steps 2–3.
// Selectors follow design/UI-CONTRACT.md: role + accessible name only.

const WRONG_DRAFT = "Failed transfers are reversed within 4 business days.";

test("wrong draft → HOLD → blocked send → use safe reply → sent → Impact shows 1 intercept", async ({ page }) => {
  await page.goto("/");

  // §16 step 2 (Catch): open TCK-9001 (Ayesha K., instant rail).
  await page
    .getByRole("navigation", { name: "Inbox" })
    .getByRole("button", { name: /Ayesha K\./ })
    .click();

  // §16 step 2: the wrong "4 business days" draft goes in the composer.
  const composer = page.getByRole("textbox", { name: "Reply to customer" });
  await composer.fill(WRONG_DRAFT);

  // §16 step 2: Check → HOLD (§14 T1).
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await expect(page.getByRole("region", { name: "Decision" })).toContainText("Hold");

  // §16 step 3 (Recover): Try Send → blocked (§6.8: server reruns the check, 409).
  const send = page.getByRole("button", { name: "Send", exact: true });
  await send.click();
  await expect(page.getByRole("alert").filter({ hasText: "Send blocked" })).toBeVisible();
  // Not sent: the composer still holds the wrong draft.
  await expect(composer).toHaveValue(WRONG_DRAFT);

  // §16 step 3: Use the safe reply (already rechecked) → it says "1 business day".
  await page.getByRole("button", { name: "Use safe reply", exact: true }).click();
  await expect(composer).toHaveValue(/1 business day/);

  // §16 step 3: Send → sent.
  await send.click();
  await expect(page.getByRole("status").filter({ hasText: "Sent" })).toBeVisible();

  // §14: Impact shows 1 intercept (the blocked send above).
  await page.getByRole("tab", { name: "Impact", exact: true }).click();
  // Exactly one intercept: a "1" not adjacent to other digits (so "10" or "11" would fail).
  await expect(page.getByRole("group", { name: "Unsafe sends intercepted" })).toContainText(/(^|\D)1(\D|$)/);

  // Disclaimer footer is always present.
  await expect(page.getByRole("contentinfo")).toContainText("Independent concept for Slite Agent");
});
