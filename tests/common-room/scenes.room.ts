import { test, expect } from "@playwright/test";
import { signInFixture } from "./fixtures";
import { panels, enterRoom, pickObject } from "./room-actions";

test("Slytherin architecture and room shell", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signInFixture(page);
  await page.goto("/account");
  await expect(page.getByTestId("room-canvas").locator("canvas")).toBeVisible();
  await expect(page.getByTestId("common-room")).toHaveAttribute("data-ready", "true", { timeout: 25_000 });
  await expect(page.getByRole("heading", { name: "The Serpent’s Den", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main Navigation" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Change house", exact: true })).toHaveCount(0);
  await expect(page.locator(".site-footer, .wand-cursor-viewport, .wand-sparks")).toHaveCount(0);
  await page.screenshot({ path: `test-results/common-room/${testInfo.project.name}-slytherin.png` });
  expect(errors).toEqual([]);
  await page.getByRole("link", { name: "Leave the room" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect(page.locator(".site-footer")).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Change house", exact: true })).toHaveCount(1);
});

test.describe("distinct house scenes", () => {
  test.use({ reducedMotion: "reduce" });
  for (const [house, title, name] of [["gryffindor", "The Lion’s Hearth", "Gryffindor"], ["ravenclaw", "The Celestial Observatory", "Ravenclaw"], ["hufflepuff", "The Hearth Garden", "Hufflepuff"]] as const) {
    test(`${name} architecture and five physical picks`, async ({ page }, info) => {
      const errors: string[] = []; const chunks: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => { if (request.url().includes("-scene")) chunks.push(request.url()); });
      await signInFixture(page, { house }); await enterRoom(page);
      await expect(page.getByTestId("room-canvas").locator("canvas")).toBeVisible();
      await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await page.screenshot({ path: `test-results/common-room/${info.project.name}-${house}.png` });
      for (const [id, panel] of Object.entries(panels)) {
        await pickObject(page, id, info.project.name === "mobile");
        await expect(page.getByRole("dialog").getByRole("heading", { name: panel, exact: true })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByTestId("common-room")).toHaveAttribute("data-phase", "exploring");
      }
      expect(chunks.some((chunk) => chunk.includes("slytherin-scene"))).toBe(false);
      expect(errors).toEqual([]);
    });
  }
});
