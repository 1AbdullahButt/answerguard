// Records the ~30-second README demo GIF (brief §4 Phase 4 step 5): Playwright video of the SPEC §16 flow against a
// saved-mode production server, converted to docs/demo.gif with ffmpeg (two-pass palette for a small, crisp GIF).
//   pnpm build && pnpm tsx scripts/record-demo.ts
import { chromium, type Page } from "@playwright/test";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";

const PORT = 3400;
const base = `http://127.0.0.1:${PORT}`;
const outDir = path.join(process.cwd(), "docs");
const videoDir = path.join(outDir, ".video");
const DRAFT = "Failed transfers are reversed within 4 business days.";

async function startServer(): Promise<ChildProcess> {
  const child = spawn("pnpm", ["start", "-p", String(PORT)], {
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
  throw new Error(`server did not start on ${base}`);
}

function stopServer(child: ChildProcess) {
  if (process.platform === "win32" && child.pid) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else child.kill();
}

const pause = (page: Page, ms: number) => page.waitForTimeout(ms);

async function demo(page: Page) {
  await page.goto(base);
  await page.getByRole("contentinfo").waitFor();
  // Dismiss the auto-offered tour if it appears; the GIF shows the flow itself.
  const skip = page.getByRole("button", { name: /^Skip/ });
  if (await skip.isVisible({ timeout: 1500 }).catch(() => false)) await skip.click();
  await pause(page, 600);

  // 1. Catch: TCK-9001, 4-day draft → HOLD
  await page.getByRole("navigation", { name: "Inbox" }).getByRole("button", { name: /Ayesha K\./ }).click();
  const composer = page.getByRole("textbox", { name: "Reply to customer" });
  await composer.fill(DRAFT);
  await pause(page, 700);
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("region", { name: "Decision" }).getByText("Hold").first().waitFor();
  await pause(page, 2200);

  // 2. Why: Reasoning tab
  await page.getByRole("tab", { name: "Reasoning", exact: true }).click();
  await pause(page, 2600);
  await page.getByRole("tab", { name: "Check", exact: true }).click();
  await pause(page, 500);

  // 3. Recover: blocked send → safe reply → sent
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Send blocked" }).waitFor();
  await pause(page, 1600);
  await page.getByRole("button", { name: "Use safe reply", exact: true }).click();
  await pause(page, 900);
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Sent" }).waitFor();
  await pause(page, 1500);

  // 4. Ambiguity: TCK-9002 → ESCALATE
  await page.getByRole("navigation", { name: "Inbox" }).getByRole("button", { name: /Usman R\./ }).click();
  await composer.fill(DRAFT);
  await page.getByRole("button", { name: "Check answer", exact: true }).click();
  await page.getByRole("region", { name: "Decision" }).getByText("Escalate").first().waitFor();
  await pause(page, 2200);

  // 5. Impact
  await page.getByRole("tab", { name: "Impact", exact: true }).click();
  await pause(page, 2000);
}

async function main() {
  rmSync(videoDir, { recursive: true, force: true });
  mkdirSync(videoDir, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 760 }, recordVideo: { dir: videoDir, size: { width: 1280, height: 760 } } });
    const page = await context.newPage();
    await demo(page);
    await context.close(); // flushes the video
  } finally {
    await browser.close();
    stopServer(server);
  }
  const webm = readdirSync(videoDir).find((f) => f.endsWith(".webm"));
  if (!webm) throw new Error("no video recorded");
  const src = path.join(videoDir, webm);
  renameSync(src, path.join(outDir, "demo.webm"));
  const palette = path.join(videoDir, "palette.png");
  const filters = "fps=10,scale=960:-1:flags=lanczos";
  const ff = (args: string[]) => {
    const r = spawnSync("ffmpeg", ["-y", "-loglevel", "error", ...args], { stdio: "inherit" });
    if (r.status !== 0) throw new Error(`ffmpeg failed: ${args.join(" ")}`);
  };
  ff(["-i", path.join(outDir, "demo.webm"), "-vf", `${filters},palettegen=stats_mode=diff`, palette]);
  ff(["-i", path.join(outDir, "demo.webm"), "-i", palette, "-lavfi", `${filters}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5`, path.join(outDir, "demo.gif")]);
  rmSync(videoDir, { recursive: true, force: true });
  console.log("wrote docs/demo.gif and docs/demo.webm");
}

void main();
