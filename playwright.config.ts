import { defineConfig, devices } from "@playwright/test";

// SPEC §14: one Playwright e2e test, run against saved AI responses only (no keys, no live calls).
export default defineConfig({
  testDir: "e2e",
  retries: 0,
  reporter: "list",
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm build && pnpm start -p 3100",
    url: "http://127.0.0.1:3100",
    timeout: 240_000,
    reuseExistingServer: !process.env.CI,
    env: {
      AI_MODE: "saved",
      AI_PROVIDER: "groq",
      AI_FALLBACK_PROVIDER: "gemini",
    },
  },
});
