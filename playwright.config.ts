import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  workers: 1,
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3847",
  },
  webServer: {
    command: "pnpm exec next dev -p 3847",
    url: "http://127.0.0.1:3847/api/health",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
