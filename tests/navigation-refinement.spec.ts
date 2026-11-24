import { expect, test, type Page } from "@playwright/test";

async function visit(page: Page) {
  await page.goto("/contact", { waitUntil: "domcontentloaded" });
  await expect(page.locator("header")).toHaveCSS("opacity", "1");
  await expect(page.getByRole("navigation", { name: "Main Navigation" })).toHaveAttribute("aria-busy", "false");
}

async function observeDragonPaints(page: Page) {
  await page.addInitScript(() => {
    const state = window as unknown as { dragonPaints: number };
    state.dragonPaints = 0;
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.getAttribute("data-testid") === "snake-scroll-canvas") state.dragonPaints++;
      return clear.apply(this, args);
    };
  });
}

test("desktop sublinks open from the keyboard and Escape restores their toggle", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await visit(page);
  const nav = page.getByRole("navigation", { name: "Main Navigation" });
  const toggle = nav.getByRole("button", { name: "Show Registrations links" });
  await toggle.focus();
  await toggle.press("ArrowDown");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(nav.getByRole("link", { name: "Event registry", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.press("Space");
  await expect(nav.getByRole("link", { name: "Merchandise", exact: true })).toBeVisible();
  await page.locator("h1").click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(nav.getByRole("link", { name: "Contact", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Registrations", exact: true })).toHaveAttribute("href", "/registrations");
});

test("phone navigation contains focus, expands sublinks and returns focus on Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page);
  const opener = page.getByRole("button", { name: "Open navigation" });
  await opener.click();
  const sheet = page.getByRole("dialog", { name: "Explore Technika" });
  await expect(sheet).toBeVisible();
  await expect(opener).toHaveAttribute("aria-expanded", "true");
  await expect(sheet.getByRole("link", { name: "Sign In", exact: true })).toBeInViewport();
  await expect(sheet.getByRole("link", { name: "Merchandise", exact: true })).toBeHidden();
  await sheet.getByRole("button", { name: "Show Registrations links" }).click();
  await expect(sheet.getByRole("link", { name: "Merchandise", exact: true })).toBeVisible();
  await sheet.getByRole("button", { name: "Close navigation" }).focus();
  await page.keyboard.press("Shift+Tab");
  expect(await sheet.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(opener).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
  await opener.click();
  await page.getByRole("dialog").getByRole("link", { name: "Members", exact: true }).click();
  await expect(page).toHaveURL(/\/members$/);
  await expect(page.getByRole("dialog", { name: "Explore Technika" })).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("navigation fits intermediate widths and a resized sheet releases its scroll lock", async ({ page }) => {
  await visit(page);
  for (const width of [320, 390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const nav = page.getByRole("navigation", { name: "Main Navigation" });
    const bounds = await nav.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(await nav.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 768, height: 900 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.getByRole("dialog", { name: "Explore Technika" })).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("desktop dragon is keyboard operable and remains below the navbar", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Coarse-pointer devices use a passive dragon.");
  await page.setViewportSize({ width: 1440, height: 900 });
  await visit(page);
  const rail = page.getByRole("scrollbar", { name: "Page scroll" });
  await expect(rail).toBeVisible();
  const bounds = await rail.boundingBox();
  const navBounds = await page.getByRole("navigation", { name: "Main Navigation" }).boundingBox();
  expect(bounds!.y).toBeGreaterThan(navBounds!.y + navBounds!.height);
  await rail.focus();
  await rail.press("End");
  await expect(rail).toHaveAttribute("aria-valuenow", "100");
  await rail.press("Home");
  await expect(rail).toHaveAttribute("aria-valuenow", "0");
  await rail.press("PageDown");
  await expect.poll(async () => Number(await rail.getAttribute("aria-valuenow"))).toBeGreaterThan(0);
});

test("phone dragon stays visible without capturing page gestures", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page);
  const snake = page.getByTestId("scroll-snake");
  await expect(snake).toBeVisible();
  expect((await snake.boundingBox())!.width).toBeLessThanOrEqual(28);
  const control = page.locator('[aria-label="Page scroll"]');
  await expect(control).toBeHidden();
  const bounds = await snake.boundingBox();
  expect(await page.evaluate(({ x, y }) => !document.elementFromPoint(x, y)?.closest('[data-testid="scroll-snake"]'), {
    x: bounds!.x + bounds!.width / 2,
    y: bounds!.y + bounds!.height / 2,
  })).toBe(true);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await expect(snake).toHaveAttribute("data-scroll-progress", "100");
});

test("reduced-motion dragon paints only when progress changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await observeDragonPaints(page);
  await visit(page);
  const snake = page.getByTestId("scroll-snake");
  await expect(snake).toBeVisible();
  await expect(snake).toHaveAttribute("data-ready", "true");
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Canvas availability changes native-scrollbar layout. Drain its initial
    // ResizeObserver/invalidation frame before measuring stationary idle work.
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    (window as unknown as { dragonPaints: number }).dragonPaints = 0;
  });
  // An idle interval proves the decorative canvas is not running continuously.
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as unknown as { dragonPaints: number }).dragonPaints)).toBe(0);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await expect(snake).toHaveAttribute("data-scroll-progress", "100");
});

test("failed canvas restores native scrolling and removes the invisible custom control", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof getContext>) {
      if (this.getAttribute("data-testid") === "snake-scroll-canvas") return null;
      return getContext.apply(this, args);
    } as typeof getContext;
  });
  await visit(page);
  await expect(page.getByTestId("scroll-snake")).toBeHidden();
  await expect(page.getByRole("scrollbar", { name: "Page scroll" })).toBeHidden();
  await expect(page.locator("html")).not.toHaveCSS("scrollbar-width", "none");
  expect(await page.locator("html").evaluate((el) => getComputedStyle(el, "::-webkit-scrollbar").display)).not.toBe("none");
});

test("moving between hovered submenus does not close the new menu", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await visit(page);
  const nav = page.getByRole("navigation", { name: "Main Navigation" });
  await nav.getByRole("link", { name: "Registrations", exact: true }).hover();
  await nav.getByRole("link", { name: "Members", exact: true }).hover();
  // The old menu's delayed dismissal must not affect the newly opened menu.
  await page.waitForTimeout(250);
  await expect(nav.getByRole("button", { name: "Show Members links" })).toHaveAttribute("aria-expanded", "true");
});

test("pointer hovering another submenu preserves the keyboard-focused submenu", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await visit(page);
  const nav = page.getByRole("navigation", { name: "Main Navigation" });
  const toggle = nav.getByRole("button", { name: "Show Registrations links" });
  await toggle.focus();
  await toggle.press("ArrowDown");
  await nav.getByRole("link", { name: "Members", exact: true }).hover();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(nav.getByRole("link", { name: "Event registry", exact: true })).toBeFocused();
});

test("keyboard focus entering a submenu cancels its pending pointer dismissal", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await visit(page);
  const nav = page.getByRole("navigation", { name: "Main Navigation" });
  const toggle = nav.getByRole("button", { name: "Show Registrations links" });
  await toggle.hover();
  await page.mouse.move(500, 300);
  await toggle.focus();
  await toggle.press("ArrowDown");
  const firstLink = nav.getByRole("link", { name: "Event registry", exact: true });
  await expect(firstLink).toBeFocused();
  await page.waitForTimeout(250);
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(firstLink).toBeFocused();
});

test("dragon dragging reaches both endpoints and releases pointer capture", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "Coarse-pointer devices use a passive dragon.");
  await visit(page);
  const rail = page.getByRole("scrollbar", { name: "Page scroll" });
  await expect(rail).toBeVisible();
  const bounds = (await rail.boundingBox())!;
  const x = bounds.x + bounds.width / 2;
  await page.mouse.move(x, bounds.y + 10);
  await page.mouse.down();
  await page.mouse.move(x, bounds.y + bounds.height - 10, { steps: 12 });
  await expect(rail).toHaveAttribute("aria-valuenow", "100");
  await page.mouse.move(x, bounds.y + 10, { steps: 12 });
  await expect(rail).toHaveAttribute("aria-valuenow", "0");
  await page.mouse.up();
  await expect(page.getByTestId("scroll-snake")).not.toHaveAttribute("data-dragging", "true");
});

test("live reduced-motion changes stop and restart the dragon's idle painting", async ({ page }) => {
  await observeDragonPaints(page);
  await visit(page);
  await expect(page.getByTestId("scroll-snake")).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { dragonPaints: number }).dragonPaints)).toBeGreaterThan(2);
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Allow the media-change invalidation frame, then measure an idle interval.
  await page.waitForTimeout(100);
  const first = await page.evaluate(() => (window as unknown as { dragonPaints: number }).dragonPaints);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as unknown as { dragonPaints: number }).dragonPaints)).toBe(first);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(() => page.evaluate(() => (window as unknown as { dragonPaints: number }).dragonPaints)).toBeGreaterThan(first + 2);
});

test("high-contrast mode uses native scrolling and keeps navigation controls visible", async ({ page }) => {
  await visit(page);
  await expect(page.getByTestId("scroll-snake")).toBeVisible();
  await page.emulateMedia({ forcedColors: "active" });
  await expect(page.getByTestId("scroll-snake")).toBeHidden();
  await expect(page.locator("html")).toHaveCSS("scrollbar-width", "auto");
  expect(await page.locator("html").evaluate((el) => getComputedStyle(el, "::-webkit-scrollbar").display)).not.toBe("none");
  await page.setViewportSize({ width: 390, height: 844 });
  const opener = page.getByRole("button", { name: "Open navigation" });
  await opener.click();
  const sheet = page.getByRole("dialog", { name: "Explore Technika" });
  await expect(sheet).toBeVisible();
  const systemColor = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "ButtonText";
    document.body.appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  });
  await expect(sheet.getByRole("button", { name: "Show Registrations links" }).locator("svg")).toHaveCSS("color", systemColor);
  await page.keyboard.press("Escape");
  await expect(opener).toBeFocused();
});

test("dragon settles after its brief entrance and wakes when the page scrolls", async ({ page }) => {
  await observeDragonPaints(page);
  await visit(page);
  await expect(page.getByTestId("scroll-snake")).toBeVisible();
  // The decorative entrance lasts three seconds; it must not loop indefinitely.
  await page.waitForTimeout(3250);
  const first = await page.evaluate(() => (window as unknown as { dragonPaints: number }).dragonPaints);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => (window as unknown as { dragonPaints: number }).dragonPaints)).toBe(first);
  await page.evaluate(() => window.scrollTo({ top: 200, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => (window as unknown as { dragonPaints: number }).dragonPaints)).toBeGreaterThan(first + 2);
});

test("dragon recalculates progress when page content changes without a scroll event", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await visit(page);
  const snake = page.getByTestId("scroll-snake");
  await expect(snake).toBeVisible();
  await page.evaluate(() => {
    // Native scroll anchoring otherwise follows the footer to the new bottom
    // on phones. Isolate a height change without changing the scroll offset.
    document.documentElement.style.overflowAnchor = "none";
    document.querySelector<HTMLElement>("#main-content")!.style.minHeight = "6000px";
  });
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await expect(snake).toHaveAttribute("data-scroll-progress", "100");
  await page.evaluate(() => { document.querySelector<HTMLElement>("#main-content")!.style.minHeight = "12000px"; });
  await expect.poll(async () => Number(await snake.getAttribute("data-scroll-progress"))).toBeLessThan(60);
  await expect.poll(async () => Number(await snake.getAttribute("data-scroll-progress"))).toBeGreaterThan(1);
});
