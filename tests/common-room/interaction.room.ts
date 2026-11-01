import { test, expect } from "@playwright/test";
import { signInFixture } from "./fixtures";
import { panels, enterRoom, pickObject, anchors } from "./room-actions";

test.describe("interaction", () => {
  test.use({ reducedMotion: "reduce" });
  test("five real canvas picks, not guide buttons, restore the view and focus", async ({ page }, info) => {
    await signInFixture(page); await enterRoom(page);
    const before = await anchors(page);
    await page.screenshot({ path: `test-results/common-room/${info.project.name}-before-focus.png` });
    for (const [id, title] of Object.entries(panels)) {
      await pickObject(page, id, info.project.name === "mobile");
      await expect(page.getByRole("dialog").getByRole("heading", { name: title, exact: true })).toBeVisible();
      if (id === "secret") await page.screenshot({ path: `test-results/common-room/${info.project.name}-passage-focus.png` });
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("common-room")).toHaveAttribute("data-phase", "exploring");
      await expect.poll(() => anchors(page)).toEqual(before);
      await expect(page.getByTestId("room-canvas").locator("canvas")).toBeFocused();
    }
    await page.screenshot({ path: `test-results/common-room/${info.project.name}-after-focus.png` });
  });
  test("guide is independently keyboard operable", async ({ page }) => {
    await signInFixture(page); await enterRoom(page);
    const summary = page.getByText("Explore the room", { exact: true }); await summary.focus(); await summary.press("Enter");
    const opener = page.getByRole("button", { name: "House Archives", exact: true });
    await page.keyboard.press("Tab"); await expect(opener).toBeFocused(); await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible(); await page.keyboard.press("Escape");
    await expect(page.getByTestId("common-room")).toHaveAttribute("data-phase", "exploring"); await expect(opener).toBeFocused();
  });
  test("resize with a panel open keeps content and restored room usable", async ({ page }) => {
    await signInFixture(page); await enterRoom(page); await pickObject(page, "notices");
    await expect(page.getByRole("dialog")).toBeVisible(); await page.setViewportSize({ width: 320, height: 740 });
    await expect(page.getByRole("button", { name: "Close Notice Board" })).toBeInViewport();
    await page.getByRole("button", { name: "Close Notice Board" }).click();
    await expect(page.getByTestId("common-room")).toHaveAttribute("data-phase", "exploring");
    for (const point of await anchors(page)) { expect(point[0]).toBeGreaterThan(0); expect(point[0]).toBeLessThan(320); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
});

test("entrance can skip immediately and Escape cancels object focus", async ({ page }) => {
  await signInFixture(page); await page.goto("/account");
  await expect(page.getByRole("button", { name: "Skip entrance" })).toBeVisible();
  await page.getByRole("button", { name: "Skip entrance" }).click({ clickCount: 2 });
  await expect(page.getByTestId("common-room")).toHaveAttribute("data-phase", "exploring");
  await pickObject(page, "members"); await page.keyboard.press("Escape");
  await expect(page.getByTestId("common-room")).toHaveAttribute("data-phase", "exploring");
  await pickObject(page, "profile"); await expect(page.getByRole("dialog")).toContainText("rowan@example.invalid");
});
test("camera parallax is damped and bounded; the guide preserves a non-default view", async ({ page }) => {
  await signInFixture(page); await enterRoom(page);
  const canvas = page.getByTestId("room-canvas"); const box = (await canvas.boundingBox())!;
  const before = await anchors(page);
  await page.mouse.move(box.width * .85, box.height * .32);
  await expect.poll(async () => Math.abs((await anchors(page))[0][0] - before[0][0])).toBeGreaterThan(2);
  const summary = page.getByText("Explore the room", { exact: true }); await summary.focus(); await summary.press("Enter");
  await expect(page.getByRole("navigation", { name: "Room objects" })).toBeVisible();
  const distance = (a: number[][], b: number[][]) => Math.max(...a.flatMap((point, i) => point.map((value, j) => Math.abs(value - b[i][j]))));
  let saved = await anchors(page), stable = 0;
  // Native details/toggle and the R3F renderer commit separately. Snapshot the
  // frozen projection, not a frame still queued before the guide's camera lock.
  await expect.poll(async () => { const next = await anchors(page); stable = distance(next, saved) < .05 ? stable + 1 : 0; saved = next; return stable; }, { intervals: [100, 200, 400] }).toBeGreaterThanOrEqual(3);
  for (let i = 0; i < saved.length; i++) expect(Math.abs(saved[i][0] - before[i][0])).toBeLessThan(140);
  await page.mouse.move(0, 0);
  await page.getByRole("button", { name: "House Archives", exact: true }).press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible(); await page.keyboard.press("Escape");
  await expect(page.getByTestId("common-room")).toHaveAttribute("data-phase", "exploring");
  // DOM projection rounds to subpixels; the numeric camera test remains exact.
  await expect.poll(async () => distance(await anchors(page), saved)).toBeLessThan(.05);
});
