import { defineConfig } from "@playwright/test";
import commonRoom from "./playwright.common-room.config";

// Existing loopback Supabase fixture; no live accounts or backend writes.
export default defineConfig({
  ...commonRoom,
  testDir: "./tests",
  testMatch: /colour-auth\.spec\.ts$/,
  outputDir: "test-results/colour-auth",
  projects: commonRoom.projects!.filter((project) => project.name !== "logic"),
});
