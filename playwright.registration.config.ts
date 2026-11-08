import { defineConfig } from "@playwright/test";
import commonRoom from "./playwright.common-room.config";

export default defineConfig({
  ...commonRoom,
  testDir: "./tests/registration",
  testMatch: /.*\.spec\.ts$/,
  outputDir: "test-results/registration",
  projects: commonRoom.projects!.filter((project) => project.name !== "logic"),
});
