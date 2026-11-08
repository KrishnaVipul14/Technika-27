import { test, expect } from "@playwright/test";
import { signInFixture } from "./fixtures";
import { enterRoom } from "./room-actions";

for (const [house, name] of [["ravenclaw", "Ravenclaw"], ["hufflepuff", "Hufflepuff"]] as const) test(`${name} environment obeys reduced motion`, async ({ page }) => {
  await page.addInitScript(() => {
    const probe = { draws: 0 };
    Object.defineProperty(window, "roomDrawProbe", { value: probe });
    for (const context of [WebGLRenderingContext, WebGL2RenderingContext]) {
      const original = context.prototype.drawElements;
      context.prototype.drawElements = function (...args) { probe.draws++; return original.apply(this, args); };
    }
  });
  const drawCount = () => page.evaluate(() => (window as unknown as { roomDrawProbe: { draws: number } }).roomDrawProbe.draws);
  await signInFixture(page, { house });
  await page.emulateMedia({ reducedMotion: "reduce" }); await enterRoom(page);
  const canvas = page.getByTestId("room-canvas").locator("canvas");
  const staticFrame = await canvas.screenshot(); const count = await drawCount();
  // Deliberate observation window: a static scene must not keep drawing.
  await page.waitForTimeout(250);
  expect(await drawCount()).toBe(count); expect((await canvas.screenshot()).equals(staticFrame)).toBe(true);
  await page.emulateMedia({ reducedMotion: "no-preference" }); await enterRoom(page);
  const movingFrame = await canvas.screenshot(); const movingCount = await drawCount();
  await expect.poll(drawCount).toBeGreaterThan(movingCount + 400);
  expect((await canvas.screenshot()).equals(movingFrame)).toBe(false);
});
