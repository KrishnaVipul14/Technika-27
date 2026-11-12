import { expect, test, type Page } from "@playwright/test";

async function arrive(page: Page, path = "/") {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  // The entry button is autofocus; Enter also handles a loader that already auto-dismissed.
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("h1")).toBeVisible();
  if (path === "/") await expect(page.locator(".hero-details")).toHaveCSS("opacity", "1");
}

test("arrival, home sections, timeline tabs, and real links work", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await arrive(page);
  await expect(page.locator("#hero-title")).toContainText("TECHNIKA");
  await page.getByRole("tab", { name: /DAY II ·/ }).click();
  await expect(page.getByRole("tabpanel", { name: /DAY II ·/ })).toContainText("Technical Events");
  await page.getByRole("tab", { name: /DAY II ·/ }).press("ArrowRight");
  await expect(page.getByRole("tabpanel", { name: /DAY III ·/ })).toContainText("Closing Ceremony");
  for (const id of ["about", "campus", "sponsors"]) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(page.locator(`#${id} h2`)).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test("login exposes the Supabase password recovery flow", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Forgot your password?" }).click();
  await expect(page.getByRole("heading", { name: /Recover your castle key/i })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send my reset letter" })).toBeVisible();
  await expect(page.getByText(/verified reset link/i)).toBeVisible();
});

test("Supabase auth callback keeps the password reset destination", async ({ request }) => {
  const response = await request.get("/auth/callback?next=%2Freset-password", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toMatch(/\/login\?error=reset$/);
});

test("house crest logo and website icons follow the equipped house", async ({ page }) => {
  await arrive(page);
  await page.getByRole("button", { name: "Change house" }).click();

  for (const house of ["gryffindor", "ravenclaw", "hufflepuff", "slytherin"]) {
    await page.getByRole("button", { name: new RegExp(house, "i") }).click();
    await expect(page.locator(`[data-house-logo="${house}"]`)).toHaveAttribute("src", new RegExp(`${house}\\.png`));
    await expect(page.locator('link[rel~="icon"]').first()).toHaveAttribute("href", new RegExp(`${house}\\.png`));
    await expect(page.locator('link[rel="apple-touch-icon"]').first()).toHaveAttribute("href", new RegExp(`${house}\\.png`));
  }
});

test("every themed portal is readable, images load, and layout fits", async ({ page }, testInfo) => {
  test.setTimeout(90000);
  for (const route of ["/", "/registrations", "/members", "/delegate", "/alumni", "/contact"]) {
    await page.goto(route);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator(route === "/" ? ".hero-details" : ".inner-hero")).toHaveCSS("opacity", "1");
    if (route !== "/") await expect(page.locator(".soon-badge")).toBeVisible();
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].filter((img) => img.loading !== "lazy").map((img) => img.decode().catch(() => {}))); });
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width, `${route} must fit ${testInfo.project.name}`).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    const broken = await page.evaluate(() => [...document.images].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.src));
    expect(broken).toEqual([]);
    await page.screenshot({ path: `test-results/${testInfo.project.name}-${route === "/" ? "home" : route.slice(1)}.png`, scale: "css" });
  }
});

test("mobile navigation supports opening, escape, and route changes", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await arrive(page);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.locator("#mobile-navigation")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-navigation")).toHaveCount(0);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.locator("#mobile-navigation").getByRole("link", { name: /Members/ }).click();
  await expect(page).toHaveURL(/\/members$/);
  await expect(page.locator("#mobile-navigation")).toHaveCount(0);
  await expect(page.locator("h1")).toContainText("The Order of Technika");
});

test("Marauder's Map searches, opens, and saves event entries", async ({ page }) => {
  await page.goto("/marauders-map", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Reveal the Marauder's Map/i }).click();
  await expect(page.locator(".map-event-card")).toHaveCount(27);
  await page.getByRole("button", { name: "Technical", exact: true }).click();
  await expect(page.locator(".map-event-card")).toHaveCount(10);
  await page.getByLabel("Search events").fill("Algo Apex");
  await expect(page.locator(".map-event-card")).toHaveCount(1);
  await page.getByRole("button", { name: /View details/ }).click();
  await expect(page.locator("#map-detail-title")).toHaveText("Algo Apex");
  await page.getByRole("button", { name: "Save event" }).click();
  await expect(page.getByRole("button", { name: "Saved to itinerary" })).toBeVisible();
  await expect(page.locator(".map-notice")).toContainText("saved to your itinerary");
});

test("chamber filters show the correct sealed portraits", async ({ page }) => {
  await arrive(page, "/members");
  await expect(page.locator(".order-card")).toHaveCount(8);
  await page.getByRole("button", { name: "Web Sorcerers", exact: true }).click();
  await expect(page.locator(".order-card")).toHaveCount(2);
  await expect(page.locator(".order-gallery")).toContainText("Chief Sorcerer");
  await expect(page.locator(".order-gallery")).toContainText("Grand Diviner");
  await page.getByRole("button", { name: "Complete chamber" }).click();
  await expect(page.locator(".order-card")).toHaveCount(8);
});

test("save the date downloads a real calendar and FAQs expand", async ({ page }) => {
  await arrive(page, "/registrations");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save the date" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("technika-27-save-the-date.ics");
  const stream = await download.createReadStream();
  let calendar = "";
  for await (const chunk of stream!) calendar += chunk.toString();
  expect(calendar).toContain("DTSTART;VALUE=DATE:20270108");
  expect(calendar).toContain("STATUS:TENTATIVE");
  await page.getByText("Can students from other colleges attend?", { exact: true }).click();
  await expect(page.getByText(/The delegate portal is being prepared/)).toBeVisible();
});

test("snitch is autonomous, and motion can be paused", async ({ page }) => {
  await arrive(page);
  const first = await page.locator(".flying-snitch").evaluate((el) => el.getAttribute("style"));
  await expect.poll(() => page.locator(".flying-snitch").evaluate((el) => el.getAttribute("style"))).not.toBe(first);
  await page.getByRole("button", { name: "Pause magical effects" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-magic", "off");
  const paused = await page.locator(".flying-snitch").evaluate((el) => el.getAttribute("style"));
  await page.waitForTimeout(200);
  expect(await page.locator(".flying-snitch").evaluate((el) => el.getAttribute("style"))).toBe(paused);
  await page.getByRole("button", { name: "Enable magical effects" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-magic", "on");
});

test("firework dragon is visible and grows down the page", async ({ page }) => {
  test.skip(page.viewportSize()!.width < 640, "the dragon scrollbar is a decorative desktop effect like the snake was");
  await arrive(page);
  const dragon = page.getByTestId("fireworks-dragon");
  await expect(dragon).toBeVisible();
  const startLength = Number(await dragon.getAttribute("data-dragon-length"));

  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await expect.poll(async () => Number(await dragon.getAttribute("data-dragon-length"))).toBeGreaterThan(startLength);
  await expect(dragon).toHaveAttribute("data-scroll-progress", "100");
});

test("reduced motion and narrow phone screens remain usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 320, height: 740 });
  await arrive(page);
  await expect(page.locator("html")).toHaveAttribute("data-magic", "off");
  for (const route of ["/", "/registrations", "/members", "/delegate", "/alumni", "/contact"]) {
    await page.goto(route);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth), route).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  }
});

test("the loading sequence reaches 100 before revealing the website", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { loaderValues: number[] };
    state.loaderValues = [];
    new MutationObserver(() => {
      const bar = document.querySelector('[role="progressbar"]');
      if (!bar) return;
      const value = Number(bar.getAttribute("aria-valuenow"));
      if (state.loaderValues.at(-1) !== value) state.loaderValues.push(value);
    }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-valuenow"] });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const values = await page.evaluate(() => (window as unknown as { loaderValues: number[] }).loaderValues);
  expect(values[0]).toBe(0);
  expect(values.at(-1)).toBe(100);
  expect(values.length).toBeGreaterThan(5);
  expect(values).toEqual([...values].sort((a, b) => a - b));
  await expect(page.locator(".hero-details")).toHaveCSS("opacity", "1");
});

test("GSAP castle parallax responds to scrolling", async ({ page }) => {
  await arrive(page);
  const before = await page.locator(".hero-castle").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
  await page.evaluate(() => window.scrollTo({ top: 420, behavior: "instant" }));
  await expect.poll(() => page.locator(".hero-castle").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42)).toBeGreaterThan(before + 50);
});

test("the autonomous snitch passes both in front of and behind the title", async ({ page }) => {
  await arrive(page);
  const snitch = page.locator(".flying-snitch");
  await expect(snitch).toBeVisible();
  const box = await snitch.boundingBox();
  expect(box?.width).toBeGreaterThan(90);
  await expect(page.locator(".snitch-realm")).toHaveAttribute("data-depth", "front");
  await expect(page.locator(".snitch-realm")).toHaveAttribute("data-depth", "behind", { timeout: 16000 });
});

test("explicit motion controls can override a reduced-motion system preference", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await arrive(page);
  await expect(page.getByRole("button", { name: "Enable magical effects" })).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "Enable magical effects" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-magic", "on");
  const first = await page.locator(".flying-snitch").getAttribute("style");
  await expect.poll(() => page.locator(".flying-snitch").getAttribute("style")).not.toBe(first);
  expect(await page.locator(".snitch-wing-left").evaluate((el) => getComputedStyle(el).animationDuration)).toBe("0.15s");
});

test("cards and buttons have visible hover microinteractions", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await arrive(page);
  const button = page.locator(".hero-actions .button-gold");
  const before = await button.evaluate((el) => getComputedStyle(el, "::after").transform);
  await button.hover();
  await expect.poll(() => button.evaluate((el) => getComputedStyle(el, "::after").transform)).not.toBe(before);
  const card = page.locator(".event-card").first();
  await card.scrollIntoViewIfNeeded();
  await card.hover();
  await expect(card).toHaveClass(/magic-card-active/);
  await expect.poll(() => card.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42)).toBeLessThan(-3);
  await page.getByRole("tab", { name: /DAY II ·/ }).click();
  const nextCard = page.locator(".event-card").first();
  await expect(nextCard).toContainText("Technical Events");
  await nextCard.hover();
  await expect(nextCard).toHaveClass(/magic-card-active/);
});

test("public routes ship unique server-side SEO and crawler documents", async ({ request }) => {
  const titles: string[] = [];
  const publicRoutes = ["/", "/marauders-map", "/events", "/technical", "/cultural", "/art-craft", "/frame-focus", "/esports", "/merchandise", "/core", "/devs", "/timeline", "/event-timeline", "/accommodation", "/registrations", "/members", "/delegate", "/delegate-registration", "/delegate-group-registration", "/alumni", "/contact", "/privacy-policy"];
  for (const route of publicRoutes) {
    const response = await request.get(route);
    expect(response.ok()).toBe(true);
    const html = await response.text();
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    expect(title).toBeTruthy();
    titles.push(title!);
    expect(html).toContain('name="description"');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('id="festival-site-schema"');
    if (route !== "/") expect(html).toContain('id="page-breadcrumbs"');
  }
  expect(new Set(titles).size).toBe(publicRoutes.length);
  const robots = await request.get("/robots.txt");
  const robotsText = await robots.text();
  if (process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    expect(robotsText).toContain("Allow: /");
    expect(robotsText).toContain("Sitemap:");
  } else {
    expect(robotsText).toContain("Disallow: /");
  }
  const sitemap = await request.get("/sitemap.xml");
  expect((await sitemap.text()).match(/<loc>/g)).toHaveLength(publicRoutes.length);
  const socialImage = await request.get("/images/social-card.jpg");
  expect(socialImage.headers()["content-type"]).toContain("image/jpeg");
});
