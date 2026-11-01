import { test, expect } from "@playwright/test";
import { signInFixture } from "./fixtures";
import { enterRoom } from "./room-actions";
import { installRuntimeProbe, runtimeSnapshot, setRoomVisibility } from "./runtime-probe";

test.describe("room settings and audio", () => {
  test.use({ reducedMotion: "reduce" });
  test("audio stays off until opt-in; one context, mute, visibility and cleanup", async ({ page }) => {
    await installRuntimeProbe(page); await signInFixture(page); await enterRoom(page);
    expect((await runtimeSnapshot(page)).states).toEqual([]);
    await page.getByRole("button", { name: "Room settings", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Room settings", exact: true })).toBeVisible();
    await expect(page.getByLabel("Ambient sound", { exact: true })).not.toBeChecked();
    await expect(page.getByLabel("Object sounds", { exact: true })).not.toBeChecked();
    await page.getByLabel("Ambient sound", { exact: true }).check();
    await expect.poll(async () => (await runtimeSnapshot(page)).states).toEqual(["running"]);
    await page.getByLabel("Object sounds", { exact: true }).check();
    await page.getByLabel("Ambient sound", { exact: true }).uncheck();
    expect((await runtimeSnapshot(page)).states).toEqual(["running"]);
    await page.getByLabel("Object sounds", { exact: true }).uncheck();
    await expect.poll(async () => (await runtimeSnapshot(page)).states).toEqual(["suspended"]);
    await page.getByLabel("Ambient sound", { exact: true }).check();
    await setRoomVisibility(page, true);
    await expect.poll(async () => (await runtimeSnapshot(page)).states).toEqual(["suspended"]);
    await setRoomVisibility(page, false);
    expect((await runtimeSnapshot(page)).states).toEqual(["suspended"]);
    await page.getByRole("button", { name: "Resume sound" }).click();
    await expect.poll(async () => (await runtimeSnapshot(page)).states).toEqual(["running"]);
    await page.getByRole("button", { name: "Close Room settings" }).click();
    await page.getByRole("link", { name: "Leave the room" }).click();
    await expect(page).toHaveURL(/\/$/, { timeout: 30_000 });
    await expect.poll(async () => (await runtimeSnapshot(page)).states).toEqual(["closed"]);
  });
  test("settings persist visuals only, support reading mode and isolate the motion override", async ({ page }) => {
    await installRuntimeProbe(page); await signInFixture(page); await enterRoom(page);
    await expect(page.getByTestId("common-room")).toHaveAttribute("data-motion", "false");
    await page.getByRole("button", { name: "Room settings", exact: true }).click();
    await page.getByLabel("Rendering quality").selectOption("low");
    await page.getByRole("combobox", { name: "Motion", exact: true }).selectOption("on");
    await expect(page.getByTestId("common-room")).toHaveAttribute("data-motion", "true");
    await page.getByRole("combobox", { name: "Motion", exact: true }).selectOption("off");
    await page.getByLabel("Reading mode", { exact: true }).check();
    await page.getByRole("button", { name: "Close Room settings" }).click();
    await expect(page.getByTestId("room-canvas")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("button", { name: "House Archives", exact: true })).toBeVisible();
    await expect(page.getByTestId("common-room")).toHaveAttribute("data-quality", "low");
    await page.getByRole("button", { name: "House Archives", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible(); await page.keyboard.press("Escape");
    expect((await runtimeSnapshot(page)).states).toEqual([]);
    await page.getByRole("button", { name: "Try the 3D room" }).click();
    await expect(page.getByTestId("common-room")).toHaveAttribute("data-ready", "true");
    await expect(page.getByTestId("room-canvas").locator("canvas")).toBeVisible();
  });
  test("pending audio acknowledgement cannot lock resume or roll back visual preferences", async ({ page }) => {
    await installRuntimeProbe(page); await signInFixture(page);
    await page.addInitScript(() => {
      const resume = AudioContext.prototype.resume;
      AudioContext.prototype.resume = function () {
        void resume.call(this).catch(() => {}); // Keep the real audio operation; delay only its acknowledgement.
        return new Promise<void>((_, reject) => window.addEventListener("room-test-reject", () => reject(new DOMException("Resume interrupted", "NotAllowedError")), { once: true }));
      };
    });
    await enterRoom(page); await page.getByRole("button", { name: "Room settings", exact: true }).click();
    await page.getByRole("combobox", { name: "Rendering quality" }).selectOption("low");
    await page.getByLabel("Ambient sound", { exact: true }).check();
    await expect.poll(async () => (await runtimeSnapshot(page)).states).toEqual(["running"]);
    await page.getByRole("combobox", { name: "Rendering quality" }).selectOption("high");
    await setRoomVisibility(page, true); await setRoomVisibility(page, false);
    await expect(page.getByRole("button", { name: "Resume sound" })).toBeEnabled();
    await page.evaluate(() => window.dispatchEvent(new Event("room-test-reject")));
    await expect(page.getByLabel("Ambient sound", { exact: true })).not.toBeChecked();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem("technika:common-room:v1")!).quality)).toBe("high");
  });
  test("unsupported audio is nonfatal and stale stored audio is ignored", async ({ page }) => {
    await signInFixture(page);
    await page.addInitScript(() => { Object.defineProperty(window, "AudioContext", { value: undefined }); localStorage.setItem("technika:common-room:v1", JSON.stringify({ quality: "invented", motion: "system", ambient: true, effects: true })); });
    await enterRoom(page); await page.getByRole("button", { name: "Room settings", exact: true }).click();
    await expect(page.getByLabel("Ambient sound", { exact: true })).not.toBeChecked();
    await page.getByLabel("Ambient sound", { exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Audio could not be started");
    await expect(page.getByLabel("Ambient sound", { exact: true })).not.toBeChecked();
    await page.getByRole("button", { name: "Close Room settings" }).click();
    await expect(page.getByTestId("room-canvas")).toBeVisible();
  });
});
