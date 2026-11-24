"use client";

/**
 * DragonScroll — the celestial dragon scrollbar that guards the right edge.
 *
 * Slithers and undulates down the rail like a mythical serpent: it grows from
 * the top of the rail to the bottom as the page scrolls, breathes a contained
 * flame, and throws delicate firecracker sparks that burst upon rapid movement
 * and finale scroll.
 */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useMagic } from "./experience";
import styles from "./dragon-scroll.module.css";

export interface DragonScrollProps {
  /** Width of the interactive scrollbar strip in px. Default 56. */
  width?: number;
  /** Space kept free above the tail and below the head, in px. Default 20. */
  inset?: number;
  /** Hide the browser's native scrollbar. Default true. */
  hideNativeScrollbar?: boolean;
  /** "horntail" = canonical black/bronze dragon. "theme" = follows active house colors. */
  palette?: "horntail" | "theme";
  /** Extra classes for the fixed wrapper. */
  className?: string;
}

/* ------------------------------------------------------------------ */
/* Colors & House Theme Integration                                   */
/* ------------------------------------------------------------------ */

type RGB = [number, number, number];
const rgba = (c: RGB, a = 1) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

type DragonPalette = {
  outline: string;
  flankA: string;
  flankB: string;
  backA: string;
  backB: string;
  dorsalRidge: string;
  sheen: string;
  hornBase: string;
  hornTip: string;
  hornHighlight: string;
  scalePlateFill: string;
  scalePlateStroke: string;
  eyeGlow: string;
  eyeA: string;
  eyeB: string;
  pupil: string;
  glint: string;
  flameCore: string;
  flameMid: string;
  flameOuter: string;
  fireworkColors: string[];
};

/** Canonical Hungarian Horntail look: black dragon with bronze horns & sulfur eyes */
const HORNTAIL: DragonPalette = {
  outline: "#060608",
  flankA: "#2a2218",
  flankB: "#4a3b26",
  backA: "#141316",
  backB: "#222026",
  dorsalRidge: "#09080b",
  sheen: "rgba(255, 230, 180, 0.22)",
  hornBase: "#3d2b12",
  hornTip: "#d4a243",
  hornHighlight: "#f5d47a",
  scalePlateFill: "rgba(10, 9, 12, 0.88)",
  scalePlateStroke: "rgba(212, 162, 67, 0.65)",
  eyeGlow: "rgba(255, 170, 0, 0.85)",
  eyeA: "#fff685",
  eyeB: "#ff9000",
  pupil: "#050505",
  glint: "#ffffff",
  flameCore: "#ffffff",
  flameMid: "#ffaa00",
  flameOuter: "#ff2200",
  fireworkColors: [
    "#ffd700",
    "#ffaa00",
    "#ff4400",
    "#ffffff",
    "#ffea88",
    "#e6a817",
  ],
};

function makeColorReader() {
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  document.documentElement.appendChild(probe);
  const px = document.createElement("canvas");
  px.width = px.height = 1;
  const pctx = px.getContext("2d", { willReadFrequently: true });
  const root = getComputedStyle(document.documentElement);

  const read = (token: string, fallback: RGB): RGB => {
    if (!pctx || !root.getPropertyValue(token).trim()) return fallback;
    probe.style.color = `var(${token})`;
    const css = getComputedStyle(probe).color;
    pctx.clearRect(0, 0, 1, 1);
    pctx.fillStyle = "#ff00ff";
    pctx.fillStyle = css;
    pctx.fillRect(0, 0, 1, 1);
    const d = pctx.getImageData(0, 0, 1, 1).data;
    if (d[0] === 255 && d[1] === 0 && d[2] === 255) return fallback;
    return [d[0], d[1], d[2]];
  };

  return { read, dispose: () => probe.remove() };
}

function themeDragonPalette(read: (token: string, fb: RGB) => RGB): DragonPalette {
  const bg = read("--bg-sunken", [10, 8, 12]);
  const p400 = read("--primary-400", [212, 162, 67]);
  const p600 = read("--primary-600", [140, 95, 30]);
  const p800 = read("--primary-800", [35, 25, 15]);
  const p900 = read("--primary-900", [12, 10, 14]);
  const s300 = read("--secondary-300", [255, 230, 150]);
  const s400 = read("--secondary-400", [230, 180, 50]);
  const warn = read("--warning-solid", [255, 140, 20]);
  const brand = read("--fg-brand", [220, 175, 75]);

  return {
    outline: rgba(bg),
    flankA: rgba(p600),
    flankB: rgba(p400),
    backA: rgba(p800),
    backB: rgba(p600),
    dorsalRidge: rgba(p900),
    sheen: "rgba(255, 235, 190, 0.25)",
    hornBase: rgba(p900),
    hornTip: rgba(s400),
    hornHighlight: rgba(s300),
    scalePlateFill: rgba(p900, 0.85),
    scalePlateStroke: rgba(s400, 0.65),
    eyeGlow: rgba(warn, 0.85),
    eyeA: "#ffffff",
    eyeB: rgba(warn),
    pupil: "#050505",
    glint: "#ffffff",
    flameCore: "#ffffff",
    flameMid: rgba(s400),
    flameOuter: "#ff2200",
    fireworkColors: [
      rgba(s400),
      rgba(s300),
      rgba(warn),
      rgba(brand),
      "#ffffff",
      "#ff5500",
      "#ffd700",
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Math & Geometry Helpers                                            */
/* ------------------------------------------------------------------ */

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a || 1), 0, 1);
  return t * t * (3 - 2 * t);
};

interface Geometry {
  u: number;
  R: number;
  amp: number;
  k: number;
  headReach: number;
  minLen: number;
  span: number;
}

function computeGeometry(width: number, inset: number, height: number): Geometry {
  const u = width / 56;
  const R = 5.8 * u; // Torso thickness
  const headReach = 3.2 * R; // How far the horned snout extends
  const minLen = 48 * u; // Starting length at 0% scroll
  const span = Math.max(1, height - inset * 2 - headReach - minLen);
  return {
    u,
    R,
    amp: 13.0 * u, // Gentle lateral serpentine wave swing
    k: TAU / (92 * u), // Spatial wave frequency (one S-curve every ~92px)
    headReach,
    minLen,
    span,
  };
}

interface SpinePoint {
  x: number;
  y: number;
  tx: number; // Tangent X
  ty: number; // Tangent Y
  nx: number; // Normal X
  ny: number; // Normal Y
  s: number;  // Arc length from tail
  r: number;  // Body radius here
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  gravity: number;
  drag: number;
}

export default function DragonScroll({
  width = 56,
  inset = 20,
  hideNativeScrollbar = true,
  palette = "theme",
  className = "",
}: DragonScrollProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const percentRef = useRef<HTMLSpanElement>(null);
  const controlRef = useRef<HTMLDivElement>(null);
  const canvasReadyRef = useRef(false);
  const scrollableRef = useRef(false);
  const [scrollable, setScrollable] = useState(false);
  const [canvasAvailable, setCanvasAvailable] = useState(false);
  const { ready } = useMagic();

  // Hide browser native scrollbar cleanly
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-dragon-scroll", "");
    const useCustomScrollbar = hideNativeScrollbar && canvasAvailable;
    const nativeScrollbar = `
      html, body { scrollbar-width: auto !important; scrollbar-color: var(--fg-brand) var(--bg-sunken); }
      html::-webkit-scrollbar, body::-webkit-scrollbar { display: block !important; width: 10px; height: 10px; }
      html::-webkit-scrollbar-thumb, body::-webkit-scrollbar-thumb { background: var(--fg-brand); border: 3px solid var(--bg-sunken); border-radius: 8px; }
    `;
    style.textContent = useCustomScrollbar ? `
      html, body { scrollbar-width: none; }
      html::-webkit-scrollbar, body::-webkit-scrollbar { display: none; width: 0; height: 0; }
      @media (forced-colors: active) { ${nativeScrollbar} }
    ` : nativeScrollbar;
    document.head.appendChild(style);
    return () => style.remove();
  }, [hideNativeScrollbar, canvasAvailable]);

  // Main Canvas Drawing & Serpentine Animation Loop
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = (() => {
      try { return canvas?.getContext("2d"); } catch { return null; }
    })();
    canvasReadyRef.current = false;
    if (!wrap || !canvas || !ctx) {
      // Reinitialization can fail after an earlier successful paint (e.g. props
      // change). Synchronize the fallback rather than retaining a stale rail.
      queueMicrotask(() => setCanvasAvailable(false));
      return;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const forcedColors = window.matchMedia("(forced-colors: active)");
    const pool: SpinePoint[] = [];
    const sparks: SparkParticle[] = [];

    // The canvas is 120px wide, anchored right-0.
    // Center the artwork in the responsive rail, without layout reads per frame.
    const canvasW = 120;
    let W = canvasW;
    let H = wrap.clientHeight || window.innerHeight;
    let artworkWidth = width;
    let stripWidth = width;
    let g = computeGeometry(artworkWidth, inset, H);

    let targetScroll = 0;
    let curScroll = 0;
    let scrollSpeed = 0;
    let wavePhase = 0;
    let fireClock = 0;
    let fireworkCooldown = 0;
    let lastTime = performance.now();
    let animFrame = 0;
    let pageVisible = !document.hidden;
    let lastPaint = 0;
    let activeUntil = performance.now() + 3000;
    let lastScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    let maxScroll = 0;
    let invalidate = () => {};

    let pal: DragonPalette = HORNTAIL;
    const reader = palette === "theme" ? makeColorReader() : null;
    const updateColors = () => {
      pal = reader ? themeDragonPalette(reader.read) : HORNTAIL;
      invalidate();
    };
    const observer = reader ? new MutationObserver(updateColors) : null;
    observer?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-house", "data-theme"],
    });
    updateColors();

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvasW;
      H = wrap.clientHeight || window.innerHeight;
      stripWidth = wrap.clientWidth;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      artworkWidth = parseFloat(getComputedStyle(wrap).getPropertyValue("--dragon-art-width")) || width;
      g = computeGeometry(artworkWidth, inset, H);
      invalidate();
    };

    // Lateral sinusoidal wave for serpentine flight
    const wave = (y: number, y0: number, ph: number) => {
      const env = 0.45 + 0.55 * smoothstep(0, 90 * g.u, y - y0);
      return g.amp * env * Math.sin(g.k * (y - y0) + ph);
    };

    // Spawn optimized, delicate firecracker spark burst
    const triggerFireworkBurst = (
      ox: number,
      oy: number,
      count = 8,
      speedScale = 1.0,
    ) => {
      if (sparks.length > 70) return;
      const colors = pal.fireworkColors;

      for (let i = 0; i < count; i++) {
        const angle = Math.random() * TAU;
        // Compact radius: sparks stay close to the dragon's path
        const spd = (Math.random() * 1.6 + 0.6) * speedScale;
        const vx = Math.cos(angle) * spd * 0.7 - 0.4;
        const vy = Math.sin(angle) * spd;
        const col = colors[Math.floor(Math.random() * colors.length)];

        sparks.push({
          x: ox,
          y: oy,
          vx,
          vy,
          color: col,
          size: Math.random() * 1.5 + 0.8,
          life: 0,
          maxLife: Math.random() * 0.45 + 0.35,
          gravity: 0.04,
          drag: 0.92,
        });
      }
    };

    /* -------------------------------------------------------------- */
    /* Draw Hungarian Horntail Head, Horns & Contained Flame Breath   */
    /* -------------------------------------------------------------- */

    const drawHorntailHead = (boost: number) => {
      const r = g.R;

      // 1. Contained, Refined Flame Breath
      const cycle = fireClock % 2.8;
      const blast = cycle < 0.85 ? Math.sin((cycle / 0.85) * Math.PI) : 0;
      const flameActive = blast > 0.08 || boost > 0.2;

      if (flameActive) {
        const flameLen = r * (0.7 + 1.2 * blast + boost * 0.6);
        const flameSpread = 0.28 + 0.08 * Math.sin(fireClock * 10);
        const startX = r * 2.2;

        ctx.save();
        ctx.globalCompositeOperation = "lighter";

        // Outer fire cone
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.quadraticCurveTo(
          startX + flameLen * 0.55,
          -r * flameSpread * 1.8,
          startX + flameLen,
          0,
        );
        ctx.quadraticCurveTo(
          startX + flameLen * 0.55,
          r * flameSpread * 1.8,
          startX,
          0,
        );
        ctx.fillStyle = pal.flameOuter;
        ctx.shadowColor = pal.flameOuter;
        ctx.shadowBlur = 6;
        ctx.fill();

        // Inner golden heart
        ctx.beginPath();
        ctx.moveTo(startX + r * 0.3, 0);
        ctx.quadraticCurveTo(
          startX + flameLen * 0.4,
          -r * flameSpread * 0.9,
          startX + flameLen * 0.7,
          0,
        );
        ctx.quadraticCurveTo(
          startX + flameLen * 0.4,
          r * flameSpread * 0.9,
          startX + r * 0.3,
          0,
        );
        ctx.fillStyle = pal.flameMid;
        ctx.fill();

        // White-hot core bead
        ctx.beginPath();
        ctx.ellipse(startX + r * 0.6, 0, r * 0.5, r * 0.18, 0, 0, TAU);
        ctx.fillStyle = pal.flameCore;
        ctx.fill();

        ctx.restore();
      }

      // 2. Crown of Bronze Horns
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (const side of [-1, 1]) {
        // Main backward-curving horn
        ctx.beginPath();
        ctx.moveTo(-0.2 * r, side * 0.5 * r);
        ctx.quadraticCurveTo(
          -1.1 * r,
          side * 1.5 * r,
          -2.4 * r,
          side * 2.0 * r,
        );
        ctx.quadraticCurveTo(
          -1.3 * r,
          side * 1.1 * r,
          -0.6 * r,
          side * 0.3 * r,
        );
        ctx.closePath();

        const hornGrad = ctx.createLinearGradient(
          -0.2 * r,
          0,
          -2.4 * r,
          side * 2.0 * r,
        );
        hornGrad.addColorStop(0, pal.hornBase);
        hornGrad.addColorStop(0.6, pal.hornTip);
        hornGrad.addColorStop(1, pal.hornHighlight);

        ctx.fillStyle = hornGrad;
        ctx.fill();
        ctx.lineWidth = 0.9;
        ctx.strokeStyle = pal.outline;
        ctx.stroke();

        // Secondary brow horn
        ctx.beginPath();
        ctx.moveTo(0.5 * r, side * 0.72 * r);
        ctx.quadraticCurveTo(-0.1 * r, side * 1.6 * r, -0.8 * r, side * 2.0 * r);
        ctx.quadraticCurveTo(-0.3 * r, side * 1.2 * r, 0.2 * r, side * 0.58 * r);
        ctx.closePath();
        ctx.fillStyle = hornGrad;
        ctx.fill();
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = pal.outline;
        ctx.stroke();

        // Cheek spike
        ctx.beginPath();
        ctx.moveTo(-0.5 * r, side * 0.72 * r);
        ctx.lineTo(-1.1 * r, side * 1.3 * r);
        ctx.lineTo(-0.7 * r, side * 0.48 * r);
        ctx.closePath();
        ctx.fillStyle = pal.hornTip;
        ctx.fill();
      }
      ctx.restore();

      // 3. Armored Dragon Skull
      const head = new Path2D();
      head.moveTo(-0.9 * r, -0.72 * r);
      head.bezierCurveTo(
        -0.1 * r,
        -1.45 * r,
        1.3 * r,
        -1.15 * r,
        2.1 * r,
        -0.45 * r,
      );
      head.quadraticCurveTo(2.6 * r, 0, 2.1 * r, 0.45 * r);
      head.bezierCurveTo(
        1.3 * r,
        1.15 * r,
        -0.1 * r,
        1.45 * r,
        -0.9 * r,
        0.72 * r,
      );
      head.closePath();

      const hg = ctx.createLinearGradient(-0.9 * r, 0, 2.6 * r, 0);
      hg.addColorStop(0, pal.backA);
      hg.addColorStop(0.5, pal.backB);
      hg.addColorStop(1, pal.flankB);
      ctx.fillStyle = hg;
      ctx.fill(head);

      ctx.lineJoin = "round";
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = pal.outline;
      ctx.stroke(head);

      // 4. Armored Crown Plate & Nose Horn
      ctx.beginPath();
      ctx.moveTo(-0.7 * r, 0);
      ctx.lineTo(0.2 * r, -0.48 * r);
      ctx.lineTo(1.5 * r, 0);
      ctx.lineTo(0.2 * r, 0.48 * r);
      ctx.closePath();
      ctx.fillStyle = pal.scalePlateFill;
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = pal.scalePlateStroke;
      ctx.stroke();

      // Nose horn spike
      ctx.beginPath();
      ctx.moveTo(1.8 * r, -0.14 * r);
      ctx.lineTo(2.3 * r, 0);
      ctx.lineTo(1.8 * r, 0.14 * r);
      ctx.closePath();
      ctx.fillStyle = pal.hornTip;
      ctx.fill();

      // 5. Piercing Sulfur Cat Eyes
      ctx.save();
      ctx.shadowColor = pal.eyeGlow;
      ctx.shadowBlur = 5;
      for (const side of [-1, 1]) {
        const ex = 1.08 * r;
        const ey = side * 0.76 * r;

        const eg = ctx.createRadialGradient(
          ex - 0.08 * r,
          ey - 0.08 * r,
          0,
          ex,
          ey,
          0.42 * r,
        );
        eg.addColorStop(0, pal.eyeA);
        eg.addColorStop(1, pal.eyeB);
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.ellipse(ex, ey, 0.42 * r, 0.3 * r, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      // Slit pupils & glint
      for (const side of [-1, 1]) {
        const ex = 1.08 * r;
        const ey = side * 0.76 * r;

        ctx.fillStyle = pal.pupil;
        ctx.beginPath();
        ctx.ellipse(ex, ey, 0.32 * r, 0.07 * r, 0, 0, TAU);
        ctx.fill();

        ctx.fillStyle = pal.glint;
        ctx.beginPath();
        ctx.arc(ex + 0.12 * r, ey - 0.11 * r, Math.max(0.6, 0.06 * r), 0, TAU);
        ctx.fill();
      }

      // 6. Nostrils & Ivory Fangs
      for (const side of [-1, 1]) {
        ctx.fillStyle = pal.outline;
        ctx.beginPath();
        ctx.arc(2.0 * r, side * 0.17 * r, Math.max(0.6, 0.07 * r), 0, TAU);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(1.65 * r, side * 0.42 * r);
        ctx.lineTo(1.88 * r, side * 0.58 * r);
        ctx.lineTo(1.74 * r, side * 0.42 * r);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
      }
    };

    /* -------------------------------------------------------------- */
    /* Draw Hungarian Horntail Serpentine Body & Spiked Tail          */
    /* -------------------------------------------------------------- */

    const drawDragon = (boost: number) => {
      const cx = W - stripWidth / 2;
      const y0 = inset;
      const y1 = y0 + g.minLen + curScroll * g.span;

      const step = 1.6;
      let n = 0;
      let s = 0;
      let px = 0;
      let py = 0;

      for (let y = y0; y <= y1 + step * 0.5; y += step) {
        const yy = y > y1 ? y1 : y;
        const x = cx + wave(yy, y0, wavePhase);
        if (n > 0) s += Math.hypot(x - px, yy - py);
        const slope = wave(yy + 0.5, y0, wavePhase) - wave(yy - 0.5, y0, wavePhase);
        const inv = 1 / Math.hypot(slope, 1);

        const pt =
          pool[n] ??
          (pool[n] = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0, s: 0, r: 0 });
        pt.x = x;
        pt.y = yy;
        pt.s = s;
        pt.tx = slope * inv;
        pt.ty = inv;
        pt.nx = inv;
        pt.ny = -slope * inv;
        px = x;
        py = yy;
        n++;
      }
      if (n < 2) return null;

      const totalL = s;

      for (let i = 0; i < n; i++) {
        const pt = pool[i];
        const tailFactor = 0.12 + 0.88 * smoothstep(0, Math.min(105 * g.u, totalL * 0.88), pt.s);
        const neckFactor = 0.86 + 0.14 * smoothstep(0, 24 * g.u, totalL - pt.s);
        pt.r = g.R * tailFactor * neckFactor;
      }

      // 1. Spiked Mace Tail (Top anchor)
      const tp = pool[0];
      ctx.save();
      ctx.translate(tp.x, tp.y);
      ctx.rotate(Math.atan2(tp.ty, tp.tx) + Math.PI);

      const spikeAngles = [-0.65, -0.32, 0, 0.32, 0.65];
      for (const ang of spikeAngles) {
        const spkLen = (13 + Math.cos(ang * 2) * 4) * g.u;
        ctx.save();
        ctx.rotate(ang);
        ctx.beginPath();
        ctx.moveTo(-1.1 * g.u, 0);
        ctx.lineTo(0, spkLen);
        ctx.lineTo(1.1 * g.u, 0);
        ctx.closePath();

        const sg = ctx.createLinearGradient(0, 0, 0, spkLen);
        sg.addColorStop(0, pal.hornBase);
        sg.addColorStop(0.7, pal.hornTip);
        sg.addColorStop(1, pal.hornHighlight);

        ctx.fillStyle = sg;
        ctx.fill();
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = pal.outline;
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      // 2. Jagged Bronze Spines along the Dragon's Back
      const spineSpacing = 14 * g.u;
      ctx.save();
      for (let i = 1, next = spineSpacing * 0.5; i < n - 1; i++) {
        const pt = pool[i];
        if (pt.s < next) continue;
        next += spineSpacing;
        if (pt.r < 1.8) continue;

        const finH = pt.r * 1.45;
        const fx = pt.x + pt.nx * finH * 0.85;
        const fy = pt.y + pt.ny * finH * 0.85;
        const bx = pt.x - pt.tx * 7 * g.u;
        const by = pt.y - pt.ty * 7 * g.u;

        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.quadraticCurveTo(fx, fy, bx, by);
        ctx.lineTo(pt.x, pt.y);
        ctx.closePath();

        const spkGrad = ctx.createLinearGradient(pt.x, pt.y, fx, fy);
        spkGrad.addColorStop(0, pal.hornBase);
        spkGrad.addColorStop(0.8, pal.hornTip);
        spkGrad.addColorStop(1, pal.hornHighlight);

        ctx.fillStyle = spkGrad;
        ctx.fill();
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = pal.outline;
        ctx.stroke();
      }
      ctx.restore();

      // 3. Smooth dragon body tube layers
      const vGrad = (c0: string, c1: string) => {
        const gr = ctx.createLinearGradient(0, y0, 0, y1 + 1);
        gr.addColorStop(0, c0);
        gr.addColorStop(1, c1);
        return gr;
      };

      const renderLayer = (
        mul: number,
        add: number,
        fill: string | CanvasGradient,
        offset = 0,
      ) => {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const pt = pool[i];
          const rad = pt.r * mul + add;
          if (rad <= 0) continue;
          const lx = pt.x + pt.nx * pt.r * offset;
          const ly = pt.y + pt.ny * pt.r * offset;
          ctx.moveTo(lx + rad, ly);
          ctx.arc(lx, ly, rad, 0, TAU);
        }
        ctx.fillStyle = fill;
        ctx.fill();
      };

      renderLayer(1, 1.3, pal.outline);
      renderLayer(1, 0, vGrad(pal.flankA, pal.flankB));
      renderLayer(0.82, 0, vGrad(pal.backA, pal.backB));
      renderLayer(0.42, 0, pal.dorsalRidge);
      renderLayer(0.18, 0, pal.sheen, -0.48);

      // 4. Armored Dragon Scale Plates
      const scuteGap = 16 * g.u;
      ctx.save();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = pal.scalePlateStroke;
      ctx.fillStyle = pal.scalePlateFill;

      for (let i = 1, next = scuteGap * 0.45; i < n - 1; i++) {
        const pt = pool[i];
        if (pt.s < next) continue;
        next += scuteGap;
        if (pt.r < 1.9) continue;

        const a = Math.max(1.5, pt.r * 0.94);
        const b = pt.r * 0.62;

        ctx.beginPath();
        ctx.moveTo(pt.x + pt.tx * a, pt.y + pt.ty * a);
        ctx.lineTo(pt.x + pt.nx * b, pt.y + pt.ny * b);
        ctx.lineTo(pt.x - pt.tx * a, pt.y - pt.ty * a);
        ctx.lineTo(pt.x - pt.nx * b, pt.y - pt.ny * b);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();

      // 5. Dragon Claws / Talons (when elongated)
      if (totalL > 115) {
        const clawSites = [0.35, 0.72];
        ctx.save();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = pal.outline;
        ctx.fillStyle = pal.hornTip;

        for (const frac of clawSites) {
          const targetS = totalL * frac;
          let bestPt = pool[0];
          for (let i = 0; i < n; i++) {
            if (pool[i].s >= targetS) {
              bestPt = pool[i];
              break;
            }
          }
          for (const side of [-1, 1]) {
            const legBaseX = bestPt.x + bestPt.nx * bestPt.r * 0.8 * side;
            const legBaseY = bestPt.y + bestPt.ny * bestPt.r * 0.8 * side;
            const reach = 10 * g.u;
            const footX = legBaseX + (bestPt.nx * reach * 0.85 + bestPt.tx * reach * 0.35) * side;
            const footY = legBaseY + (bestPt.ny * reach * 0.85 + bestPt.ty * reach * 0.35) * side;

            ctx.beginPath();
            ctx.moveTo(legBaseX, legBaseY);
            ctx.lineTo(footX, footY);
            ctx.stroke();

            for (let t = -1.5; t <= 1.5; t += 1) {
              ctx.beginPath();
              ctx.moveTo(footX, footY);
              ctx.lineTo(
                footX + (bestPt.nx * 4 * side + t * 2.5),
                footY + (bestPt.ty * 4 + t * 1.8),
              );
              ctx.stroke();
            }
          }
        }
        ctx.restore();
      }

      // 6. Hungarian Horntail Head
      const hp = pool[n - 1];
      ctx.save();
      ctx.translate(hp.x, hp.y);
      ctx.rotate(Math.atan2(hp.ty, hp.tx));
      drawHorntailHead(boost);
      ctx.restore();

      return { headX: hp.x, headY: hp.y };
    };

    /* -------------------------------------------------------------- */
    /* Draw & Update Fireworks & Sparks                               */
    /* -------------------------------------------------------------- */

    const updateAndDrawParticles = (dt: number) => {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life += dt;
        if (p.life >= p.maxLife) {
          sparks.splice(i, 1);
          continue;
        }

        p.vx *= p.drag;
        p.vy = p.vy * p.drag + p.gravity;
        p.x += p.vx;
        p.y += p.vy;

        const progress = p.life / p.maxLife;
        const alpha = Math.max(0, 1 - progress) * 0.85;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 - progress * 0.4), 0, TAU);
        ctx.fill();

        // Shimmering micro spark streak
        if (p.size > 1.2) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 1.2, p.y - p.vy * 1.2);
          ctx.lineWidth = 0.6;
          ctx.strokeStyle = p.color;
          ctx.stroke();
        }
      }

      ctx.restore();
    };

    /* -------------------------------------------------------------- */
    /* Main Animation Frame Loop                                      */
    /* -------------------------------------------------------------- */

    const frame = (now: number) => {
      animFrame = 0;
      if (!W || !H || !pageVisible || forcedColors.matches) return;

      // Tolerate refresh-clock rounding so normal 60Hz frames aren't skipped;
      // still cap drawing work on high-refresh displays.
      if (!reduceMotion.matches && now - lastPaint < 1000 / 60 - 1) { animFrame = requestAnimationFrame(frame); return; }
      lastPaint = now;

      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const reduced = reduceMotion.matches;
      const active = !reduced && now < activeUntil;

      // Smooth scroll speed calculation
      const currentScrollY = window.scrollY;
      const rawDy = Math.abs(currentScrollY - lastScrollY);
      lastScrollY = currentScrollY;
      const instSpeed = dt > 0 ? rawDy / dt : 0;
      scrollSpeed += (instSpeed - scrollSpeed) * 0.08;

      const canScroll = maxScroll > 5;
      if (canScroll !== scrollableRef.current) {
        scrollableRef.current = canScroll;
        setScrollable(canScroll);
      }
      if (!canvasReadyRef.current) { canvasReadyRef.current = true; setCanvasAvailable(true); }
      targetScroll = clamp(maxScroll > 0 ? window.scrollY / maxScroll : 0, 0, 1);

      const prev = curScroll;
      curScroll += (targetScroll - curScroll) * (active ? 1 - Math.exp(-dt * 12) : 1);
      if (Math.abs(targetScroll - curScroll) < 0.00002) curScroll = targetScroll;

      // Write straight to the DOM for 60fps smoothness and test verification
      const computedLen = g.minLen + curScroll * g.span;
      const percent = Math.round(clamp(curScroll, 0, 1) * 100);
      const length = Math.round(computedLen);
      const wrapEl = wrapRef.current;
      if (wrapEl) {
        const progressValue = String(percent);
        const lengthValue = String(length);
        if (wrapEl.dataset.scrollProgress !== progressValue) {
          wrapEl.dataset.scrollProgress = progressValue;
          wrapEl.style.setProperty("--dragon-progress", String(percent / 100));
          controlRef.current?.setAttribute("aria-valuenow", progressValue);
          controlRef.current?.setAttribute("aria-valuetext", `${percent}% of page`);
        }
        if (wrapEl.dataset.snakeLength !== lengthValue) {
          wrapEl.dataset.snakeLength = lengthValue;
        }
      }
      if (percentRef.current) {
        const label = `${percent}%`;
        if (percentRef.current.textContent !== label) {
          percentRef.current.textContent = label;
        }
      }

      // Boost: smoothly clamped between 0 and 1
      const boost = active ? clamp(scrollSpeed / 800, 0, 1) : 0;

      if (active) {
        // Serpentine swimming motion (ripples dynamically down the track)
        wavePhase += dt * (1.2 + boost * 2.2);
        fireClock += dt * (1.0 + boost * 1.5);
      } else {
        // Rest between interactions: no indefinite decorative loop or frozen flame.
        fireClock = 0;
        sparks.length = 0;
      }

      ctx.clearRect(0, 0, W, H);

      // Draw the Hungarian Horntail Dragon
      const dragonTip = drawDragon(boost);

      // Fireworks and Firecracker Sparks
      if (active && dragonTip) {
        fireworkCooldown -= dt;

        // Micro trailing embers while scrolling
        if (scrollSpeed > 25 && Math.random() < 0.28) {
          triggerFireworkBurst(
            dragonTip.headX + (Math.random() - 0.5) * 6,
            dragonTip.headY + (Math.random() - 0.5) * 6,
            1,
            0.5,
          );
        }

        // Firecracker burst when scrolling fast
        if (scrollSpeed > 180 && fireworkCooldown <= 0) {
          fireworkCooldown = 0.35;
          triggerFireworkBurst(
            dragonTip.headX - 4,
            dragonTip.headY,
            Math.floor(6 + boost * 4),
            0.8 + boost * 0.4,
          );
        }

        // Celebratory finale fireworks at 100% scroll
        if (curScroll > 0.985 && prev <= 0.985) {
          triggerFireworkBurst(dragonTip.headX - 8, dragonTip.headY, 14, 1.2);
        }
      }

      // Update active sparks
      if (active) updateAndDrawParticles(dt);
      if (active && canScroll) animFrame = requestAnimationFrame(frame);
    };

    invalidate = () => {
      if (!animFrame && pageVisible && !forcedColors.matches) animFrame = requestAnimationFrame(frame);
    };
    const wake = () => {
      activeUntil = performance.now() + 1600;
      invalidate();
    };
    const updateMetrics = () => {
      const el = document.documentElement;
      maxScroll = Math.max(0, el.scrollHeight - el.clientHeight);
      invalidate();
    };
    const onMotionChange = () => {
      sparks.length = 0;
      wavePhase = fireClock = scrollSpeed = 0;
      activeUntil = performance.now() + 3000;
      invalidate();
    };
    const onContrastChange = () => {
      if (forcedColors.matches) { cancelAnimationFrame(animFrame); animFrame = 0; }
      else { wake(); resize(); updateMetrics(); }
    };
    resize();
    updateMetrics();
    curScroll = targetScroll;

    const onVisibilityChange = () => {
      pageVisible = !document.hidden;
      lastTime = performance.now();
      if (!pageVisible) { cancelAnimationFrame(animFrame); animFrame = 0; }
      else { wake(); updateMetrics(); }
    };

    window.addEventListener("resize", resize);
    window.addEventListener("scroll", wake, { passive: true });
    reduceMotion.addEventListener("change", onMotionChange);
    forcedColors.addEventListener("change", onContrastChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const roWrap = new ResizeObserver(resize);
    roWrap.observe(wrap);
    const roPage = new ResizeObserver(updateMetrics);
    roPage.observe(document.body);
    roPage.observe(document.documentElement);

    return () => {
      cancelAnimationFrame(animFrame);
      observer?.disconnect();
      reader?.dispose();
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", wake);
      reduceMotion.removeEventListener("change", onMotionChange);
      forcedColors.removeEventListener("change", onContrastChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      roWrap.disconnect();
      roPage.disconnect();
    };
  }, [width, inset, palette, ready]);

  // Click & drag scrub along the scroll rail
  const scrub = (e: ReactPointerEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const artworkWidth = parseFloat(getComputedStyle(wrap).getPropertyValue("--dragon-art-width")) || width;
    const g = computeGeometry(artworkWidth, inset, wrap.clientHeight || window.innerHeight);
    const rect = wrap.getBoundingClientRect();
    const p = clamp((e.clientY - rect.top - inset - g.minLen) / g.span, 0, 1);
    scrollToProgress(p);
  };

  const scrollToProgress = (progress: number) => {
    const el = document.documentElement;
    const targetTop = clamp(progress, 0, 1) * Math.max(0, el.scrollHeight - el.clientHeight);

    const lenis = (
      window as unknown as {
        lenis?: {
          scrollTo: (top: number, opts: { immediate: boolean }) => void;
        };
      }
    ).lenis;

    if (lenis) {
      lenis.scrollTo(targetTop, { immediate: true });
    } else {
      window.scrollTo({ top: targetTop, behavior: "auto" });
    }
  };

  const handleKeys = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - document.documentElement.clientHeight);
    if (!maxScroll) return;
    let next = window.scrollY;
    switch (event.key) {
      case "Home": next = 0; break;
      case "End": next = maxScroll; break;
      case "ArrowDown": case "ArrowRight": next += 80; break;
      case "ArrowUp": case "ArrowLeft": next -= 80; break;
      case "PageDown": next += window.innerHeight * .8; break;
      case "PageUp": next -= window.innerHeight * .8; break;
      default: return;
    }
    event.preventDefault();
    scrollToProgress(next / maxScroll);
  };

  return (
    <div
      ref={wrapRef}
      data-testid="scroll-snake"
      data-snake-length="60"
      data-scroll-progress="0"
      data-ready={ready && scrollable && canvasAvailable}
      style={{ "--dragon-width": `${width}px`, "--dragon-art-width": `${width}px` } as CSSProperties}
      className={`${styles.wrapper} ${className}`}
    >
      {/* Translucent Auric Rail Guide Line */}
      <div
        className={styles.guide}
        aria-hidden="true"
      ><span className={styles.guideFill} /></div>
      <span className={styles.startMarker} aria-hidden="true" />
      <span className={styles.endMarker} aria-hidden="true" />

      {/* Celestial Dragon & Fireworks Canvas */}
      <canvas
        ref={canvasRef}
        data-testid="snake-scroll-canvas"
        aria-hidden="true"
        className={styles.canvas}
      />

      {/* Interactive Scrub Touch/Click Strip on the right rail */}
      <div
        ref={controlRef}
        role="scrollbar"
        aria-label="Page scroll"
        aria-controls="main-content"
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        aria-valuetext="0% of page"
        aria-describedby="dragon-scroll-help"
        tabIndex={ready && scrollable && canvasAvailable ? 0 : -1}
        className={styles.control}
        onKeyDown={handleKeys}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.currentTarget.focus({ preventScroll: true });
          e.currentTarget.setPointerCapture(e.pointerId);
          wrapRef.current?.setAttribute("data-dragging", "true");
          scrub(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(e);
        }}
        onPointerUp={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
        onPointerCancel={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId); }}
        onLostPointerCapture={() => wrapRef.current?.removeAttribute("data-dragging")}
      />
      <span id="dragon-scroll-help" className={styles.srOnly}>Drag to scroll. Use arrow keys or Page Up and Page Down; Home and End jump to the start and end.</span>

      {/* Live Scroll Percentage Tag on Hover */}
      <div
        className={styles.readout}
        aria-hidden="true"
      >
        <span ref={percentRef}>0%</span>
        <span>of the journey</span>
      </div>
    </div>
  );
}
