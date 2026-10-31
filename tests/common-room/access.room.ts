import { test, expect } from "@playwright/test";
import { signInFixture, setFixtureScenario } from "./fixtures";

test.describe("account access", () => {
  test("unsigned visitors remain behind the existing login gate", async ({ request }) => {
    const response = await request.get("/account", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toMatch(/\/login$/);
  });
  for (const house of ["gryffindor", "slytherin", "ravenclaw", "hufflepuff", "  House Slytherin  "]) {
    test(`profile authority: ${house}`, async ({ page }) => {
      await signInFixture(page, { house });
      await page.goto("/account");
      await expect(page.getByTestId("common-room")).toHaveAttribute("data-house", house.includes("House") ? "slytherin" : house);
      await expect(page.getByTestId("common-room")).toContainText("Rowan Vale");
    });
  }
  for (const scenario of [{ missing: true }, { house: null }, { house: "default" }, { house: "invented-house" }]) {
    test(`missing/invalid profile is never randomly assigned: ${JSON.stringify(scenario)}`, async ({ page }) => {
      await signInFixture(page, scenario);
      await page.goto("/account");
      await expect(page.getByRole("heading", { name: /house assignment pending/i })).toBeVisible();
      await expect(page.getByTestId("common-room").locator("canvas")).toHaveCount(0);
    });
  }
  test("profile errors are retryable, not treated as unassigned", async ({ page }) => {
    await signInFixture(page, { profileError: true });
    await page.goto("/account");
    await expect(page.getByRole("button", { name: /retry profile/i })).toBeVisible();
    await setFixtureScenario({ profileError: false });
    await page.getByRole("button", { name: /retry profile/i }).click();
    await expect(page.getByTestId("common-room")).toHaveAttribute("data-house", "slytherin");
  });
});
