import { gsap } from "gsap";

/** Values shared between the GSAP master timeline and the R3F room (read in useFrame, never React state). */
export type LetterFx = { dolly: number; glow: number; owl: number };

export const TILT = 56; // desk plane tilt, degrees
export const PERSPECTIVE = 1100;
const Z_READ = 120; // reading distance above the desk plane, px

export type LetterLayout = ReturnType<typeof computeLayout>;

/** All sizes derive from one sheet width W, so text layout is identical on every screen (just scaled). */
export function computeLayout(vw: number, vh: number) {
  const W = Math.round(Math.max(240, Math.min(560, vw * 0.88, (vh - 150) / 1.38)));
  const P = W * 0.46, H = P * 3, E = W * 1.12, EH = P * 1.24;
  const D = Math.min(vh * 0.16, 150);
  const k = PERSPECTIVE / (PERSPECTIVE - Z_READ);
  const wide = vw >= 1024 && vw / vh > 1.15;
  if (wide) {
    const width = Math.min(380, vw * 0.3), gap = 56;
    const fit = Math.min(1, (vh - 130) / H, (vw - width - gap - 64) / W);
    const x = -(W * fit + gap + width) / 2 + (W * fit) / 2;
    return { vw, vh, W, P, H, E, EH, D, k, finale: { x, y: 10, s: fit / k }, panel: { kind: "side" as const, left: vw / 2 + x + (W * fit) / 2 + gap, width, height: 0 } };
  }
  const height = vh < 700 ? 178 : 200, top = 60, avail = vh - top - height - 8;
  const fit = Math.min(1, avail / H, (vw - 20) / W);
  return { vw, vh, W, P, H, E, EH, D, k, finale: { x: 0, y: top + avail / 2 - vh / 2, s: fit / k }, panel: { kind: "bottom" as const, left: 0, width: 0, height } };
}

/** Layout-space offset (unaffected by CSS transforms), so the quill tracks glyphs at any scale or tilt. */
function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0, y = 0, node: HTMLElement | null = el;
  while (node && node !== root) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent as HTMLElement | null; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

type Options = { curl: boolean; onStage: (stage: string) => void; onDone: () => void };

/**
 * The single master timeline. Every animated property gets its initial value via tl.set at t=0,
 * so restart() (Replay) and progress(1) (Skip) are both exact.
 */
export function buildLetterTimeline(root: HTMLElement, L: LetterLayout, fx: LetterFx, o: Options) {
  const q = (s: string) => root.querySelector<HTMLElement>(s)!;
  const qa = (s: string) => Array.from(root.querySelectorAll<HTMLElement>(s));
  const world = q("[data-world]"), parcel = q("[data-parcel]"), envelope = q("[data-envelope]"), envShadow = q("[data-env-shadow]");
  const flap = q("[data-flap]"), sealBottom = q('[data-seal="bottom"]'), sealGlow = q("[data-seal-glow]");
  const sheens = qa("[data-seal-sheen]"), cracks = qa("[data-crack]");
  const rig = q("[data-rig]"), letterShadow = q("[data-letter-shadow]"), pool = q("[data-pool]");
  const foldTop = q('[data-fold="top"]'), foldBottom = q('[data-fold="bottom"]');
  const curlTop = q('[data-curl="top"]'), curlBottom = q('[data-curl="bottom"]');
  const shadeTop = qa('[data-fold="top"] [data-shade]'), shadeBottom = qa('[data-fold="bottom"] [data-shade]');
  const panels = qa("[data-panel], [data-fold]"), sheet = q("[data-sheet]");
  const quill = q("[data-quill]"), wobble = q("[data-quill-wobble]"), tipDrop = q("[data-tip-drop]"), drop = q("[data-drop]");
  const name = q("[data-name]"), sigText = q("[data-sig-text]"), crest = sheet.querySelector<HTMLElement>("[data-crest]")!;
  const motes = (group: string) => qa(`[data-mote="${group}"]`);
  const land = motes("land"), seal = motes("seal"), edge = motes("edge"), drift = motes("drift"), nameMotes = motes("name");
  const inks = qa("[data-ink]");
  const { W, P, EH, D } = L;
  const a = (TILT * Math.PI) / 180;

  const tl = gsap.timeline();
  const stage = (s: string, t: number) => tl.call(o.onStage, [s], t);

  // ── Initial state ────────────────────────────────────────────────────────
  const b = P * 0.06; // the letter rests slightly low inside the pocket
  tl.set(fx, { dolly: 0, glow: 0, owl: 0 }, 0)
    .set(world, { x: 0, y: 0, scale: 0.5 }, 0)
    .set(parcel, { x: 0, y: -EH * 0.9, z: 900, rotationZ: -18, rotationX: -28, rotationY: 10 }, 0)
    .set(envelope, { y: 0, opacity: 1 }, 0)
    .set(envShadow, { z: -1, opacity: 0, scale: 1.5 }, 0)
    .set(flap, { rotationX: 0, z: 4, transformOrigin: "50% 0%" }, 0)
    .set(sealBottom, { x: 0, y: 0, z: 4.5, rotation: 0 }, 0)
    .set(sealGlow, { z: 4.2, opacity: 0, scale: 0.6 }, 0)
    .set(envelope, { "--seal": 0 }, 0)
    .set(cracks, { opacity: 0 }, 0)
    .set(sheens, { xPercent: -160 }, 0)
    .set(land, { x: 0, y: 0, z: 2, opacity: 0, scale: 0.4 }, 0)
    .set(seal, { x: (i) => Math.cos(i * 0.52) * L.P * (0.36 + (i % 3) * 0.08), y: (i) => Math.sin(i * 0.52) * L.P * (0.3 + (i % 2) * 0.1), z: 6, opacity: 0, scale: 0.5 }, 0)
    .set(rig, { x: 0, y: b, z: 1.5, rotationX: 0, rotation: 0, "--edge": 0 }, 0)
    .set(letterShadow, { y: b, z: 1.4, opacity: 0, scale: 1 }, 0)
    .set(foldTop, { rotationX: -180, z: 1.2, transformOrigin: "50% 100%" }, 0)
    .set(foldBottom, { rotationX: 180, z: 0.6, transformOrigin: "50% 0%" }, 0)
    .set(curlTop, { rotationX: 0, transformOrigin: "50% 100%" }, 0)
    .set(curlBottom, { rotationX: 0, transformOrigin: "50% 0%" }, 0)
    .set([...shadeTop, ...shadeBottom], { opacity: 0 }, 0)
    .set(panels, { visibility: "visible" }, 0)
    .set(sheet, { visibility: "hidden", "--warm": 0 }, 0)
    .set(edge, { x: (i) => (i < 8 ? 0 : i % 2 ? 34 : -34), y: (i) => (i < 8 ? -30 : -6), z: 3, opacity: 0 }, 0)
    .set(drift, { x: 0, y: 0, opacity: 0 }, 0)
    .set(pool, { opacity: 0 }, 0)
    .set(quill, { x: W * 1.08, y: -P * 0.35, rotation: 24, opacity: 0 }, 0)
    .set(wobble, { rotation: 0 }, 0)
    .set(tipDrop, { scale: 0 }, 0)
    .set(drop, { opacity: 0, scale: 0.4, scaleX: 1, scaleY: 1 }, 0)
    .set(inks.filter((el) => el.dataset.ink === "char"), { opacity: 0, filter: "blur(1.4px)" }, 0)
    .set(inks.filter((el) => el.dataset.ink === "word"), { clipPath: "inset(-25% 100% -35% 0%)" }, 0)
    .set([name, sigText], { "--shineOn": 0, "--shine": "130%" }, 0)
    .set(nameMotes, { x: 0, y: 0, opacity: 0 }, 0)
    .set(crest, { opacity: 0, scale: 0.86 }, 0);
  stage("arriving", 0);

  // ── A · Arrival: the camera approaches, an owl crosses the window, the envelope glides down ──
  tl.to(fx, { dolly: 1, duration: 3.4, ease: "power2.inOut" }, 0)
    .to(world, { scale: 0.64, duration: 2.6, ease: "power2.inOut" }, 0)
    .to(fx, { owl: 1, duration: 1.7, ease: "none" }, 0.05)
    .to(parcel, { z: 0, duration: 1.1, ease: "sine.in" }, 0.35)
    .to(parcel, { y: 0, duration: 1.1, ease: "power2.out" }, 0.35)
    .to(parcel, { rotationZ: -2.5, rotationX: 0, rotationY: 0, duration: 1.1, ease: "sine.inOut" }, 0.35)
    .to(envShadow, { opacity: 0.6, scale: 1, duration: 1.1, ease: "sine.in" }, 0.35)
    // a single, damped bounce
    .to(parcel, { z: 9, rotationX: -2, duration: 0.16, ease: "power2.out" }, 1.45)
    .to(parcel, { z: 0, rotationX: 0, duration: 0.22, ease: "power2.in" }, 1.61)
    .to(parcel, { z: 2.2, duration: 0.09, ease: "power1.out" }, 1.83)
    .to(parcel, { z: 0, duration: 0.11, ease: "power1.in" }, 1.92)
    .to(land, { keyframes: { opacity: [0, 1, 0.8, 0] }, duration: 0.9, ease: "none" }, 1.45)
    .to(land, { x: (i) => (i % 2 ? 1 : -1) * (14 + (i % 4) * 9), y: (i) => -10 - (i % 3) * 12, z: (i) => 18 + (i % 4) * 10, scale: 1, duration: 0.9, ease: "power2.out" }, 1.45)
    // the wax catches the candlelight once
    .fromTo(sheens, { xPercent: -160 }, { xPercent: 160, duration: 0.6, ease: "power1.inOut", immediateRender: false }, 1.95);

  // ── B · Seal activation ──
  stage("sealed", 2.15);
  tl.to(envelope, { "--seal": 1, duration: 1.0, ease: "sine.inOut" }, 2.15)
    .to(sealGlow, { opacity: 1, scale: 1, duration: 1.0, ease: "sine.inOut" }, 2.15)
    .to(seal, { x: 0, y: 0, scale: 1, duration: 1.0, ease: "power2.in", stagger: 0.035 }, 2.1)
    .to(seal, { keyframes: { opacity: [0, 1, 0.9, 0] }, duration: 1.0, ease: "none", stagger: 0.035 }, 2.1)
    .fromTo(sheens, { xPercent: -160 }, { xPercent: 160, duration: 0.55, ease: "power1.inOut", immediateRender: false }, 2.75)
    .to(cracks, { opacity: 1, duration: 0.16, ease: "power2.in" }, 3.25);

  // ── C · Opening: the crack runs, the flap hinges back, focus shifts to the mouth ──
  stage("opening", 3.42);
  tl.to(sealBottom, { x: -1.5, y: 2, rotation: -4, duration: 0.3, ease: "power2.out" }, 3.42)
    .to(flap, { rotationX: 180, duration: 1.5, ease: "power2.inOut" }, 3.44)
    .set(flap, { z: -0.6 }, 3.44 + 0.75) // edge-on at 90°, so the depth swap is invisible
    .to(sealGlow, { opacity: 0, duration: 0.8 }, 3.5)
    .to(envelope, { "--seal": 0.2, duration: 0.8 }, 3.5)
    .to(world, { scale: 0.7, y: -L.vh * 0.03, duration: 1.7, ease: "power2.inOut" }, 3.5);

  // ── D · The half-way reveal. Friction hitch, slide to ~47%, then STOP. ──
  const hitch = b - P * 0.14, half = b - P * 0.62;
  stage("sliding", 5.15);
  tl.to(rig, { y: hitch, duration: 0.32, ease: "power1.in" }, 5.15)
    .to(rig, { y: half, duration: 0.78, ease: "power3.out" }, 5.47)
    .to(letterShadow, { y: hitch, opacity: 0.3, duration: 0.32, ease: "power1.in" }, 5.15)
    .to(letterShadow, { y: half, opacity: 0.55, duration: 0.78, ease: "power3.out" }, 5.47);

  // The held pause (6.25 → 7.35). Only light and dust move, plus one tiny invisible touch.
  stage("halfway", 6.25);
  tl.to(fx, { glow: 1, duration: 1.1, ease: "sine.inOut" }, 6.25)
    .to(pool, { opacity: 1, duration: 1.1, ease: "sine.inOut" }, 6.25)
    .to(drift, { x: (i) => 50 + i * 14, y: (i) => -24 - (i % 3) * 16, duration: 1.8, ease: "none", stagger: 0.12 }, 6.0)
    .to(drift, { keyframes: { opacity: [0, 0.85, 0.85, 0] }, duration: 1.8, ease: "none", stagger: 0.12 }, 6.0)
    .to(rig, { rotation: 0.6, y: half - 2.5, duration: 0.2, ease: "sine.out" }, 6.75)
    .to(rig, { rotation: 0, y: half, duration: 0.34, ease: "sine.inOut" }, 6.95);

  // ── E · The invisible wizard pulls it free and turns it to the reader ──
  const full = b - P * 1.32;
  const Y = -D, Z = Z_READ; // reading point relative to the desk origin, rotated into desk space
  const readY = Y * Math.cos(a) + Z * Math.sin(a), readZ = -Y * Math.sin(a) + Z * Math.cos(a);
  stage("pulling", 7.35);
  tl.to(rig, { "--edge": 1, duration: 0.45, ease: "power1.out" }, 7.35)
    .to(edge, { x: 0, y: 0, duration: 0.6, ease: "power2.in", stagger: 0.025 }, 7.3)
    .to(edge, { keyframes: { opacity: [0, 1, 0.9, 0] }, duration: 0.7, ease: "none", stagger: 0.025 }, 7.3)
    .to(rig, { z: 9, duration: 0.45, ease: "sine.out" }, 7.65)
    .to(rig, { y: full, duration: 0.95, ease: "power2.inOut" }, 7.72)
    .to(letterShadow, { y: full + 10, opacity: 0.4, duration: 0.95, ease: "power2.inOut" }, 7.72)
    .to(rig, { y: readY, z: readZ, rotationX: -TILT, duration: 1.25, ease: "power2.inOut" }, 8.55)
    .to(letterShadow, { y: readY + 40, opacity: 0, scale: 1.25, duration: 1.0, ease: "power1.out" }, 8.55)
    .to(world, { x: 0, y: -14, scale: 1 / L.k, duration: 1.35, ease: "power2.inOut" }, 8.55)
    .to(rig, { "--edge": 0, duration: 0.9 }, 9.3)
    .to(fx, { glow: 0.45, duration: 1.2 }, 8.9)
    .to(pool, { opacity: 0.5, duration: 1.2 }, 8.9)
    .to(envelope, { y: EH * 1.6, opacity: 0, duration: 1.1, ease: "power2.in" }, 9.1)
    .to(envShadow, { opacity: 0, duration: 0.8 }, 9.1);

  // ── F · Self-unfolding: top fold, a breath, bottom fold, then it settles ──
  const unfold = (fold: HTMLElement, curl: HTMLElement, shades: HTMLElement[], at: number, dir: 1 | -1) => {
    tl.to(fold, { rotationX: 0, z: 0, duration: 0.95, ease: "power2.inOut" }, at)
      .to(shades, { opacity: 0.45, duration: 0.47, ease: "sine.in" }, at)
      .to(shades, { opacity: 0, duration: 0.48, ease: "sine.out" }, at + 0.47)
      .to(fold, { rotationX: 2.5 * dir, duration: 0.14, ease: "sine.out" }, at + 0.95)
      .to(fold, { rotationX: 0, duration: 0.22, ease: "sine.inOut" }, at + 1.09);
    // the far half lags behind the hinge: real paper curls, it does not swing as a rigid board
    if (o.curl) tl.to(curl, { rotationX: -26 * dir, duration: 0.42, ease: "sine.out" }, at).to(curl, { rotationX: 0, duration: 0.62, ease: "power2.out" }, at + 0.42);
  };
  stage("unfolding", 9.85);
  unfold(foldTop, curlTop, shadeTop, 9.85, 1);
  unfold(foldBottom, curlBottom, shadeBottom, 11.4, -1);
  tl.to(rig, { rotationX: -TILT + 5, z: readZ - 18, duration: 0.9, ease: "power2.out" }, 12.45)
    .set(panels, { visibility: "hidden" }, 12.72)
    .set(sheet, { visibility: "visible" }, 12.72);

  // ── G · The quill. Positions come from the real glyph boxes. ──
  const items = inks.map((el) => ({ el, kind: el.dataset.ink, group: el.dataset.group ?? "", ...offsetIn(el, sheet) }));
  const widthOf = (g: string) => items.filter((i) => i.group === g).reduce((sum, i) => sum + i.w, 0) || 1;
  const budget: Record<string, number> = { body: 3.0, close: 1.5, sig: 1.3 };
  const totals: Record<string, number> = { body: widthOf("body"), close: widthOf("close"), sig: widthOf("sig") };
  const nameCount = items.filter((i) => i.group === "name").length || 1;
  const namePer = Math.min(0.16, 3.2 / nameCount);
  const first = items[0];
  const baseOf = (i: { y: number; h: number }) => i.y + i.h * 0.8;

  stage("writing", 13.0);
  tl.to(quill, { opacity: 1, duration: 0.35 }, 13.0)
    .to(quill, { x: first.x - 6, y: baseOf(first) - 16, rotation: -4, duration: 1.0, ease: "power2.out" }, 13.0)
    .to(tipDrop, { scale: 1, duration: 0.25, ease: "back.out(3)" }, 13.75)
    .to(quill, { x: first.x, y: baseOf(first), rotation: -2, duration: 0.22, ease: "power2.in" }, 14.0)
    .to(tipDrop, { scale: 0, duration: 0.15 }, 14.18);

  let t = 14.22, line = first.y, prevGroup = "", qx = first.x, qy = baseOf(first);
  items.forEach((it, index) => {
    const base = baseOf(it);
    if (prevGroup === "name" && it.group !== "name") {
      // Name complete: lift, hold ~300ms, then a restrained shimmer through the fresh ink.
      tl.to(quill, { x: qx + 8, y: qy - 14, rotation: -8, duration: 0.32, ease: "sine.out" }, t);
      t += 0.32;
      tl.to(name, { "--shineOn": 1, duration: 0.18 }, t)
        .fromTo(name, { "--shine": "130%" }, { "--shine": "-30%", duration: 0.9, ease: "power1.inOut", immediateRender: false }, t)
        .to(name, { "--shineOn": 0, duration: 0.35 }, t + 0.7)
        .to(nameMotes, { y: (i) => -14 - (i % 3) * 7, x: (i) => (i % 2 ? 3 : -3), duration: 0.9, ease: "power1.out", stagger: 0.06 }, t + 0.15)
        .to(nameMotes, { keyframes: { opacity: [0, 0.95, 0] }, duration: 0.9, ease: "none", stagger: 0.06 }, t + 0.15);
      t += 0.95;
      tl.to(quill, { x: it.x, y: base, rotation: -2, duration: 0.18, ease: "power1.inOut" }, t);
      t += 0.18;
    } else if (Math.abs(it.y - line) > it.h * 0.6) {
      // new line: lift, travel, set down
      tl.to(quill, { x: it.x, y: base - 10, duration: 0.2, ease: "sine.inOut" }, t)
        .to(quill, { y: base, duration: 0.07, ease: "power1.in" }, t + 0.2);
      t += 0.27;
    }
    line = it.y;
    if (it.kind === "char") {
      const d = it.group === "name" ? namePer : it.group === "comma" ? 0.12 : 0.13;
      const jitter = ((index * 7919) % 5) * 0.35 - 0.7;
      tl.to(quill, { x: it.x + it.w, y: base + jitter, duration: d, ease: "sine.inOut" }, t)
        .to(it.el, { opacity: 1, filter: "blur(0px)", duration: Math.max(0.18, d * 1.8), ease: "power1.out" }, t + d * 0.1);
      t += d;
    } else {
      const d = Math.max(0.03, (budget[it.group] ?? 1) * (it.w / (totals[it.group] ?? it.w)));
      tl.to(quill, { x: it.x, y: base, duration: 0.045, ease: "sine.inOut" }, t);
      t += 0.045;
      tl.to(quill, { x: it.x + it.w, duration: d, ease: "none" }, t)
        .to(quill, { keyframes: { y: [base - 1.5, base + 1.2, base] }, duration: d, ease: "none" }, t)
        .to(it.el, { clipPath: "inset(-25% -8% -35% 0%)", duration: d, ease: "none" }, t);
      t += d;
    }
    qx = it.x + it.w; qy = base; prevGroup = it.group;
  });
  const writingEnds = t;
  const cycles = Math.ceil((writingEnds - 13.0) / 0.45);
  tl.to(wobble, { rotation: 2.2, duration: 0.45, ease: "sine.inOut", repeat: cycles % 2 ? cycles : cycles + 1, yoyo: true }, 13.0);

  // ── H · Final reveal ──
  const Te = writingEnds;
  tl.set(drop, { x: qx + 7, y: qy - 10 }, 0)
    .to(quill, { x: W * 1.1, y: -P * 0.3, rotation: 26, duration: 1.0, ease: "power2.in" }, Te + 0.15)
    .to(quill, { opacity: 0, duration: 0.4 }, Te + 0.75)
    .to(drop, { keyframes: [{ opacity: 1, scale: 1, y: qy - 2, duration: 0.32, ease: "power2.in" }, { scaleX: 1.3, scaleY: 0.75, duration: 0.18, ease: "power2.out" }] }, Te + 0.25)
    .to(crest, { opacity: 1, scale: 1, duration: 0.95, ease: "power2.out" }, Te + 0.55)
    .to(sigText, { "--shineOn": 1, duration: 0.2 }, Te + 0.9)
    .fromTo(sigText, { "--shine": "130%" }, { "--shine": "-30%", duration: 0.85, ease: "power1.inOut", immediateRender: false }, Te + 0.9)
    .to(sigText, { "--shineOn": 0, duration: 0.35 }, Te + 1.55)
    .to(sheet, { "--warm": 1, duration: 1.1, ease: "sine.inOut" }, Te + 1.0)
    .to(fx, { glow: 0.7, duration: 1.1 }, Te + 1.0)
    .to(world, { x: L.finale.x, y: L.finale.y, scale: L.finale.s, duration: 1.6, ease: "power2.inOut" }, Te + 1.1);
  stage("reading", Te + 1.9);
  tl.call(o.onDone, [], Te + 1.9);
  return tl;
}
