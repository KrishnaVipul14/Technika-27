import { expect, type Page } from "@playwright/test";
import { prepareFixture, type Scenario } from "../common-room/fixtures";

export async function signupPage(page: Page, scenario: Scenario = {}) {
  await prepareFixture(page, { signup: "confirmed", name: "Mira Finch", ...scenario });
  await page.goto("/signup");
  await expect(page.getByRole("button", { name: "Begin Your Ceremony" })).toBeVisible();
}

export async function fillSignup(page: Page) {
  await page.getByLabel("Full name", { exact: true }).fill("Form Name");
  await page.getByLabel("College / University", { exact: true }).fill("BIT Patna");
  await page.getByLabel(/^Phone number/).fill("+91 98765 43210");
  await page.getByLabel("Email address", { exact: true }).fill("mira@example.invalid");
  await page.locator('input[name="password"]').fill("FixturePassword27");
}
