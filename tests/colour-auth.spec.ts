import { expect, test } from "@playwright/test";
import { prepareFixture, signInFixture } from "./common-room/fixtures";

test("signed-in navigation keeps a full row and reachable account actions at very short heights", async ({ page }) => {
  await signInFixture(page, { house: "ravenclaw" });
  await page.setViewportSize({ width: 320, height: 240 });
  await page.goto("/contact", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Open navigation" }).click();
  const sheet = page.getByRole("dialog", { name: "Explore Technika" });
  await expect(sheet.getByRole("link", { name: "Dashboard", exact: true })).toBeVisible();
  const links = sheet.getByRole("navigation", { name: "Mobile navigation" });
  for (const height of [240, 200, 180]) {
    await page.setViewportSize({ width: 320, height });
    const contact = sheet.getByRole("link", { name: "Contact", exact: true });
    await contact.focus();
    const rowHeight = (await contact.boundingBox())!.height;
    expect(await links.evaluate((el) => el.clientHeight), `${height}px usable navigation`).toBeGreaterThanOrEqual(rowHeight);
    await expect(contact).toBeInViewport({ ratio: 1 });
    for (const name of ["Dashboard", "Register", "Your Common Room"]) {
      const action = sheet.getByRole("link", { name, exact: true });
      await action.focus();
      await expect(action).toBeInViewport({ ratio: 1 });
      expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await sheet.evaluate((el) => el.scrollWidth)).toBeLessThanOrEqual((await sheet.boundingBox())!.width);
  }
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Open navigation" })).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("a failed house save reports rollback and allows a successful retry", async ({ page }, info) => {
  await signInFixture(page, { house: "ravenclaw" });
  await page.goto("/contact", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-house", "ravenclaw");
  let fail = true;
  let releaseSave!: () => void;
  const pendingSave = new Promise<void>((resolve) => { releaseSave = resolve; });
  await page.route("**/rest/v1/profiles?**", async (route) => {
    if (route.request().method() !== "PATCH") return route.continue();
    await pendingSave;
    await route.fulfill({ status: fail ? 503 : 200, contentType: "application/json", body: JSON.stringify(fail ? { code: "XX000", message: "Fixture save unavailable" } : { house: "hufflepuff" }) });
  });
  const opener = page.getByRole("button", { name: "Change house" });
  // The development-only Next.js indicator overlays this fixed mobile button.
  // Use its real keyboard path here; production pointer coverage is separate.
  if (info.project.name === "mobile") { await opener.focus(); await opener.press("Enter"); }
  else await opener.click();
  const chooser = page.getByRole("dialog", { name: "Choose a house" });
  const hufflepuff = chooser.getByRole("button", { name: /Hufflepuff/i });
  await hufflepuff.click();
  await expect(chooser).toHaveAttribute("aria-busy", "true");
  await expect(opener).toBeFocused();
  await expect(hufflepuff).toBeDisabled();
  await expect(chooser.getByRole("status")).toContainText(/saving.*house/i);
  releaseSave();
  await expect(chooser).toHaveAttribute("aria-busy", "false");
  await expect(page.locator("html")).toHaveAttribute("data-house", "ravenclaw");
  expect(await page.evaluate(() => localStorage.getItem("technika:house:v1"))).toBe("ravenclaw");
  await expect(chooser.getByRole("status")).toContainText(/previous house.*restored/i);
  await expect(chooser.getByRole("status")).toContainText(/try again/i);
  await expect(hufflepuff).toBeEnabled();
  fail = false;
  await hufflepuff.click();
  await expect(chooser.getByRole("status")).toContainText("Hufflepuff is now saved to your profile.");
  await expect(page.locator("html")).toHaveAttribute("data-house", "hufflepuff");
  expect(await page.evaluate(() => localStorage.getItem("technika:house:v1"))).toBe("hufflepuff");
});

test("public hydration remains clean in development as page sections stream in", async ({ page }) => {
  await prepareFixture(page);
  const errors: string[] = [];
  let route = "";
  page.on("pageerror", (error) => errors.push(`${route}: ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error" && /hydrat|server rendered|children.*title|Minified React error/i.test(message.text())) errors.push(`${route}: ${message.text()}`); });
  for (route of ["/contact", "/delegate", "/marauders-map", "/members"]) {
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page.getByRole("navigation", { name: "Main Navigation" })).toHaveAttribute("aria-busy", "false");
  }
  expect(errors).toEqual([]);
});
