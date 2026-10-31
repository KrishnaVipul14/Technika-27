import { test, expect } from "@playwright/test";
import { signInFixture, setFixtureScenario, fixtureRequests } from "./fixtures";

const panels = ["House Archives", "Notice Board", "House Community", "Your Belongings", "Hidden Passage"];
test.describe("panels", () => {
  test.use({ reducedMotion: "reduce" });
  test.beforeEach(async ({ page }) => { await signInFixture(page); await page.goto("/account"); await page.getByText("Explore the room", { exact: true }).click(); });
  test("five panels, Escape and focus restoration", async ({ page }) => {
    for (const title of panels) {
      const opener = page.getByRole("button", { name: title, exact: true });
      await opener.click();
      const dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: title, exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      await expect(opener).toBeFocused();
    }
  });
  test("unavailable sources are honest and only the private chest shows own email", async ({ page }) => {
    await expect(page.getByTestId("common-room")).not.toContainText("rowan@example.invalid");
    await page.getByRole("button", { name: "Notice Board", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("No announcement source is connected");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Your Belongings", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("rowan@example.invalid");
    await expect(page.getByRole("dialog")).toContainText("Registration records are not connected");
  });
  test("riddle accepts normalized answers without points", async ({ page }) => {
    await page.getByRole("button", { name: "Hidden Passage", exact: true }).click();
    await page.getByLabel("Your answer").fill("wrong");
    await page.getByRole("button", { name: "Whisper the answer" }).click();
    await expect(page.getByRole("dialog")).toContainText("Listen a little closer");
    await page.getByLabel("Your answer").fill("  Echo  ");
    await page.getByRole("button", { name: "Whisper the answer" }).click();
    await expect(page.getByRole("dialog")).toContainText("The passage remembers");
  });
  test("keyboard focus stays in the secret panel and long names remain text", async ({ page }) => {
    const name = "<b>Not markup</b> " + "A very long participant name ".repeat(8);
    await setFixtureScenario({ name });
    await page.reload();
    await page.getByText("Explore the room", { exact: true }).click();
    await page.getByRole("button", { name: "Your Belongings", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText(name.trim());
    await expect(page.getByRole("dialog").locator("b")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Hidden Passage", exact: true }).click();
    await page.getByLabel("Your answer").focus();
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByRole("button", { name: "Close Hidden Passage" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Your answer")).toBeFocused();
  });
  test("directory error, retry, pagination and revocation", async ({ page }) => {
    await setFixtureScenario({ directoryError: true });
    await page.getByRole("button", { name: "House Community", exact: true }).click();
    await expect(page.getByRole("button", { name: "Retry directory" })).toBeVisible();
    await setFixtureScenario({ directoryError: false });
    await page.getByRole("button", { name: "Retry directory" }).click();
    await expect(page.getByTestId("room-member")).toHaveCount(24);
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByTestId("room-member")).toHaveCount(4);
    await setFixtureScenario({ revoked: true });
    await page.getByRole("button", { name: "Previous page" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByTestId("room-member")).toHaveCount(0);
  });
});

test.describe("directory API", () => {
  test("rejects unsigned reads", async ({ request }) => {
    expect((await request.get("/api/common-room/members")).status()).toBe(401);
  });
  test("same-house bounded projection never returns private fields", async ({ page }) => {
    await signInFixture(page);
    const response = await page.request.get("/api/common-room/members?house=hufflepuff");
    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.house).toBe("slytherin");
    expect(result.members).toHaveLength(24);
    expect(result.nextPage).toBe(1);
    expect(result.members.every((member: { house: string }) => member.house === "slytherin")).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/PRIVATE_PHONE|private-member|Other house member/);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const queries = (await fixtureRequests()).filter((r) => r.path === "/rest/v1/profiles" && !r.query.id);
    expect(queries.at(-1)?.query.select).toBe("full_name,house");
  });
  test("validates pages, distinguishes empty and missing house", async ({ page }) => {
    await signInFixture(page, { empty: true });
    for (const value of ["-1", "1.5", "1001", "NaN"]) expect((await page.request.get(`/api/common-room/members?page=${value}`)).status()).toBe(400);
    const result = await (await page.request.get("/api/common-room/members")).json();
    expect(result.members).toEqual([]);
    expect(result.nextPage).toBeNull();
    await setFixtureScenario({ house: null });
    expect((await page.request.get("/api/common-room/members")).status()).toBe(403);
  });
});
