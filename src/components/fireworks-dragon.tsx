"use client";

/**
 * FireworkDragon — the Weasleys' Wildfire Whiz-bangs replacement for the
 * snake scrollbar. Firecrackers keep bursting along the right edge (near the
 * navbar and down the side), and as you scroll their sparks gather into a
 * long serpentine Chinese dragon — húngry golden lung — that grows from a
 * wisp of embers at the top of the page into a full roaring celestial
 * dragon by the time you reach the end: scaled undulating body, flowing
 * mane along the spine, deer antlers, sweeping whiskers, clawed legs and a
 * fire breath at the very bottom.
 *
 * Pure <canvas>, no extra dependencies. Dragon is drawn on the right edge:
 * cracker bursts around it, body grows downward with scroll, head at the
 * travelling tip just like the old Nagini snake.
 *
 * A slim pointer strip on the far right keeps the old click/drag scrub
 * behaviour; the wider art canvas lets clicks pass through.
 */

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export interface FireworkDragonProps {
  /** Width of the decorated strip in px. The dragon scales with it. Default 240. */
  width?: number;
  /** Space kept free above the tail and below the head, in px. Default 20. */
  inset?: number;
  /** Hide the browser's native scrollbar (html element only). Default true. */
  hideNativeScrollbar?: boolean;
  /** Extra classes for the fixed wrapper, e.g. "z-[100]". */
  className?: string;
}

/* ------------------------------------------------------------------ */
/* fire palette                                                        */
/* ------------------------------------------------------------------ */

const TAU = Math.PI * 2;

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a || 1), 0, 1);
  return t * t * (3 - 2 * t);
};

const SPARK_COLORS = [
  "#f5c644",
  "#ffae34",
  "#ff7a1f",
  "#ffe08a",
  "#ff5a1f",
  "#fff3b0",
];

/** All sizes derive from `width` so the dragon scales cleanly. */
function geometry(width: number, inset: number, height: number) {
  const u = width / 240;
  const R = 15 * u; // max body radius
  const headReach = 3.4 * R; // how far the snout sticks out past the head point
  const minLen = 150 * u; // dragon length at scroll position 0
  return {
    u,
    R,
    amp: 24 * u, // sideways swing of the flight wave
    k: TAU / (190 * u), // wave number (one undulation every ~190px)
    headReach,
    minLen,
    // how far the head point can travel as the page scrolls 0 → 100%
    span: Math.max(1, height - inset * 2 - headReach - minLen),
  };
}

type Pt = {
  x: number;
  y: number;
  tx: number; // tangent
  ty: number;
  nx: number; // normal
  ny: number;
  s: number; // arc length from tail
  r: number; // body radius here
};

type Spark = {
  a: number; // launch angle
  v: number; // launch speed
  c: string; // colour
  tw: number; // twinkle phase
};

type Burst = {
  x: number;
  y: number;
  t: number;
  life: number;
  sparks: Spark[];
};

type Ember = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  life: number;
  s: number;
  tw: number;
};

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export default function FireworkDragon({
  width = 240,
  inset = 20,
  hideNativeScrollbar = true,
  className = "",
}: FireworkDragonProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /* Hide the native scrollbar -------------------------------------- */
  useEffect(() => {
    if (!hideNativeScrollbar || isMobile) return;
    const style = document.createElement("style");
    style.setAttribute("data-fireworks-dragon", "");
    style.textContent =
      "html{scrollbar-width:none;-ms-overflow-style:none}" +
      "html::-webkit-scrollbar,body::-webkit-scrollbar{display:none;width:0;height:0}";
    document.head.appendChild(style);
    return () => style.remove();
  }, [hideNativeScrollbar, isMobile]);

  /* Drawing + animation loop --------------------------------------- */
  useEffect(() => {
    if (isMobile) return;
    const wrap = wrapRef.current;
    const strip = stripRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !strip || !canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pool: Pt[] = [];
    const bursts: Burst[] = [];
    const embers: Ember[] = [];

    let g = geometry(width, inset, window.innerHeight);
    let W = 0;
    let H = 0;
    let target = 0;
    let cur = 0;
    let phase = 0;
    let tongueClock = 0;
    let boost = 0;
    let burstClock = 0.4;
    let bodyLen = 0;
    let roared = false;
    let last = performance.now();
    let raf = 0;
    let dirty = true;
    let pageVisible = !document.hidden;
    let magicOn = true;
    let lastPaint = 0;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const pick = <T,>(arr: T[]) => arr[(Math.random() * arr.length) | 0];

    /* ---------------- whiz-bang crackers ---------------- */
    const spawnBurst = (x: number, y: number) => {
      const n = 14 + ((Math.random() * 10) | 0);
      const sparks: Spark[] = [];
      for (let i = 0; i < n; i++) {
        sparks.push({
          a: (i / n) * TAU + rand(-0.15, 0.15),
          v: rand(52, 190) * g.u,
          c: pick(SPARK_COLORS),
          tw: Math.random() * TAU,
        });
      }
      bursts.push({ x, y, t: 0, life: rand(0.55, 1.0), sparks });
      if (bursts.length > 7) bursts.shift();
    };

    const pickBurstSpot = () => {
      // Head end of the dragon, wherever the body has grown to
      const hp = pool.length ? pool[pool.length - 1] : null;
      const nearBody =
        cur > 0.22 &&
        hp &&
        Math.random() < 0.62 &&
        pool.length > 6 &&
        (() => {
          const p = pool[(Math.random() * pool.length) | 0];
          spawnBurst(
            p.x + rand(-26 * g.u, 26 * g.u),
            clamp(p.y + rand(-30 * g.u, 30 * g.u), 10 * g.u, H - 10 * g.u),
          );
          return true;
        })();
      if (nearBody) return;
      // Elsewhere: crackle near the navbar and along the upper edge
      if (Math.random() < 0.55) {
        spawnBurst(rand(W * 0.3, W * 0.92), rand(14 * g.u, Math.min(150 * g.u, H * 0.3)));
      } else {
        spawnBurst(rand(W * 0.3, W * 0.95), rand(14 * g.u, H * 0.8));
      }
    };

    /* ---------------- scroll reading ---------------- */
    const readScroll = () => {
      const el = document.documentElement;
      const max = Math.max(0, el.scrollHeight - el.clientHeight);
      target = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      setScrollable(max > 1);
      dirty = true;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      g = geometry(width, inset, H);
      readScroll();
    };

    /* ---------------- dragon parts ---------------- */
    const drawHead = () => {
      // head grows with the body: an ember-sized wisp at the top of the page,
      // a full celestial-dragon head once the dragon is taking shape
      const r =
        g.R *
        1.85 *
        (0.35 + 0.65 * smoothstep(140 * g.u, 520 * g.u, bodyLen));
      const now = performance.now();
      const flick = reduceMotion.matches ? 0.9 : 0.72 + 0.18 * Math.sin(now / 110);

      // dark backdrop so the silhouette cuts out of the body glow
      ctx.fillStyle = "rgba(28,2,0,0.55)";
      ctx.beginPath();
      ctx.ellipse(0.1 * r, 0.05 * r, 3.0 * r, 1.8 * r, 0, 0, TAU);
      ctx.fill();

      // ---- the great golden mane: three layered flame bursts ----
      const maneLayer = (len: number, spread: number, fill: string, a: number) => {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = a * flick;
        ctx.beginPath();
        for (let i = -4; i <= 4; i++) {
          const ws = reduceMotion.matches ? 0 : Math.sin(now / 150 + i * 1.05);
          const bxx = -0.3 * r;
          const byy = i * spread * r;
          const tipx = (-len - Math.abs(i) * 0.3) * r;
          const tipy = byy + (i * spread * 0.55 + ws * 0.4) * r;
          const cx1 = (-len * 0.45 + ws * 0.2) * r;
          const cy1 = byy + (i * spread * 0.16 + 0.3) * r;
          ctx.moveTo(bxx, byy);
          ctx.quadraticCurveTo(cx1, cy1, tipx, tipy);
          ctx.quadraticCurveTo(cx1 - 0.36 * r, cy1 - 0.44 * r, bxx, byy + spread * 0.42 * r);
          ctx.closePath();
        }
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.restore();
      };
      maneLayer(2.7, 0.42, "rgba(198,48,0,1)", 0.42);
      maneLayer(2.1, 0.38, "rgba(255,118,16,1)", 0.52);
      maneLayer(1.55, 0.34, "rgba(255,198,72,1)", 0.62);

      // tapered stroke helper (antler prongs, brows)
      const stroke = (pts: [number, number][], w: number) => {
        ctx.beginPath();
        ctx.moveTo(pts[0][0] * r, pts[0][1] * r);
        for (let i = 1; i < pts.length - 1; i++) {
          const mx2 = ((pts[i][0] + pts[i + 1][0]) / 2) * r;
          const my2 = ((pts[i][1] + pts[i + 1][1]) / 2) * r;
          ctx.quadraticCurveTo(pts[i][0] * r, pts[i][1] * r, mx2, my2);
        }
        ctx.lineTo(pts[pts.length - 1][0] * r, pts[pts.length - 1][1] * r);
        ctx.lineWidth = w * r;
        ctx.stroke();
      };

      // ---- deer-like branching antlers, sweeping back over the mane ----
      const antler = (bx: number, by: number, s: number) => {
        ctx.beginPath();
        ctx.moveTo(bx * r, by * r);
        ctx.quadraticCurveTo((bx - 0.9 * s) * r, (by - 0.9 * s) * r, (bx - 1.9 * s) * r, (by - 1.35 * s) * r);
        ctx.quadraticCurveTo((bx - 2.15 * s) * r, (by - 1.45 * s) * r, (bx - 2.1 * s) * r, (by - 1.12 * s) * r);
        ctx.quadraticCurveTo((bx - 1.2 * s) * r, (by - 0.8 * s) * r, (bx - 0.4 * s) * r, (by + 0.15 * s) * r);
        ctx.closePath();
        const ag = ctx.createLinearGradient(bx * r, by * r, (bx - 2 * s) * r, (by - 1.4 * s) * r);
        ag.addColorStop(0, "rgba(255,214,120,0.96)");
        ag.addColorStop(0.6, "rgba(224,140,40,0.92)");
        ag.addColorStop(1, "rgba(140,58,8,0.9)");
        ctx.fillStyle = ag;
        ctx.fill();
        ctx.save();
        ctx.strokeStyle = "rgba(255,205,110,0.85)";
        ctx.lineCap = "round";
        stroke([[bx - 0.8 * s, by - 0.62 * s], [bx - 1.05 * s, by - 1.4 * s], [bx - 0.85 * s, by - 1.8 * s]], 0.09 * s);
        stroke([[bx - 1.3 * s, by - 1.02 * s], [bx - 1.8 * s, by - 1.5 * s], [bx - 2.2 * s, by - 1.72 * s]], 0.08 * s);
        ctx.restore();
      };
      ctx.save();
      ctx.shadowColor = "rgba(255,150,40,0.5)";
      ctx.shadowBlur = 7;
      antler(0.15, -0.55, 1);
      antler(0.5, -0.28, 0.8);
      ctx.restore();

      // ---- skull: camel crown, upturned snout ----
      const head = new Path2D();
      head.moveTo(-1.6 * r, -0.3 * r);
      head.bezierCurveTo(-1.0 * r, -1.05 * r, 0.2 * r, -1.15 * r, 1.1 * r, -0.85 * r);
      head.quadraticCurveTo(2.0 * r, -0.7 * r, 2.6 * r, -0.72 * r);
      head.quadraticCurveTo(3.55 * r, -0.68 * r, 3.55 * r, -0.22 * r);
      head.quadraticCurveTo(3.45 * r, 0.14 * r, 3.05 * r, 0.2 * r);
      head.quadraticCurveTo(2.2 * r, 0.3 * r, 1.4 * r, 0.44 * r);
      head.bezierCurveTo(0.7 * r, 0.62 * r, -0.2 * r, 0.78 * r, -1.6 * r, 0.35 * r);
      head.closePath();

      const hg = ctx.createRadialGradient(0.15 * r, -0.25 * r, 0, 0.15 * r, -0.25 * r, 3.6 * r);
      hg.addColorStop(0, "rgba(255,248,196,0.99)");
      hg.addColorStop(0.35, "rgba(255,204,84,0.96)");
      hg.addColorStop(0.72, "rgba(226,96,8,0.96)");
      hg.addColorStop(1, "rgba(112,14,0,0.96)");
      ctx.fillStyle = hg;
      ctx.fill(head);
      ctx.lineJoin = "round";
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(70,6,0,0.8)";
      ctx.stroke(head);

      // nose bridge shading + upturned nose bump + nostril
      ctx.fillStyle = "rgba(230,70,10,0.35)";
      ctx.beginPath();
      ctx.ellipse(2.7 * r, -0.35 * r, 0.85 * r, 0.4 * r, -0.15, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(52,2,0,0.92)";
      ctx.beginPath();
      ctx.ellipse(3.3 * r, -0.12 * r, 0.1 * r, 0.15 * r, -0.55, 0, TAU);
      ctx.fill();

      // ---- open jaw: dark maw, red tongue, white fangs ----
      // lower jaw
      const jg = ctx.createRadialGradient(1.6 * r, 0.85 * r, 0, 1.6 * r, 0.85 * r, 2.4 * r);
      jg.addColorStop(0, "rgba(255,176,64,0.96)");
      jg.addColorStop(1, "rgba(148,26,0,0.96)");
      ctx.fillStyle = jg;
      ctx.beginPath();
      ctx.moveTo(0.9 * r, 0.55 * r);
      ctx.quadraticCurveTo(2.2 * r, 0.95 * r, 2.95 * r, 0.72 * r);
      ctx.quadraticCurveTo(2.6 * r, 1.2 * r, 1.4 * r, 1.1 * r);
      ctx.quadraticCurveTo(0.7 * r, 0.95 * r, 0.72 * r, 0.6 * r);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(70,6,0,0.7)";
      ctx.stroke();

      // dark maw between the jaws
      ctx.beginPath();
      ctx.moveTo(0.95 * r, 0.4 * r);
      ctx.quadraticCurveTo(2.2 * r, 0.5 * r, 3.2 * r, 0.28 * r);
      ctx.lineTo(3.0 * r, 0.72 * r);
      ctx.quadraticCurveTo(1.9 * r, 0.85 * r, 0.9 * r, 0.6 * r);
      ctx.closePath();
      ctx.fillStyle = "rgba(56,2,0,0.95)";
      ctx.fill();

      // red tongue curling in the maw
      ctx.fillStyle = "rgba(255,86,34,0.92)";
      ctx.beginPath();
      ctx.moveTo(1.15 * r, 0.62 * r);
      ctx.quadraticCurveTo(2.3 * r, 0.78 * r, 2.85 * r, 0.5 * r);
      ctx.quadraticCurveTo(2.1 * r, 0.98 * r, 1.05 * r, 0.8 * r);
      ctx.closePath();
      ctx.fill();

      // fangs along the upper lip and lower jaw
      ctx.fillStyle = "rgba(255,246,218,0.97)";
      for (const [tx, ty, dir] of [
        [1.35, 0.44, 1],
        [1.95, 0.46, 1],
        [2.55, 0.4, 1],
        [3.05, 0.28, 1],
        [1.55, 0.92, -1],
        [2.2, 0.94, -1],
        [2.75, 0.8, -1],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo((tx - 0.11) * r, ty * r);
        ctx.lineTo((tx + 0.11) * r, ty * r);
        ctx.lineTo(tx * r, (ty + 0.26 * dir) * r);
        ctx.closePath();
        ctx.fill();
      }

      // ---- fierce round eye under flame brows ----
      const ex = 0.5 * r;
      const ey = -0.45 * r;
      ctx.save();
      ctx.shadowColor = "rgba(255,224,130,0.95)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = "#fff6dd";
      ctx.beginPath();
      ctx.arc(ex, ey, 0.32 * r, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "rgba(196,44,0,0.9)";
      ctx.lineWidth = 0.055 * r;
      ctx.stroke();
      ctx.fillStyle = "#1c0300";
      ctx.beginPath();
      ctx.arc(ex + 0.07 * r, ey, 0.145 * r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,245,0.95)";
      ctx.beginPath();
      ctx.arc(ex + 0.12 * r, ey - 0.09 * r, 0.05 * r, 0, TAU);
      ctx.fill();
      // slanted flame brows — the fierce stare
      ctx.save();
      ctx.strokeStyle = "rgba(255,168,36,0.95)";
      ctx.lineCap = "round";
      ctx.shadowColor = "rgba(255,140,30,0.6)";
      ctx.shadowBlur = 5;
      stroke([[0.0, -0.78], [0.55, -0.98], [1.15, -0.72]], 0.13);
      stroke([[-0.1, -0.95], [0.4, -1.15], [0.95, -0.95]], 0.08);
      ctx.restore();

      // ---- the two long sweeping whiskers ----
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(255,224,130,0.9)";
      for (const side of [-1, 1]) {
        const ws = reduceMotion.matches ? 0 : Math.sin(now / 240 + (side > 0 ? 0 : 1.4));
        const tx2 = (5.9 + ws * 0.45) * r;
        const ty2 = side * (1.6 + ws * 0.4) * r;
        ctx.lineWidth = 0.09 * r;
        ctx.beginPath();
        ctx.moveTo(3.0 * r, side * 0.08 * r);
        ctx.bezierCurveTo(
          (4.2 + ws * 0.2) * r,
          side * (0.5 + ws * 0.12) * r,
          (5.1 + ws * 0.3) * r,
          ty2 - side * 0.45 * r,
          tx2,
          ty2,
        );
        ctx.stroke();
        ctx.lineWidth = 0.05 * r;
        ctx.beginPath();
        ctx.moveTo(tx2, ty2);
        ctx.lineTo(tx2 + 0.5 * r, ty2 + side * 0.42 * r);
        ctx.moveTo(tx2, ty2);
        ctx.lineTo(tx2 + 0.55 * r, ty2 - side * 0.3 * r);
        ctx.stroke();
      }
      ctx.restore();

      // beard tuft hanging from the lower jaw
      const bdg = ctx.createLinearGradient(1.0 * r, 1.05 * r, 1.2 * r, 2.4 * r);
      bdg.addColorStop(0, "rgba(255,150,44,0.85)");
      bdg.addColorStop(1, "rgba(198,48,0,0)");
      ctx.fillStyle = bdg;
      ctx.beginPath();
      ctx.moveTo(1.25 * r, 1.0 * r);
      ctx.quadraticCurveTo(1.65 * r, 1.8 * r, 1.05 * r, 2.4 * r);
      ctx.quadraticCurveTo(0.6 * r, 1.7 * r, 0.62 * r, 1.02 * r);
      ctx.closePath();
      ctx.fill();

      // fire building at the back of the throat
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.4 + 0.2 * Math.sin(now / 60);
      const mg = ctx.createRadialGradient(0.9 * r, 0.4 * r, 0, 0.9 * r, 0.4 * r, 1.9 * r);
      mg.addColorStop(0, "rgba(255,250,210,0.95)");
      mg.addColorStop(0.6, "rgba(255,130,10,0.35)");
      mg.addColorStop(1, "rgba(255,120,10,0)");
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.ellipse(1.2 * r, 0.42 * r, 1.6 * r, 0.5 * r, 0.1, 0, TAU);
      ctx.fill();
      ctx.restore();

      // forked tongue flicker past the fangs
      const cycle = tongueClock % 2.6;
      const tflick = cycle < 0.7 ? Math.sin((cycle / 0.7) * Math.PI) : 0;
      if (tflick > 0.02) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(255,120,50,0.85)";
        ctx.lineCap = "round";
        ctx.lineWidth = Math.max(1, r * 0.07);
        const bx = 2.6 * r;
        const by2 = 0.6 * r;
        const len = r * (0.25 + 0.9 * tflick);
        const fork = r * 0.4 * tflick;
        ctx.beginPath();
        ctx.moveTo(bx, by2);
        ctx.lineTo(bx + len, by2 + 0.12 * r * tflick);
        for (const side of [-1, 1]) {
          ctx.moveTo(bx + len, by2 + 0.12 * r * tflick);
          ctx.lineTo(bx + len + fork, by2 + 0.12 * r * tflick + side * fork * 0.7);
        }
        ctx.stroke();
        ctx.restore();
      }

      // full-scroll fire breath
      if (cur > 0.96) {
        const fa = clamp((cur - 0.96) / 0.04, 0, 1);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = fa * (0.75 + 0.25 * Math.sin(now / 70));
        const bg = ctx.createLinearGradient(3.0 * r, 0, 7.2 * r, 0);
        bg.addColorStop(0, "rgba(255,240,170,0.9)");
        bg.addColorStop(0.4, "rgba(255,150,30,0.6)");
        bg.addColorStop(1, "rgba(220,60,0,0)");
        ctx.beginPath();
        ctx.moveTo(3.0 * r, -0.45 * r);
        ctx.quadraticCurveTo(5.1 * r, -1.0 * r + Math.sin(now / 90) * r * 0.4, 7.2 * r, 0.1 * r);
        ctx.quadraticCurveTo(5.1 * r, 1.0 * r + Math.cos(now / 80) * r * 0.4, 3.0 * r, 0.45 * r);
        ctx.closePath();
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.restore();
      }
    };

    const drawDragon = () => {
      const cx = W * 0.62;
      const y0 = inset; // tail pinned near the top of the track
      const y1 = y0 + g.minLen + cur * g.span; // head travels with scroll
      bodyLen = y1 - y0;

      // Sample the centre line from tail to head
      const step = 2.2;
      let n = 0;
      let s = 0;
      let px = 0;
      let py = 0;
      for (let y = y0; y <= y1 + step * 0.5; y += step) {
        const yy = y > y1 ? y1 : y;
        const x = cx + g.amp * Math.sin(g.k * (yy - y0) + phase);
        if (n > 0) s += Math.hypot(x - px, yy - py);
        const slope = g.amp * (Math.sin(g.k * (yy + 0.6 - y0) + phase) - Math.sin(g.k * (yy - 0.6 - y0) + phase)) / 1.2;
        const inv = 1 / Math.hypot(slope, 1);
        const p =
          pool[n] ??
          (pool[n] = { x: 0, y: 0, tx: 0, ty: 0, nx: 0, ny: 0, s: 0, r: 0 });
        p.x = x;
        p.y = yy;
        p.s = s;
        p.tx = slope * inv;
        p.ty = inv;
        p.nx = inv;
        p.ny = -slope * inv;
        px = x;
        py = yy;
        n++;
      }
      if (n < 3) return;

      const L = s;
      for (let i = 0; i < n; i++) {
        const p = pool[i];
        const tail = 0.1 + 0.9 * smoothstep(0, Math.min(150 * g.u, L * 0.85), p.s);
        const neck = 0.88 + 0.12 * smoothstep(0, 30 * g.u, L - p.s);
        p.r = g.R * tail * neck;
      }

      const flicker = reduceMotion.matches
        ? 1
        : 0.82 + 0.18 * Math.sin(performance.now() / 110);

      const layer = (
        mul: number,
        add: number,
        fill: string | CanvasGradient,
        alpha = 1,
      ) => {
        if (alpha <= 0.01) return;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const p = pool[i];
          const rr = p.r * mul + add;
          if (rr <= 0) continue;
          ctx.moveTo(p.x + rr, p.y);
          ctx.arc(p.x, p.y, rr, 0, TAU);
        }
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.globalAlpha = 1;
      };

      // additive fire: aura → red → orange → yellow core → white hot
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      layer(2.7, 4 * g.u, "rgba(255,70,0,0.10)", flicker);
      layer(1.9, 2 * g.u, "rgba(255,110,10,0.25)", flicker);
      const bg = ctx.createLinearGradient(0, y0, 0, y1 + 1);
      bg.addColorStop(0, "rgba(255,160,20,0.55)");
      bg.addColorStop(1, "rgba(255,90,10,0.6)");
      layer(1.12, 1.2 * g.u, bg, 0.9 * flicker);
      layer(0.6, 0, "rgba(255,214,90,0.85)", flicker);
      layer(0.26, 0, "rgba(255,250,215,0.9)");
      ctx.restore();

      // Serpentine details fade in as the dragon grows, like a proper lung
      const bodyA = smoothstep(0.25, 0.52, cur);
      if (bodyA > 0.01) {
        // pale-gold belly ridge along the page-facing side
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.42 * bodyA * flicker;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        let pen = false;
        for (let i = 0; i < n; i++) {
          const p = pool[i];
          if (p.r < 4 * g.u) {
            pen = false;
            continue;
          }
          const qx = p.x - p.nx * p.r * 0.55;
          const qy = p.y - p.ny * p.r * 0.55;
          if (pen) ctx.lineTo(qx, qy);
          else ctx.moveTo(qx, qy);
          pen = true;
        }
        ctx.strokeStyle = "rgba(255,238,185,0.6)";
        ctx.lineWidth = g.R * 0.42;
        ctx.stroke();
        ctx.restore();

        // scale bands arcing across the body every ~18px
        ctx.save();
        ctx.globalAlpha = 0.5 * bodyA;
        ctx.lineCap = "round";
        ctx.strokeStyle = "rgba(178,52,0,0.45)";
        ctx.lineWidth = 1.6 * g.u;
        ctx.beginPath();
        let nextBand = 18 * g.u;
        for (let i = 1; i < n - 1; i++) {
          const p = pool[i];
          if (p.s < nextBand) continue;
          nextBand += 18 * g.u;
          if (p.r < 4 * g.u) continue;
          const rr = p.r * 0.9;
          // crescent bowing toward the head, from flank to flank
          ctx.moveTo(p.x + p.nx * rr, p.y + p.ny * rr);
          ctx.quadraticCurveTo(
            p.x + p.tx * rr * 0.42,
            p.y + p.ty * rr * 0.42,
            p.x - p.nx * rr,
            p.y - p.ny * rr,
          );
        }
        ctx.stroke();
        ctx.restore();

        // flowing dorsal mane licking backward off the spine
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 0.55 * bodyA * flicker;
        ctx.lineJoin = "round";
        const maneGap = 13 * g.u;
        ctx.beginPath();
        for (let i = 1, next = maneGap * 0.5; i < n - 1; i++) {
          const p = pool[i];
          if (p.s < next) continue;
          next += maneGap;
          if (p.r < 3 * g.u) continue;
          const ws = reduceMotion.matches
            ? 0
            : Math.sin(p.s * 0.05 + performance.now() / 130);
          const h = p.r * (1.9 + 0.95 * ws);
          const bx2 = p.x + p.nx * p.r * 0.85;
          const by2 = p.y + p.ny * p.r * 0.85;
          const mx2 = bx2 - p.tx * h * 0.55 + p.nx * h * 0.5;
          const my2 = by2 - p.ty * h * 0.55 + p.ny * h * 0.5;
          const ex2 = bx2 - p.tx * h * 1.2 + p.nx * h * 0.1;
          const ey2 = by2 - p.ty * h * 1.2 + p.ny * h * 0.1;
          ctx.moveTo(bx2, by2);
          ctx.quadraticCurveTo(mx2, my2, ex2, ey2);
          ctx.quadraticCurveTo(mx2 - p.tx * h * 0.08, my2 - p.ty * h * 0.08, bx2, by2);
        }
        ctx.fillStyle = "rgba(255,138,22,0.5)";
        ctx.fill();
        ctx.restore();

        // two pairs of clawed legs — a lung always strides
        if (bodyLen > 240 * g.u) {
          ctx.save();
          ctx.globalAlpha = 0.9 * bodyA;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          const drawLeg = (p: Pt, dirN: number, reach: number, w: number) => {
            // shoulder on the body flank, elbow out to the side
            const sx2 = p.x + p.nx * dirN * p.r * 0.5;
            const sy2 = p.y + p.ny * dirN * p.r * 0.5;
            const ex3 = sx2 + p.nx * dirN * p.r * 1.05 + p.tx * p.r * 0.35;
            const ey3 = sy2 + p.ny * dirN * p.r * 1.05 + p.ty * p.r * 0.35;
            // forearm sweeps forward along the body
            const fx2 = ex3 + p.tx * p.r * 0.85 * reach - p.nx * dirN * p.r * 0.15;
            const fy2 = ey3 + p.ty * p.r * 0.85 * reach - p.ny * dirN * p.r * 0.15;
            ctx.strokeStyle = "rgba(214,86,12,0.9)";
            ctx.lineWidth = p.r * 0.46 * w;
            ctx.beginPath();
            ctx.moveTo(sx2, sy2);
            ctx.lineTo(ex3, ey3);
            ctx.stroke();
            ctx.strokeStyle = "rgba(255,196,90,0.95)";
            ctx.lineWidth = p.r * 0.34 * w;
            ctx.beginPath();
            ctx.moveTo(ex3, ey3);
            ctx.lineTo(fx2, fy2);
            ctx.stroke();
            // paw
            ctx.fillStyle = "rgba(255,178,64,0.95)";
            ctx.beginPath();
            ctx.ellipse(fx2, fy2, p.r * 0.3 * w, p.r * 0.22 * w, Math.atan2(p.ty, p.tx), 0, TAU);
            ctx.fill();
            // four curved claws gripping forward
            ctx.strokeStyle = "rgba(255,244,205,0.95)";
            ctx.lineWidth = p.r * 0.12 * w;
            ctx.beginPath();
            for (const tn of [-1.5, -0.5, 0.5, 1.5]) {
              let dx = p.tx + p.nx * dirN * tn * 0.3;
              let dy = p.ty + p.ny * dirN * tn * 0.3;
              const dl = Math.hypot(dx, dy) || 1;
              dx /= dl;
              dy /= dl;
              ctx.moveTo(fx2, fy2);
              ctx.quadraticCurveTo(
                fx2 + dx * p.r * 0.5,
                fy2 + dy * p.r * 0.5,
                fx2 + dx * p.r * 0.85,
                fy2 + dy * p.r * 0.85,
              );
            }
            ctx.stroke();
          };
          for (const frac of [0.36, 0.64]) {
            let bi = 0;
            let best = Infinity;
            for (let i = 0; i < n; i++) {
              const d = Math.abs(pool[i].s - L * frac);
              if (d < best) {
                best = d;
                bi = i;
              }
            }
            // near-side limb reaching toward the page, far-side one peeking behind
            drawLeg(pool[bi], -1, 1, 1);
            const backI = Math.max(0, bi - Math.round(46 * g.u / step));
            drawLeg(pool[backI], 1, 0.8, 0.7);
          }
          ctx.restore();
        }
      }

      // Head, oriented along the tangent at the end of the body
      const hp = pool[n - 1];
      ctx.save();
      ctx.translate(hp.x, hp.y);
      ctx.rotate(Math.atan2(hp.ty, hp.tx));
      drawHead();
      ctx.restore();
    };

    /* ---------------- frame loop ---------------- */
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!W || !H || !pageVisible) return;

      // Decorative canvas: 30 fps keeps motion fluid while leaving the main
      // thread available for page transitions and scroll effects.
      if (now - lastPaint < 1000 / 30) return;
      lastPaint = now;

      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      const active = magicOn && !reduceMotion.matches;

      const prev = cur;
      cur += (target - cur) * (active ? 1 - Math.exp(-dt * 12) : 1);
      if (Math.abs(target - cur) < 0.00002) cur = target;

      const vPx = dt > 0 ? (Math.abs(cur - prev) * g.span) / dt : 0;
      boost += (clamp(vPx / 600, 0, 1) - boost) * 0.12;
      const painting = active || !dirty || cur !== prev;
      if (!painting) return;

      if (active) {
        phase += dt * (0.9 + boost * 5); // body sways faster while scrolling
        tongueClock += dt * (1 + boost * 2.5);

        // whiz-bangs keep popping, faster while scrolling
        burstClock -= dt * (1 + boost * 2.2);
        if (burstClock <= 0) {
          pickBurstSpot();
          burstClock = rand(0.5, 1.0) - boost * 0.3;
        }

        // embers peeling off the body
        const spawn = 1 + ((boost * 3) | 0);
        for (let i = 0; i < spawn && pool.length > 4; i++) {
          const p = pool[(Math.random() * pool.length) | 0];
          if (p.r < 2) continue;
          if (embers.length > 90) embers.shift();
          embers.push({
            x: p.x + rand(-1, 0.2) * p.r * 1.4,
            y: p.y + rand(-1, 1) * p.r,
            vx: rand(-14, 6) * g.u,
            vy: rand(-30, -12) * g.u,
            t: 0,
            life: rand(0.6, 1.4),
            s: rand(0.8, 2.2) * g.u,
            tw: Math.random() * TAU,
          });
        }
      }

      // celebrate at the very bottom
      if (cur > 0.985 && !roared && active) {
        roared = true;
        const hp = pool[pool.length - 1];
        if (hp) spawnBurst(hp.x + rand(-10, 10) * g.u, hp.y - 20 * g.u);
      }
      if (cur < 0.9) roared = false;

      ctx.clearRect(0, 0, W, H);
      drawDragon();

      // embers + bursts, additive
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.t += dt;
        if (e.t > e.life) {
          embers.splice(i, 1);
          continue;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.vx += Math.sin(e.t * 9 + e.tw) * 8 * g.u * dt;
        const k = 1 - e.t / e.life;
        ctx.globalAlpha = k * (0.55 + 0.45 * Math.sin(e.t * 14 + e.tw));
        ctx.fillStyle = k > 0.5 ? "#ffdf8a" : "#ff6a1a";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.s * (0.5 + k * 0.5), 0, TAU);
        ctx.fill();
      }
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.t += dt;
        if (b.t > b.life) {
          bursts.splice(i, 1);
          continue;
        }
        const k = 1 - b.t / b.life;
        if (b.t < 0.14) {
          // flash
          ctx.globalAlpha = (0.5 - b.t * 3) * (0.5 + 0.5 * Math.random());
          ctx.fillStyle = "rgba(255,230,160,0.8)";
          ctx.beginPath();
          ctx.arc(b.x, b.y, Math.max(0.5, 3 + b.t * 130 * g.u), 0, TAU);
          ctx.fill();
        }
        for (const sp of b.sparks) {
          const d = b.t * sp.v;
          const sx = b.x + Math.cos(sp.a) * d;
          const sy = b.y + Math.sin(sp.a) * d + b.t * b.t * 60 * g.u;
          ctx.globalAlpha = Math.max(0, k * (0.45 + 0.55 * Math.sin(b.t * 21 + sp.tw)));
          ctx.fillStyle = sp.c;
          ctx.beginPath();
          ctx.arc(sx, sy, 1.3 * g.u * (0.4 + k), 0, TAU);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      dirty = false;
      syncAttrs();
    };

    const syncAttrs = () => {
      if (!wrap) return;
      wrap.setAttribute("data-dragon-length", String(Math.round(bodyLen)));
      wrap.setAttribute("data-scroll-progress", String(Math.round(cur * 100)));
    };

    const magicObserver = new MutationObserver(() => {
      const on = document.documentElement.dataset.magic !== "off";
      if (on !== magicOn) {
        magicOn = on;
        dirty = true;
      }
    });
    magicObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-magic"],
    });
    magicOn = document.documentElement.dataset.magic !== "off";

    resize();
    cur = target; // no slide-in when the page loads already scrolled
    spawnBurst(W * 0.7, Math.min(110 * g.u, H * 0.2));
    raf = requestAnimationFrame(frame);
    const attrTimer = window.setInterval(syncAttrs, 250);

    const onVisibilityChange = () => {
      pageVisible = !document.hidden;
      last = performance.now();
      dirty = true;
    };

    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const roWrap = new ResizeObserver(resize);
    roWrap.observe(wrap);
    const roDoc = new ResizeObserver(readScroll); // content height changes
    roDoc.observe(document.documentElement);
    roDoc.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(attrTimer);
      magicObserver.disconnect();
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      roWrap.disconnect();
      roDoc.disconnect();
    };
  }, [width, inset, isMobile]);

  /* Click / drag the strip to scrub the page ------------------------ */
  const scrub = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isMobile) return;
    const strip = stripRef.current;
    if (!strip) return;
    const gg = geometry(width, inset, strip.clientHeight);
    const rect = strip.getBoundingClientRect();
    // Put the head under the pointer
    const p = clamp(
      (e.clientY - rect.top - inset - gg.minLen) / gg.span,
      0,
      1,
    );
    const el = document.documentElement;
    const targetTop = p * (el.scrollHeight - el.clientHeight);

    // Your smooth-scroll (Lenis) owns scrolling, so go through it when it's there.
    const lenis = (
      window as unknown as {
        lenis?: {
          scrollTo: (top: number, opts: { immediate: boolean }) => void;
        };
      }
    ).lenis;
    if (lenis) lenis.scrollTo(targetTop, { immediate: true });
    else window.scrollTo({ top: targetTop, behavior: "auto" });
  };

  if (isMobile) return null;

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      data-testid="fireworks-dragon"
      data-scroll-progress="0"
      data-dragon-length="0"
      style={{ width }}
      className={[
        "fixed inset-y-0 right-0 z-50 select-none pointer-events-none transition-opacity duration-300",
        scrollable ? "opacity-100" : "opacity-0",
        className,
      ].join(" ")}
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        data-testid="fireworks-dragon-canvas"
      />
      <div
        ref={stripRef}
        style={{ width: Math.max(48, Math.round(width * 0.28)) }}
        className="absolute inset-y-0 right-0 cursor-grab touch-none pointer-events-auto active:cursor-grabbing"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          scrub(e);
        }}
        onPointerMove={(e) => {
          if (e.currentTarget.hasPointerCapture(e.pointerId)) scrub(e);
        }}
        onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
        onPointerCancel={(e) =>
          e.currentTarget.releasePointerCapture(e.pointerId)
        }
      />
    </div>
  );
}
