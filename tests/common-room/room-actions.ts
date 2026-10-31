import { expect, type Page } from "@playwright/test";

export const panels = { archives: "House Archives", notices: "Notice Board", members: "House Community", profile: "Your Belongings", secret: "Hidden Passage" };
export async function enterRoom(page: Page) {
  await page.goto("/account");
  await expect(page.getByTestId("common-room")).toHaveAttribute("data-phase", "exploring", { timeout: 25_000 });
}
export async function pickObject(page: Page, id: string, touch = false) {
  const box = await page.locator(`[data-object-anchor="${id}"]`).boundingBox();
  expect(box, `${id} has a projected world-space anchor`).not.toBeNull();
  const x = box!.x + box!.width / 2, y = box!.y + box!.height / 2;
  if (touch) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
}
export async function anchors(page: Page) {
  return page.locator("[data-object-anchor]").evaluateAll((nodes) => nodes.map((node) => { const box = node.getBoundingClientRect(); return [Math.round(box.x * 100) / 100, Math.round(box.y * 100) / 100]; }));
}
