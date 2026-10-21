import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.BASE_URL ?? "http://localhost:4321";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Start the production preview unless BASE_URL points at an already running server.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run preview -- --port 4321",
        url: "http://localhost:4321",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
