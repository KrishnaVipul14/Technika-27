import { test, expect } from "@playwright/test";
import { signInFixture } from "./fixtures";
import { enterRoom, pickObject } from "./room-actions";
import { installRuntimeProbe, runtimeSnapshot, setRoomVisibility } from "./runtime-probe";

test.describe("room recovery", () => {
  test.use({ reducedMotion: "reduce" });
  test("fallback for unavailable WebGL keeps all information and a retry", async ({ page }) => {
    await signInFixture(page);
    await page.addInitScript(() => { HTMLCanvasElement.prototype.getContext = new Proxy(HTMLCanvasElement.prototype.getContext, { apply(method, canvas, args) { return String(args[0]).includes("webgl") ? null : Reflect.apply(method, canvas, args); } }); });
    await page.goto("/account");
    await expect(page.getByRole("button", { name: "Try the 3D room" })).toBeVisible();
    await page.getByRole("button", { name: "Your Belongings", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("rowan@example.invalid");
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("common-room")).toHaveAttribute("data-phase", "exploring");
  });
  test("fallback after a failed house chunk can explicitly reload and recover", async ({ page }) => {
    await signInFixture(page, { house: "ravenclaw" }); let blocked = 0;
    await page.route(/ravenclaw-scene.*\.js/, async (route) => { blocked++; await route.abort(); });
    await page.goto("/account");
    await expect(page.getByRole("button", { name: "Reload the 3D room" })).toBeVisible();
    expect(blocked).toBeGreaterThan(0);
    await page.getByRole("button", { name: "House Archives", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Ravenclaw"); await page.keyboard.press("Escape");
    await page.unroute(/ravenclaw-scene.*\.js/);
    await page.getByRole("button", { name: "Reload the 3D room" }).click();
    await expect(page.getByTestId("common-room")).toHaveAttribute("data-ready", "true", { timeout: 25_000 });
    await expect(page.getByTestId("room-canvas").locator("canvas")).toBeVisible();
  });
  test("context-loss fallback preserves an open panel and recreates only one renderer", async ({ page }, info) => {
    await installRuntimeProbe(page); await signInFixture(page); await enterRoom(page);
    await page.getByText("Explore the room", { exact: true }).click();
    await page.getByRole("button", { name: "Your Belongings", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("rowan@example.invalid");
    const supported = await page.getByTestId("room-canvas").locator("canvas").evaluate((canvas: HTMLCanvasElement) => { const extension = canvas.getContext("webgl2")?.getExtension("WEBGL_lose_context"); extension?.loseContext(); return !!extension; });
    test.skip(!supported, "This browser does not expose WEBGL_lose_context; real context-loss recovery is unverified.");
    await expect(page.getByTestId("room-canvas")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toContainText("rowan@example.invalid"); await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Try the 3D room" }).click();
    await expect(page.getByTestId("room-canvas").locator("canvas")).toBeVisible();
    await expect.poll(async () => (await runtimeSnapshot(page)).webgl.filter((context) => !context.lost).length).toBe(1);
    await expect(page.getByTestId("common-room")).toHaveAttribute("data-phase", "exploring");
    await pickObject(page, "notices", info.project.name === "mobile");
    await expect(page.getByRole("dialog").getByRole("heading", { name: "Notice Board", exact: true })).toBeVisible();
  });
  test("quality presets redraw a static canvas; blocked room storage is harmless", async ({ page }) => {
    await signInFixture(page); await installRuntimeProbe(page);
    await page.addInitScript(() => { for (const method of ["getItem", "setItem"] as const) { Object.defineProperty(Storage.prototype, method, { value: new Proxy(Storage.prototype[method], { apply(original, storage, args) { if (args[0] === "technika:common-room:v1") throw new DOMException("Storage blocked", "SecurityError"); return Reflect.apply(original, storage, args); } }) }); } });
    await enterRoom(page); await page.getByRole("button", { name: "Room settings", exact: true }).click();
    for (const [quality, cap] of [["high", 1.75], ["medium", 1.25], ["low", 1]] as const) {
      const before = (await runtimeSnapshot(page)).draws;
      await page.getByRole("combobox", { name: "Rendering quality", exact: true }).selectOption(quality);
      await expect(page.getByTestId("common-room")).toHaveAttribute("data-quality", quality);
      await expect.poll(async () => (await runtimeSnapshot(page)).draws).toBeGreaterThan(before);
      const canvas = page.getByTestId("room-canvas").locator("canvas");
      expect(Number(await canvas.getAttribute("data-dpr"))).toBeLessThanOrEqual(cap);
      if (quality === "low") await expect(canvas).toHaveAttribute("data-shadows", "false");
    }
    await page.getByRole("button", { name: "Close Room settings" }).click();
    const before = (await runtimeSnapshot(page)).draws;
    await page.setViewportSize({ width: 760, height: 800 });
    await expect.poll(async () => (await runtimeSnapshot(page)).draws).toBeGreaterThan(before);
    const idle = (await runtimeSnapshot(page)).draws; await page.waitForTimeout(250);
    expect((await runtimeSnapshot(page)).draws).toBe(idle);
  });
});

test("visibility suspends animated rendering; navigation cleans the old context", async ({ page }) => {
  await installRuntimeProbe(page); await signInFixture(page, { house: "hufflepuff" }); await enterRoom(page);
  await setRoomVisibility(page, true); const hidden = (await runtimeSnapshot(page)).draws;
  await page.waitForTimeout(250); expect((await runtimeSnapshot(page)).draws).toBe(hidden);
  await setRoomVisibility(page, false);
  await expect.poll(async () => (await runtimeSnapshot(page)).draws).toBeGreaterThan(hidden);
  await page.getByRole("link", { name: "Leave the room" }).click(); await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
  await expect.poll(async () => (await runtimeSnapshot(page)).webgl.every((context) => context.lost)).toBe(true);
  await page.goBack(); await expect(page.getByTestId("common-room")).toHaveAttribute("data-phase", "exploring", { timeout: 25_000 });
  expect((await runtimeSnapshot(page)).webgl.filter((context) => !context.lost)).toHaveLength(1);
});

test("entrance visibility suspension does not fast-forward the welcome", async ({ page }) => {
  await signInFixture(page, { house: "hufflepuff" }); await installRuntimeProbe(page);
  await page.addInitScript(() => Object.defineProperty(document, "hidden", { configurable: true, value: true }));
  await page.goto("/account"); await expect(page.getByTestId("common-room")).toHaveAttribute("data-phase", "entering", { timeout: 25_000 });
  await page.waitForTimeout(1800);
  await expect(page.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  const start = await page.evaluate(() => performance.now()); await setRoomVisibility(page, false);
  await expect.poll(async () => (await runtimeSnapshot(page)).draws).toBeGreaterThan(0);
  const sample = await page.evaluate((start) => ({ elapsed: performance.now() - start, percent: Number(document.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow") ?? 100) }), start);
  expect(sample.percent).toBeLessThanOrEqual(Math.min(100, sample.elapsed / 40 + 5));
});

test("responsive parchment has contrast, touch targets and independent scrolling", async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" }); await signInFixture(page); await enterRoom(page);
  for (const [width, height] of [[320, 740], [390, 844], [844, 390], [768, 1024]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const settings = await page.getByRole("button", { name: "Room settings", exact: true }).boundingBox();
    expect(settings!.width).toBeGreaterThanOrEqual(44); expect(settings!.height).toBeGreaterThanOrEqual(44);
    await page.getByText("Explore the room", { exact: true }).click();
    await page.getByRole("button", { name: "Hidden Passage", exact: true }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
    await page.goBack();
    await expect(page.getByTestId("common-room")).toHaveAttribute("data-phase", "exploring", { timeout: 25_000 });
    await page.getByText("Explore the room", { exact: true }).click();
  }
});
