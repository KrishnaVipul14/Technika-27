import { test, expect } from "@playwright/test";
import { signInFixture, setFixtureScenario, fixtureRequests } from "../common-room/fixtures";
import { signupPage, fillSignup } from "./fixtures";
import { installRuntimeProbe, runtimeSnapshot } from "../common-room/runtime-probe";

test.describe("arrival data boundary", () => {
  test("uses the verified profile, not a requested or metadata house", async ({ page }) => {
    await signInFixture(page, { name: "Mira Finch", house: "  House Ravenclaw  " });
    const response = await page.request.get("/api/common-room/arrival?house=hufflepuff");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("private, no-store");
    expect(response.headers().vary).toContain("Cookie");
    expect(await response.json()).toEqual({ status: "ready", participant: { id: "10000000-0000-4000-8000-000000000001", displayName: "Mira Finch", house: "ravenclaw" } });
  });
  test("rejects signed-out, unassigned and unavailable access without inventing a participant", async ({ page }) => {
    expect((await page.request.get("/api/common-room/arrival")).status()).toBe(401);
    await signInFixture(page, { house: null });
    expect((await page.request.get("/api/common-room/arrival")).status()).toBe(403);
    await setFixtureScenario({ profileError: true });
    const response = await page.request.get("/api/common-room/arrival");
    expect(response.status()).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });
});

test.describe("registration handoff", () => {
  test.use({ reducedMotion: "reduce" });
  test("confirmed signup opens the real participant's letter only after success and cannot double-submit", async ({ page }) => {
    await signupPage(page); await fillSignup(page);
    let release!: () => void, called!: () => void, count = 0;
    const hold = new Promise<void>((resolve) => { release = resolve; });
    const sent = new Promise<void>((resolve) => { called = resolve; });
    await page.route("**/auth/v1/signup*", async (route) => {
      count++;
      expect(route.request().postDataJSON().data).toEqual({ display_name: "Form Name", college: "BIT Patna", phone: "+919876543210" });
      called(); await hold; await route.continue();
    });
    await page.getByRole("button", { name: "Begin Your Ceremony" }).click();
    try {
      await sent;
      await expect(page.getByRole("dialog", { name: "Your acceptance letter" })).toHaveCount(0);
      await page.locator("form").evaluate((form) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
      expect(count).toBe(1);
    } finally { release(); }
    const letter = page.getByRole("dialog", { name: "Your acceptance letter" });
    await expect(letter).toBeVisible({ timeout: 20_000 });
    await expect(letter).toHaveAttribute("data-house", "slytherin");
    await expect(letter.getByTestId("acceptance-paper")).toContainText("Dear Mira Finch,");
    await expect(letter.getByTestId("acceptance-paper")).toContainText("your journey into the extraordinary world of Technika’27 is about to begin.");
    await expect(letter.getByTestId("acceptance-paper")).not.toContainText("Form Name");
    await letter.getByRole("button", { name: "Enter the Wizarding World", exact: true }).click();
    // In cold development, a Fast Refresh full reload may interrupt the first navigation; wait for /account with retries.
    await expect.poll(async () => {
      const url = page.url();
      if (url.endsWith("/account")) return true;
      if (url.endsWith("/signup")) await page.goto("/account", { waitUntil: "domcontentloaded", timeout: 10_000 }).catch(() => {});
      return false;
    }, { timeout: 40_000, intervals: [500, 1_000, 2_000] }).toBe(true);
    await expect(letter).toHaveCount(0, { timeout: 25_000 });
    await expect(page.getByTestId("common-room")).toHaveAttribute("data-house", "slytherin");
    // The welcome message appears once the arrival coordinator reaches "complete"; allow extra time for cold-dev HMR.
    await expect(page.getByTestId("common-room")).toContainText("Welcome home, Mira Finch.", { timeout: 25_000 });
    expect((await fixtureRequests()).filter((request) => request.path === "/auth/v1/signup")).toHaveLength(1);
  });
  for (const signup of ["confirmation-required", "no-session"] as const) {
    test(`${signup} keeps a truthful sign-in continuation, not a letter or repeat signup`, async ({ page }) => {
      await signupPage(page, { signup }); await fillSignup(page);
      await page.getByRole("button", { name: "Begin Your Ceremony" }).click();
      await expect(page.getByRole("link", { name: "Continue to sign in", exact: true })).toBeVisible();
      await expect(page.getByRole("dialog", { name: "Your acceptance letter" })).toHaveCount(0);
      await expect(page.locator('input[name="email"]')).toBeDisabled();
      expect((await fixtureRequests()).filter((request) => request.path === "/auth/v1/signup")).toHaveLength(1);
    });
  }
  test("an unavailable saved house never uses the legacy random fallback", async ({ page }) => {
    await signupPage(page, { house: null }); await fillSignup(page);
    await page.getByRole("button", { name: "Begin Your Ceremony" }).click();
    await expect(page.getByRole("link", { name: "Continue to your Common Room", exact: true })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("dialog", { name: "Your acceptance letter" })).toHaveCount(0);
    await expect(page.getByRole("status")).toContainText("registration succeeded");
    await expect(page.locator('input[name="email"]')).toBeDisabled();
  });
});

test("the letter stops half-way, unfolds, is written for the real name and dissolves into the assigned room", async ({ page }, info) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await installRuntimeProbe(page);
  const scenes: string[] = [];
  page.on("request", (request) => { if (request.url().includes("-scene")) scenes.push(request.url()); });
  // Compile /account before the flow so cold `next dev` cannot full-reload the page mid-handoff.
  await page.request.get("/account");
  await signupPage(page, { house: "ravenclaw" }); await fillSignup(page);
  await page.getByRole("button", { name: "Begin Your Ceremony" }).click();
  const letter = page.getByRole("dialog", { name: "Your acceptance letter" });
  await expect(letter).toBeVisible({ timeout: 20_000 });
  const art = letter.getByTestId("acceptance-art");
  await expect(art).toHaveAttribute("data-stage", "sealed", { timeout: 15_000 });
  await page.screenshot({ path: `test-results/registration/${info.project.name}-sealed.png` });

  // The signature moment: the letter is partly out and HOLDS still for ~1.1s.
  await expect(art).toHaveAttribute("data-stage", "halfway", { timeout: 15_000 });
  const rigY = () => letter.locator("[data-rig]").evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).m42);
  const first = await rigY();
  await page.screenshot({ path: `test-results/registration/${info.project.name}-halfway.png` });
  await page.waitForTimeout(250);
  expect(Math.abs((await rigY()) - first)).toBeLessThan(4);
  expect(await letter.locator("[data-flap]").evaluate((node) => getComputedStyle(node).transform)).toContain("matrix3d");
  expect(await letter.locator("[data-seal='bottom']").evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).m41)).toBeLessThan(0);

  await expect(art).toHaveAttribute("data-stage", "unfolding", { timeout: 15_000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `test-results/registration/${info.project.name}-unfolding.png` });
  await expect(art).toHaveAttribute("data-stage", "writing", { timeout: 15_000 });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `test-results/registration/${info.project.name}-writing.png` });
  await expect(letter.getByTestId("acceptance-paper")).toContainText("Dear Mira Finch,");

  // Skip from mid-writing lands on the exact finished state; at most the room's own context exists.
  await letter.getByRole("button", { name: "Reveal letter now" }).click();
  await expect(art).toHaveAttribute("data-stage", "reading");
  const cta = letter.getByRole("button", { name: "Enter the Wizarding World", exact: true });
  await expect(cta).toBeVisible();
  await expect(cta).toBeFocused();
  expect((await runtimeSnapshot(page)).webgl.length).toBeLessThanOrEqual(1);
  expect((await runtimeSnapshot(page)).states).toEqual([]);
  await page.screenshot({ path: `test-results/registration/${info.project.name}-letter.png` });

  // Replay restarts from the arrival; skipping again restores the finished letter.
  await letter.getByRole("button", { name: "Replay letter" }).click();
  await expect(art).toHaveAttribute("data-stage", "sealed", { timeout: 15_000 });
  await letter.getByRole("button", { name: "Reveal letter now" }).click();
  await expect(cta).toBeVisible();

  await expect.poll(() => scenes.some((url) => url.includes("ravenclaw-scene"))).toBe(true);
  expect(scenes.some((url) => /slytherin-scene|gryffindor-scene|hufflepuff-scene/.test(url))).toBe(false);
  await cta.click();
  // The gate seals over the letter at once, and stays sealed while the room loads behind it.
  await expect(art).toHaveAttribute("data-gate", "closed", { timeout: 10_000 });
  await page.screenshot({ path: `test-results/registration/${info.project.name}-gate-closed.png` });
  await expect(letter).toHaveAttribute("data-phase", "revealing", { timeout: 25_000 });
  await page.waitForTimeout(450);
  await page.screenshot({ path: `test-results/registration/${info.project.name}-gate-opening.png` });
  // The letter's room canvas is released before the Common Room renders.
  expect((await runtimeSnapshot(page)).webgl[0]?.lost ?? true).toBe(true);
  await expect(page.getByTestId("common-room")).toHaveAttribute("data-house", "ravenclaw");
  await page.screenshot({ path: `test-results/registration/${info.project.name}-homecoming.png` });
  await expect(letter).toHaveCount(0);
  await expect(page.locator("#main-content")).toBeFocused();
});
