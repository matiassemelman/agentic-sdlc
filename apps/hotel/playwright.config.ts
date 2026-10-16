import { defineConfig, devices } from "@playwright/test";

// In CI the tests run against the ephemeral environment (E2E_BASE_URL); locally against a production build.
const baseURL = process.env.E2E_BASE_URL;

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
  ],
  webServer: baseURL
    ? undefined
    : { command: "pnpm build && pnpm start -p 3100", url: "http://localhost:3100", reuseExistingServer: true, timeout: 180_000 },
});
