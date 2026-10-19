import { defineConfig, devices } from "@playwright/test";

// In CI the tests run against the ephemeral environment (E2E_BASE_URL); locally against a fresh production build.
const baseURL = process.env.E2E_BASE_URL || undefined;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: baseURL ?? "http://localhost:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "phone", use: { ...devices["Pixel 7"] } },
    // The smallest screen the UX gate names (375px), in WebKit, the engine of every browser on an iPhone.
    { name: "small-iphone", use: { ...devices["iPhone SE (3rd gen)"] } },
  ],
  webServer: baseURL
    ? undefined
    : { command: "pnpm build && pnpm start -p 3100", url: "http://localhost:3100", reuseExistingServer: false, timeout: 180_000 },
});
