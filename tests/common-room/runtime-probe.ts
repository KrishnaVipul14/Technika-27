import type { Page } from "@playwright/test";

export async function installRuntimeProbe(page: Page) {
  await page.addInitScript(() => {
    const probe = { audio: [] as AudioContext[], draws: 0 };
    Object.defineProperty(window, "roomRuntimeProbe", { value: probe });
    const Native = window.AudioContext;
    if (Native) window.AudioContext = class extends Native { constructor(options?: AudioContextOptions) { super(options); probe.audio.push(this); } };
    for (const context of [window.WebGLRenderingContext, window.WebGL2RenderingContext].filter(Boolean)) {
      const elements = context.prototype.drawElements, arrays = context.prototype.drawArrays;
      context.prototype.drawElements = function (...args) { probe.draws++; return elements.apply(this, args); };
      context.prototype.drawArrays = function (...args) { probe.draws++; return arrays.apply(this, args); };
    }
  });
}
export async function runtimeSnapshot(page: Page) {
  return page.evaluate(() => { const probe = (window as unknown as { roomRuntimeProbe: { audio: AudioContext[]; draws: number } }).roomRuntimeProbe; return { states: probe.audio.map((context) => context.state), draws: probe.draws }; });
}
export async function setRoomVisibility(page: Page, hidden: boolean) {
  await page.evaluate((hidden) => { Object.defineProperty(document, "hidden", { configurable: true, value: hidden }); document.dispatchEvent(new Event("visibilitychange")); }, hidden);
}
