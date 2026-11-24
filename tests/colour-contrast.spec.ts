import { expect, test, type Locator, type Page } from "@playwright/test";
import { contrastOf } from "./helpers/contrast";

async function visit(page: Page, route = "/delegate") {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  if (route === "/") {
    const skip = page.getByRole("button", { name: "Skip to castle scene" });
    if (await skip.isVisible()) await skip.click();
  }
  await expect(page.getByRole("navigation", { name: "Main Navigation" })).toHaveAttribute("aria-busy", "false");
  await expect(page.getByRole("navigation", { name: "Main Navigation" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function settle(locator: Locator) {
  await locator.evaluate(async (el) => {
    await Promise.all(el.getAnimations({ subtree: true }).filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity).map((animation) => animation.finished.catch(() => {})));
  });
}

async function selectHouse(page: Page, house: string) {
  const opener = page.getByRole("button", { name: "Change house" });
  await opener.click();
  await page.getByRole("dialog", { name: "Choose a house" }).getByRole("button", { name: new RegExp(house, "i") }).click();
  if (await page.getByRole("dialog", { name: "Choose a house" }).count()) await opener.click();
  await expect(page.locator("html")).toHaveAttribute("data-house", house);
  await settle(page.locator("body"));
}

test("shared primary buttons retain AA contrast in every house and interaction state", async ({ page }) => {
  await visit(page);
  const button = page.getByRole("button", { name: "Mark your grand arrival" });
  for (const house of ["default", "gryffindor", "slytherin", "ravenclaw", "hufflepuff"]) {
    if (house !== "default") await selectHouse(page, house);
    for (const state of ["normal", "hover", "pressed", "focused"] as const) {
      await page.mouse.move(0, 0);
      if (state === "hover" || state === "pressed") await button.hover();
      if (state === "pressed") await page.mouse.down();
      if (state === "focused") { await page.keyboard.press("Tab"); await button.focus(); }
      await settle(button);
      const contrast = await contrastOf(button);
      expect(contrast.text, `${house}/${state} text contrast`).toBeGreaterThanOrEqual(4.5);
      expect(contrast.border, `${house}/${state} control border`).toBeGreaterThanOrEqual(3);
      expect(contrast.height).toBeGreaterThanOrEqual(44);
      if (state === "focused") {
        expect(contrast.outlineWidth).toBeGreaterThanOrEqual(2);
        expect(contrast.outlineStyle).not.toBe("none");
        expect(contrast.focus).toBeGreaterThanOrEqual(3);
      }
      if (state === "pressed") { await page.mouse.move(0, 0); await page.mouse.up(); }
      await button.evaluate((el) => (el as HTMLElement).blur());
    }
  }
});

test("secondary buttons and navbar controls have distinguishable borders in all houses", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await visit(page);
  const nav = page.getByRole("navigation", { name: "Main Navigation" });
  for (const house of ["default", "gryffindor", "slytherin", "ravenclaw", "hufflepuff"]) {
    if (house !== "default") await selectHouse(page, house);
    for (const control of [page.getByRole("link", { name: "Delegate registration", exact: true }), nav.getByRole("link", { name: "Sign In", exact: true }), nav.getByRole("link", { name: "Register", exact: true })]) {
      for (const state of ["normal", "hover", "pressed", "focused"] as const) {
        await page.mouse.move(0, 0);
        if (state === "hover" || state === "pressed") await control.hover();
        if (state === "pressed") await page.mouse.down();
        if (state === "focused") { await page.keyboard.press("Tab"); await control.focus(); }
        await settle(control);
        const contrast = await contrastOf(control);
        expect(contrast.text, `${house}/${state} text`).toBeGreaterThanOrEqual(4.5);
        expect(contrast.borderWidth, `${house} control border`).toBeGreaterThanOrEqual(1);
        expect(contrast.border, `${house}/${state} control contrast`).toBeGreaterThanOrEqual(3);
        if (state === "focused") {
          expect(contrast.outlineWidth).toBeGreaterThanOrEqual(2);
          expect(contrast.outlineStyle).not.toBe("none");
          expect(contrast.focus).toBeGreaterThanOrEqual(3);
        }
        if (state === "pressed") { await page.mouse.move(0, 0); await page.mouse.up(); }
        await control.evaluate((element) => (element as HTMLElement).blur());
      }
    }
  }
});

test("short landscape navigation keeps rows and account actions usable with a visible scrollbar", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 240 });
  await visit(page, "/contact");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const sheet = page.getByRole("dialog", { name: "Explore Technika" });
  const links = sheet.getByRole("navigation", { name: "Mobile navigation" });
  await settle(sheet);
  expect((await links.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await links.evaluate((el) => getComputedStyle(el, "::-webkit-scrollbar").display)).not.toBe("none");
  await expect(links).toHaveCSS("scrollbar-width", "thin");
  await sheet.getByRole("link", { name: "Sign In", exact: true }).scrollIntoViewIfNeeded();
  await expect(sheet.getByRole("link", { name: "Sign In", exact: true })).toBeInViewport();
  await sheet.getByRole("link", { name: "Contact", exact: true }).focus();
  await expect(sheet.getByRole("link", { name: "Contact", exact: true })).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");
});

test("house chooser supports keyboard dismissal and restores its opener", async ({ page }) => {
  await visit(page, "/contact");
  const opener = page.getByRole("button", { name: "Change house" });
  await opener.click();
  const chooser = page.getByRole("dialog", { name: "Choose a house" });
  await chooser.getByRole("button", { name: /Gryffindor/i }).focus();
  await page.keyboard.press("Escape");
  await expect(chooser).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("house chooser dismisses when keyboard focus leaves without stealing it", async ({ page }) => {
  await visit(page, "/contact");
  await page.getByRole("button", { name: "Change house" }).click();
  const nav = page.getByRole("navigation", { name: "Main Navigation" });
  await nav.getByRole("link", { name: "Home", exact: true }).first().focus();
  await expect(page.getByRole("dialog", { name: "Choose a house" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Home", exact: true }).first()).toBeFocused();
});

test("outside dismissal restores the house opener when a heading cannot receive focus", async ({ page }) => {
  await visit(page, "/contact");
  const opener = page.getByRole("button", { name: "Change house" });
  await opener.click();
  await expect(page.getByRole("dialog", { name: "Choose a house" }).getByRole("button", { name: /Gryffindor/i })).toBeFocused();
  await page.locator("h1").click();
  await expect(page.getByRole("dialog", { name: "Choose a house" })).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("shared action icons remain visible in forced-colors mode", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await visit(page);
  const button = page.getByRole("button", { name: "Mark your grand arrival" });
  const colour = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.color = "ButtonText";
    document.body.append(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return value;
  });
  await expect(button.locator("svg")).toHaveCSS("color", colour);
  expect((await contrastOf(button)).borderWidth).toBeGreaterThanOrEqual(1);
});

test("non-Vercel preview does not request a missing analytics endpoint", async ({ page }) => {
  test.skip(process.env.VERCEL === "1", "Vercel deployments serve the analytics endpoint.");
  const missing: string[] = [];
  page.on("response", (response) => { if (response.status() >= 400 && response.url().includes("/_vercel/")) missing.push(response.url()); });
  await visit(page, "/contact");
  await page.waitForLoadState("networkidle");
  expect(missing).toEqual([]);
});

test("public page decorations do not race React hydration", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat|server rendered|Minified React error/i.test(message.text())) errors.push(message.text());
  });
  for (const route of ["/contact", "/delegate", "/marauders-map", "/members"]) {
    await visit(page, route);
    await page.waitForLoadState("networkidle");
  }
  expect(errors).toEqual([]);
});

test("reduced motion leaves public reveals and parallax stationary", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await visit(page, "/contact");
  await expect(page.locator(".owl-moon")).toHaveCSS("transform", "none");
  await page.locator(".owl-art").scrollIntoViewIfNeeded();
  await expect(page.locator(".owl-art")).toHaveCSS("opacity", "1");
  await expect(page.locator(".owl-art")).toHaveCSS("transform", "none");
  await expect(page.locator(".owl-moon")).toHaveCSS("transform", "none");
});

test("disabled shared buttons do not look active on hover", async ({ page }) => {
  await visit(page);
  const button = page.getByRole("button", { name: "Mark your grand arrival" });
  // A native disabled fixture exercises the shared CSS, not calendar logic.
  await button.evaluate((element) => { (element as HTMLButtonElement).disabled = true; });
  const before = await contrastOf(button);
  expect(before.text).toBeGreaterThanOrEqual(4.5);
  await button.hover();
  expect((await contrastOf(button)).fill).toBe(before.fill);
  await expect(button).toHaveCSS("cursor", "not-allowed");
  await expect(button).toHaveCSS("transform", "none");
});

test("homepage calls to action do not lose contrast under decorative overlays", async ({ page }) => {
  await visit(page, "/");
  await expect(page.locator(".hero-details")).toHaveCSS("opacity", "1");
  const primary = page.locator(".hero-actions").getByRole("link", { name: "Register now", exact: true });
  const secondary = page.locator(".hero-actions").getByRole("link", { name: "Explore the events", exact: true });
  for (const house of ["default", "gryffindor", "slytherin", "ravenclaw", "hufflepuff"]) {
    if (house !== "default") await selectHouse(page, house);
    for (const control of [primary, secondary]) {
      await control.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await settle(control);
      const contrast = await contrastOf(control);
      expect(contrast.text, `${house} home action text`).toBeGreaterThanOrEqual(4.5);
      expect(contrast.border, `${house} home action outline`).toBeGreaterThanOrEqual(3);
      expect(contrast.height).toBeGreaterThanOrEqual(44);
    }
  }
});

test("navbar, actions and house chooser use genuine frosted glass", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await visit(page);
  const nav = page.getByRole("navigation", { name: "Main Navigation" });
  const opener = page.getByRole("button", { name: "Change house" });
  const surfaces = [nav, page.getByRole("button", { name: "Mark your grand arrival" }), page.getByRole("link", { name: "Delegate registration", exact: true }), nav.getByRole("link", { name: "Register", exact: true }), opener];
  for (const surface of surfaces) {
    const material = await contrastOf(surface);
    expect(material.fillAlpha).toBeGreaterThan(0);
    expect(material.fillAlpha).toBeLessThan(1);
    expect(material.backdrop).toContain("blur(");
  }
  await opener.click();
  const panel = page.getByRole("dialog", { name: "Choose a house" });
  expect((await contrastOf(panel)).fillAlpha).toBeLessThan(1);
  expect((await contrastOf(panel)).backdrop).toContain("blur(");
});

test("glass controls retain AA text over the brightest and darkest possible backdrops", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await visit(page);
  const nav = page.getByRole("navigation", { name: "Main Navigation" });
  const controls = [page.getByRole("button", { name: "Mark your grand arrival" }), page.getByRole("link", { name: "Delegate registration", exact: true }), nav.getByRole("link", { name: "Register", exact: true }), nav.getByRole("link", { name: "Sign In", exact: true })];
  for (const house of ["default", "gryffindor", "slytherin", "ravenclaw", "hufflepuff"]) {
    if (house !== "default") await selectHouse(page, house);
    for (const control of controls) {
      for (const state of ["normal", "hover", "pressed"] as const) {
        await page.mouse.move(0, 0);
        if (state !== "normal") await control.hover();
        if (state === "pressed") await page.mouse.down();
        for (const backing of ["black", "white"] as const) {
          expect((await contrastOf(control, backing)).text, `${house}/${state}/${backing} text`).toBeGreaterThanOrEqual(4.5);
        }
        if (state === "pressed") { await page.mouse.move(0, 0); await page.mouse.up(); }
      }
    }
  }
});

test("map parchment actions preserve matched text and fill colours in every state", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await visit(page, "/marauders-map");
  const arrival = page.getByRole("button", { name: /Reveal the Marauder's Map/i });
  // The map preface covers the house chooser: isolated theme scoping exercises
  // the real shared controls without dismissing the preface to change themes.
  for (const theme of ["hogwarts", "gryffindor", "slytherin", "ravenclaw", "hufflepuff"]) {
    await page.locator(".marauders-page").evaluate((el, theme) => el.setAttribute("data-theme", theme), theme);
    for (const state of ["normal", "hover", "pressed"] as const) {
      await page.mouse.move(0, 0);
      if (state !== "normal") await arrival.hover();
      if (state === "pressed") await page.mouse.down();
      expect((await contrastOf(arrival)).text, `${theme}/${state} preface action`).toBeGreaterThanOrEqual(4.5);
      if (state === "pressed") { await page.mouse.move(0, 0); await page.mouse.up(); }
    }
  }
  await arrival.click();
  await page.getByRole("button", { name: /View details/ }).first().click();
  const path = page.locator(".map-detail-actions").getByRole("button", { name: "Reveal My Path" });
  for (const theme of ["hogwarts", "gryffindor", "slytherin", "ravenclaw", "hufflepuff"]) {
    await page.locator(".marauders-page").evaluate((el, theme) => el.setAttribute("data-theme", theme), theme);
    for (const state of ["normal", "hover", "pressed"] as const) {
      await page.mouse.move(0, 0);
      if (state !== "normal") await path.hover();
      if (state === "pressed") await page.mouse.down();
      expect((await contrastOf(path)).text, `${theme}/${state} path action`).toBeGreaterThanOrEqual(4.5);
      if (state === "pressed") { await page.mouse.move(0, 0); await page.mouse.up(); }
    }
  }
});

test("in-flight card hover cannot reapply transforms after reduced-motion cleanup", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "Fine-pointer hover only.");
  await visit(page, "/members");
  const card = page.locator(".order-card").first();
  await card.scrollIntoViewIfNeeded();
  await card.hover();
  await expect(card).toHaveClass(/magic-card-active/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(card).not.toHaveClass(/magic-card-active/);
  const transforms = await card.evaluate(async (el) => {
    const values: string[] = [];
    for (let i = 0; i < 35; i++) {
      await new Promise(requestAnimationFrame);
      values.push(getComputedStyle(el).transform);
    }
    return values;
  });
  expect(transforms.every((value) => value === "none")).toBe(true);
});

test("hero hover lighting is removed when reduced motion becomes active", async ({ page }, info) => {
  test.skip(info.project.name === "mobile", "Fine-pointer hover only.");
  await visit(page, "/");
  await expect(page.locator(".hero-details")).toHaveCSS("opacity", "1");
  const hero = page.locator(".hero");
  // Skipping the intro leaves the pointer inside the hero before its listeners
  // attach. Enter from the sibling navbar to exercise a real pointerenter.
  await page.getByRole("navigation", { name: "Main Navigation" }).hover();
  await hero.hover({ position: { x: 150, y: 300 } });
  await expect(hero).toHaveClass(/hero-depth-active/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(hero).not.toHaveClass(/hero-depth-active/);
  expect(await hero.evaluate((el) => el.style.getPropertyValue("--hero-light-x"))).toBe("");
  expect(await hero.evaluate((el) => el.style.getPropertyValue("--hero-light-y"))).toBe("");
});

test("reduced transparency uses an opaque unblurred fallback", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
  await visit(page);
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-transparency: reduce)").matches)).toBe(true);
  for (const surface of [page.getByRole("navigation", { name: "Main Navigation" }), page.getByRole("button", { name: "Mark your grand arrival" }), page.getByRole("link", { name: "Delegate registration", exact: true }), page.getByRole("button", { name: "Change house" })]) {
    const material = await contrastOf(surface);
    expect(material.fillAlpha).toBe(1);
    expect(material.backdrop).toBe("none");
    expect(material.text).toBeGreaterThanOrEqual(4.5);
  }
});

test("parchment actions also honour the reduced-transparency fallback", async ({ page }) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
  await visit(page, "/marauders-map");
  const arrival = page.getByRole("button", { name: /Reveal the Marauder's Map/i });
  expect((await contrastOf(arrival)).fillAlpha).toBe(1);
  expect((await contrastOf(arrival)).text).toBeGreaterThanOrEqual(4.5);
  await arrival.click();
  await page.getByRole("button", { name: /View details/ }).first().click();
  const path = page.locator(".map-detail-actions").getByRole("button", { name: "Reveal My Path" });
  expect((await contrastOf(path)).fillAlpha).toBe(1);
  expect((await contrastOf(path)).text).toBeGreaterThanOrEqual(4.5);
});
