import { test, expect } from "@playwright/test";
import { signInFixture } from "./fixtures";

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
