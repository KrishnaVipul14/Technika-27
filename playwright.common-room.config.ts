import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/common-room",
  testMatch: /.*\.room\.ts$/,
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  expect: { timeout: 12000 },
  reporter: "list",
  outputDir: "test-results/common-room",
  use: { baseURL: "http://127.0.0.1:3410", trace: "retain-on-failure", actionTimeout: 12000 },
  projects: [
    { name: "logic", testMatch: /logic\.room\.ts$/ },
    { name: "desktop", testIgnore: /logic\.room\.ts$/, use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "mobile", testIgnore: /logic\.room\.ts$/, use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    command: "node tests/common-room/server.mjs",
    url: "http://127.0.0.1:3410/login",
    timeout: 180000,
    reuseExistingServer: !process.env.CI,
  },
});
