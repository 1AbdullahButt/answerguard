// Phase 3 gate helper: screenshots of the key states at 1440 / 1024 / 390 px plus an axe-core accessibility scan,
// against an already-running app (default http://127.0.0.1:3100, AI_MODE=saved). Uses only the UI-contract names.
//   pnpm tsx scripts/ui-audit.ts [baseUrl]
//   pnpm tsx scripts/ui-audit.ts --serve      start `pnpm start -p 3100` (AI_MODE=saved) first, stop it afterwards
// Writes design/audit/<state>-<width>.png and design/audit/axe.json; exits 1 on any serious/critical axe violation.
import AxeBuilder from "@axe-core/playwright";
import { chromium, type Page } from "@playwright/test";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const serve = process.argv.includes("--serve");
const base = process.argv.slice(2).find((a) => a.startsWith("http")) ?? "http://127.0.0.1:3100";

async function startServer(): Promise<ChildProcess> {
  const child = spawn("pnpm", ["start", "-p", "3100"], {
    shell: true,
    stdio: "ignore",
    env: { ...process.env, AI_MODE: "saved", AI_PROVIDER: "groq", AI_FALLBACK_PROVIDER: "gemini" },
  });
  for (let i = 0; i < 120; i++) {
    try {
      if ((await fetch(base)).ok) return child;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server did not start on " + base);
}

function stopServer(child: ChildProcess) {
  // On Windows the shell wrapper's PID owns the tree.
  // Synchronous, so the tree is gone before this script exits.
  if (process.platform === "win32" && child.pid) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else child.kill();
}
const outDir = path.join(process.cwd(), "design", "audit");
const widths = [1440, 1024, 390];
const DRAFT = "Failed transfers are reversed within 4 business days.";

interface AxeSummary {
  state: string;
  width: number;
  violations: Array<{ id: string; impact: string | null | undefined; help: string; nodes: number }>;
}

/** On narrow screens the panel is a slide-over / bottom sheet; open it if a toggle exists. */
async function openPanel(page: Page) {
  const panel = page.getByRole("complementary", { name: "Slite Agent · AnswerGuard" });
  if (await panel.isVisible().catch(() => false)) return;
  const toggle = page.getByRole("button", { name: /Open AnswerGuard panel/i }).first();
  // On phones the panel toggle lives in the composer, which appears once a conversation is open.
  if (!(await toggle.isVisible().catch(() => false))) {
    await page.getByRole("navigation", { name: "Inbox" }).getByRole("button", { name: /Ayesha K\./ }).click();
  }
  if (await toggle.isVisible().catch(() => false)) await toggle.click();
}

async function checkHold(page: Page) {
  await page.getByRole("navigation", { name: "Inbox" }).getByRole("button", { name: /Ayesha K\./ }).click();
  await page.getByRole("textbox", { name: "Reply to customer" }).fill(DRAFT);
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await openPanel(page);
  await page.getByRole("region", { name: "Decision" }).getByText("Hold").first().waitFor({ timeout: 20_000 });
}

const states: Array<{ name: string; run: (page: Page) => Promise<void> }> = [
  { name: "empty", run: async () => {} },
  { name: "check-hold", run: checkHold },
  {
    name: "reasoning",
    run: async (page) => {
      await checkHold(page);
      await page.getByRole("tab", { name: "Reasoning", exact: true }).click();
    },
  },
  {
    name: "sources",
    run: async (page) => {
      await openPanel(page);
      await page.getByRole("tab", { name: "Sources", exact: true }).click();
    },
  },
  {
    name: "impact",
    run: async (page) => {
      await openPanel(page);
      await page.getByRole("tab", { name: "Impact", exact: true }).click();
    },
  },
  {
    name: "escalate",
    run: async (page) => {
      await page.getByRole("navigation", { name: "Inbox" }).getByRole("button", { name: /Usman R\./ }).click();
      await page.getByRole("textbox", { name: "Reply to customer" }).fill(DRAFT);
      await page.getByRole("button", { name: "Check answer", exact: true }).click();
      await openPanel(page);
      await page.getByRole("region", { name: "Decision" }).getByText("Escalate").first().waitFor({ timeout: 20_000 });
    },
  },
];

async function main() {
  mkdirSync(outDir, { recursive: true });
  const server = serve ? await startServer() : null;
  const browser = await chromium.launch();
  const summaries: AxeSummary[] = [];
  let serious = 0;
  const overflow: string[] = [];
  for (const width of widths) {
    for (const state of states) {
      const context = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 } });
      const page = await context.newPage();
      await page.goto(base);
      await page.getByRole("contentinfo").waitFor();
      try {
        await state.run(page);
      } catch (e) {
        console.log(`! ${state.name}@${width}: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}`);
      }
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(outDir, `${state.name}-${width}.png`), fullPage: false });
      const hScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      if (hScroll) overflow.push(`${state.name}@${width}`);
      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const violations = axe.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length }));
      serious += violations.filter((v) => v.impact === "serious" || v.impact === "critical").length;
      summaries.push({ state: state.name, width, violations });
      console.log(`${state.name.padEnd(11)} ${String(width).padStart(4)}px  axe: ${violations.length ? violations.map((v) => `${v.id}(${v.impact}×${v.nodes})`).join(", ") : "none"}${hScroll ? "  ⚠ horizontal scroll" : ""}`);
      await context.close();
    }
  }
  await browser.close();
  if (server) stopServer(server);
  writeFileSync(path.join(outDir, "axe.json"), JSON.stringify(summaries, null, 2));
  console.log(`\nSerious/critical axe violations: ${serious}. Horizontal page scroll: ${overflow.length ? overflow.join(", ") : "none"}.`);
  process.exit(serious === 0 && overflow.length === 0 ? 0 : 1);
}

void main();
