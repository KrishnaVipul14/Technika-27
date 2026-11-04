import { expect, test, type Page } from "@playwright/test";
import { fixtureRequests, prepareFixture, setFixtureScenario, signInFixture } from "../common-room/fixtures";

async function openRegistry(page: Page) {
  await page.goto("/alumni", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("alumni-registry")).toBeVisible();
  await expect(page.getByTestId("alumni-registry")).toHaveAttribute("data-stage", /open|still/);
  await expect(page.getByRole("form", { name: "Alumni registration preview" })).toHaveAttribute("aria-busy", "false");
}

const profileWrites = (requests: Awaited<ReturnType<typeof fixtureRequests>>) =>
  requests.filter(({ method, path }) => path === "/rest/v1/profiles" && !["GET", "OPTIONS"].includes(method));

test.describe("alumni registry integration boundaries", () => {
  test.use({ reducedMotion: "reduce" });

  test("the public preview never submits details or represents an unavailable service as verification", async ({ page }) => {
    await prepareFixture(page);
    const mutations: string[] = [];
    page.on("request", (request) => {
      if (request.method() !== "GET" && /\/alumni(?:\/|$)/.test(new URL(request.url()).pathname)) mutations.push(request.url());
    });
    await openRegistry(page);
    const registry = page.getByTestId("alumni-registry");
    await expect(registry.getByRole("link", { name: "Sign in", exact: true })).toHaveAttribute("href", "/login");
    for (const label of ["Full Name", "Year of Graduation", "Contact Number", "Email Address", "Merchandise Size"]) {
      await expect(registry.getByLabel(label, { exact: true })).toBeVisible();
    }
    await expect(registry.getByRole("button", { name: "SEAL MY REGISTRATION", exact: true })).toBeDisabled();
    await expect(registry.getByLabel("Merchandise Size", { exact: true })).toBeEnabled();
    await expect(registry).toContainText("Alumni registration preview");
    await expect(registry).toContainText("Payment verification is not connected");
    await registry.getByLabel("Full Name", { exact: true }).fill("Avery Quill");
    await registry.getByLabel("Year of Graduation", { exact: true }).fill("2009");
    await registry.getByLabel("Contact Number", { exact: true }).fill("+44 7700 900123");
    await registry.getByLabel("Email Address", { exact: true }).fill("avery@example.invalid");
    await registry.getByLabel("Year of Graduation", { exact: true }).press("Enter");
    await registry.getByRole("form", { name: "Alumni registration preview" }).evaluate((form) => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    await expect(registry).not.toContainText("PAID & VERIFIED");
    expect(mutations).toEqual([]);
    expect(profileWrites(await fixtureRequests())).toEqual([]);
    await page.reload();
    await expect(registry.getByLabel("Full Name", { exact: true })).toHaveValue("");
    await expect(registry.getByLabel("Year of Graduation", { exact: true })).toHaveValue("");
  });

  test("reads only the signed-in profile, locks saved fields and clears private drafts on sign-out", async ({ page }) => {
    await signInFixture(page, { name: "Mira Finch", email: "mira@example.invalid" });
    await openRegistry(page);
    const registry = page.getByTestId("alumni-registry");
    await expect(registry.getByLabel("Full Name", { exact: true })).toHaveValue("Mira Finch");
    await expect(registry.getByLabel("Contact Number", { exact: true })).toHaveValue("PRIVATE_PHONE_FIXTURE");
    await expect(registry.getByLabel("Email Address", { exact: true })).toHaveValue("mira@example.invalid");
    for (const label of ["Full Name", "Contact Number", "Email Address"]) {
      await expect(registry.getByLabel(label, { exact: true })).toHaveJSProperty("readOnly", true);
    }
    const reads = (await fixtureRequests()).filter(({ path, query }) => path === "/rest/v1/profiles" && query.select === "full_name,phone");
    expect(reads.length).toBeGreaterThan(0);
    expect(reads.every(({ query }) => query.id === "eq.10000000-0000-4000-8000-000000000001")).toBe(true);
    // Being a BIT Patna profile does not invent an alumni eligibility restriction.
    await expect(registry.getByRole("form", { name: "Alumni registration preview" })).toBeVisible();
    await registry.getByLabel("Year of Graduation", { exact: true }).fill("2012");
    const isMobileViewport = await page.evaluate(() => window.innerWidth < 640);
    if (!isMobileViewport) {
      await page.locator("[data-testid='snake-scroll-canvas']").locator("..").evaluate((wrapper) => { wrapper.style.display = "none"; });
    }
    await registry.getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(registry.getByRole("link", { name: "Sign in", exact: true })).toBeVisible();
    await expect(registry.getByLabel("Full Name", { exact: true })).toHaveValue("");
    await expect(registry.getByLabel("Contact Number", { exact: true })).toHaveValue("");
    await expect(registry.getByLabel("Email Address", { exact: true })).toHaveValue("");
    await expect(registry.getByLabel("Year of Graduation", { exact: true })).toHaveValue("");
    await expect(page).toHaveURL(/\/alumni$/);
    expect(profileWrites(await fixtureRequests())).toEqual([]);
  });

  test("profile errors are retryable and never substitute editable auth metadata for saved details", async ({ page }) => {
    await signInFixture(page, { profileError: true, name: "Mira Finch" });
    await openRegistry(page);
    const registry = page.getByTestId("alumni-registry");
    await expect(registry).toContainText("Your saved profile could not be read");
    await expect(registry.getByLabel("Full Name", { exact: true })).toHaveValue("");
    await expect(registry).not.toContainText("Metadata Name");
    await setFixtureScenario({ profileError: false });
    await registry.getByRole("button", { name: "Retry profile", exact: true }).click();
    await expect(registry.getByLabel("Full Name", { exact: true })).toHaveValue("Mira Finch");
    await expect(registry.getByLabel("Full Name", { exact: true })).toHaveJSProperty("readOnly", true);
    expect(profileWrites(await fixtureRequests())).toEqual([]);
  });

  test("a missing profile stays honest and local preview fields retain native validation", async ({ page }) => {
    await signInFixture(page, { missing: true });
    await openRegistry(page);
    const registry = page.getByTestId("alumni-registry");
    await expect(registry).toContainText("No saved profile was found");
    await expect(registry.getByLabel("Full Name", { exact: true })).toHaveJSProperty("readOnly", false);
    await expect(registry.getByLabel("Email Address", { exact: true })).toHaveJSProperty("readOnly", true);
    const year = registry.getByLabel("Year of Graduation", { exact: true });
    await year.fill("20");
    expect(await year.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(false);
    await year.fill("1987");
    expect(await year.evaluate((input: HTMLInputElement) => input.checkValidity())).toBe(true);
    await expect(registry.getByRole("button", { name: "SEAL MY REGISTRATION", exact: true })).toBeDisabled();
  });

  test("the personalised acceptance preview is not a receipt and restores keyboard focus on close", async ({ page }) => {
    await prepareFixture(page);
    await openRegistry(page);
    const registry = page.getByTestId("alumni-registry");
    await registry.getByLabel("Full Name", { exact: true }).fill("Avery <script>Quill</script>");
    const preview = registry.getByRole("button", { name: "Preview acceptance letter", exact: true });
    await preview.click();
    const letter = page.getByRole("dialog", { name: "Acceptance letter preview", exact: true });
    await expect(letter).toBeVisible();
    await expect(letter).toContainText("Dear Avery <script>Quill</script>,");
    await expect(letter).toContainText("PREVIEW · NOT VERIFIED");
    await expect(letter).toContainText("not a registration confirmation or payment receipt");
    await expect(letter).not.toContainText("PAID & VERIFIED");
    expect(await letter.locator("script").count()).toBe(0);
    await page.keyboard.press("Escape");
    await expect(letter).not.toBeVisible();
    await expect(preview).toBeFocused();
    expect(profileWrites(await fixtureRequests())).toEqual([]);
  });

  test("the chamber remains readable at 320px and retains the original Pensieve archive", async ({ page }, info) => {
    await prepareFixture(page);
    await page.setViewportSize({ width: info.project.name === "mobile" ? 320 : 1440, height: 900 });
    await openRegistry(page);
    const registry = page.getByTestId("alumni-registry");
    await expect(registry).toHaveAttribute("data-stage", "still");
    await expect(registry.getByLabel("Full Name", { exact: true })).toHaveCSS("font-size", "16px");
    await expect(registry.getByRole("link", { name: "Open the Pensieve", exact: true })).toHaveAttribute("href", "#memories");
    await expect(registry.getByRole("link", { name: "Open the Pensieve", exact: true })).toHaveAttribute("href", "#memories");
    await expect(page.locator("#memories .memory-card")).toHaveCount(3);
    await page.locator("#memories").scrollIntoViewIfNeeded();
    await expect(page.locator("#memories .memory-card").first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    await page.screenshot({ path: `test-results/alumni/${info.project.name}-registry.png`, fullPage: true, scale: "css" });
    await registry.getByRole("button", { name: "Preview acceptance letter", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Acceptance letter preview", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    await page.screenshot({ path: `test-results/alumni/${info.project.name}-letter.png`, scale: "css" });
  });
});

test("alumni parchments unfold once and chamber ambience can be paused independently", async ({ page }) => {
  await prepareFixture(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/alumni", { waitUntil: "domcontentloaded" });
  const registry = page.getByTestId("alumni-registry");
  await expect(registry).toHaveAttribute("data-stage", "unfolding");
  await expect(registry).toHaveAttribute("data-stage", "open", { timeout: 12_000 });
  const paper = registry.locator("[data-parchment]").last();
  await expect(paper).toHaveCSS("opacity", "1");
  await registry.getByRole("button", { name: "Pause chamber ambience", exact: true }).click();
  await expect(registry).toHaveAttribute("data-paused", "true");
  await expect(registry.locator("[data-flame]").first()).toHaveCSS("animation-play-state", "paused");
  await registry.getByRole("button", { name: "Resume chamber ambience", exact: true }).click();
  await expect(registry).toHaveAttribute("data-paused", "false");
  await expect(paper).toHaveCSS("opacity", "1");
  expect(errors).toEqual([]);
});
