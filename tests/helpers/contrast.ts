import type { Locator } from "@playwright/test";

/** Conservative contrast over solid surfaces and every CSS gradient stop.
 * Browser canvas converts computed OKLCH colours to the sRGB WCAG space.
 * This does not claim to audit photographs, filters or overlaid siblings. */
export async function contrastOf(locator: Locator, backing: "black" | "white" | null = null) {
  return locator.evaluate((element, backing) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    const rgba = (value: string) => {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    };
    const blend = (top: number[], bottom: number[]) => [0, 1, 2].map((i) => top[i] * top[3] / 255 + bottom[i] * (1 - top[3] / 255)).concat(255);
    const luminance = (colour: number[]) => colour.slice(0, 3).map((v) => v / 255).map((v) => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    const ratio = (a: number[], b: number[]) => {
      const x = luminance(a), y = luminance(b);
      return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
    };
    const backgrounds = (node: Element | null): number[][] => {
      if (!node) return [[255, 255, 255, 255]];
      const css = getComputedStyle(node);
      const fill = rgba(css.backgroundColor);
      const under = node === element && backing ? [blend(fill, rgba(backing))] : fill[3] === 255 ? [fill] : backgrounds(node.parentElement).map((b) => blend(fill, b));
      const stops = css.backgroundImage.match(/(?:oklch|oklab|rgba?|color)\([^)]*\)/g);
      return stops ? stops.flatMap((stop) => under.map((b) => blend(rgba(stop), b))) : under;
    };
    const css = getComputedStyle(element);
    let inside = backgrounds(element);
    const bounds = element.getBoundingClientRect();
    // Full-cover decorative children can wash out an otherwise-safe fill.
    // Include their gradient stops when auditing the parent's visible label.
    for (const child of element.children) {
      const overlay = getComputedStyle(child);
      const rect = child.getBoundingClientRect();
      if (child.getAttribute("aria-hidden") !== "true" || overlay.position !== "absolute" || rect.width < bounds.width - 3 || rect.height < bounds.height - 3) continue;
      const fill = rgba(overlay.backgroundColor);
      const base = inside.map((bg) => blend(fill, bg));
      const stops = overlay.backgroundImage.match(/(?:oklch|oklab|rgba?|color)\([^)]*\)/g);
      inside = stops ? stops.flatMap((stop) => base.map((bg) => blend(rgba(stop), bg))) : base;
    }
    const outside = backgrounds(element.parentElement);
    return {
      text: Math.min(...inside.map((bg) => ratio(blend(rgba(css.color), bg), bg))),
      border: Math.min(...outside.map((bg) => ratio(blend(rgba(css.borderTopColor), bg), bg))),
      focus: Math.min(...outside.map((bg) => ratio(blend(rgba(css.outlineColor), bg), bg))),
      outlineWidth: parseFloat(css.outlineWidth),
      outlineStyle: css.outlineStyle,
      borderWidth: parseFloat(css.borderTopWidth),
      height: element.getBoundingClientRect().height,
      fill: css.backgroundColor,
      fillAlpha: rgba(css.backgroundColor)[3] / 255,
      backdrop: css.backdropFilter,
    };
  }, backing);
}
