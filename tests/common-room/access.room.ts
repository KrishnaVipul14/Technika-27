import { test, expect } from "@playwright/test";
import { signInFixture, setFixtureScenario, fixtureRequests } from "./fixtures";

test.describe("account access", () => {
  test("unsigned visitors remain behind the existing login gate", async ({ request }) => {
    const response = await request.get("/account", { maxRedirects: 0, timeout: 30_000 });
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
  test("an account change discards an in-flight directory and the previous participant", async ({ page }) => {
    await signInFixture(page);
    await page.addInitScript(() => localStorage.setItem("technika:common-room:v1", JSON.stringify({ lightweight: true })));
    await page.goto("/account");
    let release!: () => void, received!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    const requested = new Promise<void>((resolve) => { received = resolve; });
    await page.route("**/api/common-room/members?*", async (route) => { const response = await route.fetch(); received(); await held; await route.fulfill({ response }); });
    await page.getByRole("button", { name: "House Community", exact: true }).click();
    await requested;
    const id = "10000000-0000-4000-8000-000000000002";
    try {
      const session = await signInFixture(page, { id, email: "mira@example.invalid", name: "Mira Finch", house: "ravenclaw" });
      // Deliver the same native cross-tab event as Supabase, with SDK-issued fixture cookies.
      await page.evaluate((session) => { const channel = new BroadcastChannel("sb-127-auth-token"); channel.postMessage({ event: "SIGNED_IN", session }); channel.close(); }, session);
      await expect(page.getByRole("dialog")).toHaveCount(0);
    } finally { release(); }
    await expect(page.getByTestId("common-room")).toHaveAttribute("data-house", "ravenclaw", { timeout: 25_000 });
    await expect(page.getByTestId("common-room")).toContainText("Mira Finch");
    await expect(page.getByTestId("common-room")).not.toContainText("Rowan Vale");
    await expect(page.getByTestId("room-member")).toHaveCount(0);
    expect((await fixtureRequests()).some((request) => request.query.id === `eq.${id}`)).toBe(true);
  });
  test("profile errors are retryable, not treated as unassigned", async ({ page }) => {
    await signInFixture(page, { profileError: true });
    await page.goto("/account");
    await expect(page.getByRole("button", { name: /retry profile/i })).toBeVisible();
    await setFixtureScenario({ profileError: false });
    await page.getByRole("button", { name: /retry profile/i }).click();
    await expect(page.getByTestId("common-room")).toHaveAttribute("data-house", "slytherin");
  });
});
