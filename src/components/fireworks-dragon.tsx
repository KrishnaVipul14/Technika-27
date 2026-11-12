"use client";

/**
 * FireworkDragon — the Weasleys' Wildfire Whiz-bangs replacement for the
 * snake scrollbar. Firecrackers keep bursting along the right edge (near the
 * navbar and down the side), and as you scroll their sparks gather into a
 * fire dragon that grows from a wisp of embers at the top of the page into a
 * full roaring dragon — complete with flapping wings and a flame breath at
 * the very bottom — by the time you reach the end.
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
    let flapClock = 0;
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
    const drawWings = (f: Pt, b: Pt, wingA: number) => {
      if (wingA <= 0.01) return;
      const wl = 120 * g.u;
      const flap = reduceMotion.matches
        ? 0.6
        : Math.sin(flapClock * 2) * 0.55 + 0.45; // 0..1
      const lift = 0.25 + flap * 0.85; // tip rises with the flap
      const rip = reduceMotion.matches ? 0 : Math.sin(flapClock * 3.1); // membrane flutter
      // pulls the midpoint of a chord toward a joint so the trailing edge
      // scoops inward — the signature concave scallop of a real bat wing
      const scoop = (
        ax: number,
        ay: number,
        bx2: number,
        by2: number,
        px: number,
        py: number,
        k: number,
      ): [number, number] => {
        const mx = (ax + bx2) / 2;
        const my = (ay + by2) / 2;
        return [mx + (px - mx) * k, my + (py - my) * k];
      };
      for (const side of [-1, 1]) {
        // the wing on the page side spreads wide; the edge-side one is half-span
        const L2 = wl * (side === -1 ? 1 : 0.55);
        const dir = side;
        // shoulder, wrist (elbow joint) and the long fourth-finger tip
        const sx = f.x;
        const sy = f.y - f.r * 0.55;
        const wx = f.x + dir * L2 * 0.46;
        const wy = f.y - L2 * (lift * 0.58 + 0.2);
        const tx = f.x + dir * L2 * 0.99;
        const ty = f.y - L2 * (lift * 0.88 + 0.1);
        // trailing-edge knuckles where the membrane fingers land
        const n1x = f.x + dir * L2 * 0.76;
        const n1y = f.y - L2 * lift * 0.22 + 3 * g.u + rip * 1.6 * g.u;
        const n2x = f.x + dir * L2 * 0.54;
        const n2y = f.y + 4 * g.u - rip * 1.4 * g.u;
        const n3x = f.x + dir * L2 * 0.32;
        const n3y = f.y + 8 * g.u + rip * 1.1 * g.u;
        const bx = b.x;
        const by = b.y - b.r * 0.3;
        // concave control points: each notch bows toward the wrist joint
        const [c1x, c1y] = scoop(tx, ty, n1x, n1y, wx, wy, 0.5);
        const [c2x, c2y] = scoop(n1x, n1y, n2x, n2y, wx, f.y - L2 * 0.1, 0.42);
        const [c3x, c3y] = scoop(n2x, n2y, n3x, n3y, f.x + dir * L2 * 0.3, f.y, 0.38);
        const [c4x, c4y] = scoop(n3x, n3y, bx, by, f.x + dir * L2 * 0.12, f.y, 0.32);

        ctx.save();
        ctx.globalAlpha = wingA;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        // membrane gradient: hot amber at the root fading to ember at the tip
        const wg = ctx.createLinearGradient(f.x, f.y, tx, ty);
        wg.addColorStop(0, "rgba(255,175,70,0.88)");
        wg.addColorStop(0.5, "rgba(238,96,16,0.72)");
        wg.addColorStop(1, "rgba(150,38,0,0.6)");
        ctx.globalCompositeOperation = "lighter";
        ctx.shadowColor = "rgba(255,120,20,0.45)";
        ctx.shadowBlur = 16;
        ctx.fillStyle = wg;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        // leading edge: humerus bows slightly to the wrist, then the long
        // finger bone runs out to the swept tip
        ctx.quadraticCurveTo(
          f.x + dir * L2 * 0.22,
          wy + L2 * 0.05,
          wx,
          wy,
        );
        ctx.quadraticCurveTo(
          f.x + dir * L2 * 0.72,
          ty + L2 * 0.02,
          tx,
          ty,
        );
        // trailing edge: three concave notches back to the body
        ctx.quadraticCurveTo(c1x, c1y, n1x, n1y);
        ctx.quadraticCurveTo(c2x, c2y, n2x, n2y);
        ctx.quadraticCurveTo(c3x, c3y, n3x, n3y);
        ctx.quadraticCurveTo(c4x, c4y, bx, by);
        ctx.closePath();
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
        ctx.shadowBlur = 0;

        // bright leading edge, softer trailing outline
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255,240,170,0.9)";
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(f.x + dir * L2 * 0.22, wy + L2 * 0.05, wx, wy);
        ctx.quadraticCurveTo(f.x + dir * L2 * 0.72, ty + L2 * 0.02, tx, ty);
        ctx.stroke();
        ctx.lineWidth = 1.4;
        ctx.strokeStyle = "rgba(255,190,110,0.75)";
        ctx.beginPath();
        ctx.moveTo(tx, ty);
        ctx.quadraticCurveTo(c1x, c1y, n1x, n1y);
        ctx.quadraticCurveTo(c2x, c2y, n2x, n2y);
        ctx.quadraticCurveTo(c3x, c3y, n3x, n3y);
        ctx.quadraticCurveTo(c4x, c4y, bx, by);
        ctx.stroke();

        // wing bones: arm to wrist, then fingers fanning to each knuckle
        ctx.lineWidth = 2;
        ctx.strokeStyle = "rgba(255,215,125,0.8)";
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(f.x + dir * L2 * 0.22, wy + L2 * 0.05, wx, wy);
        ctx.lineTo(tx, ty);
        ctx.moveTo(wx, wy);
        ctx.lineTo(n1x, n1y);
        ctx.stroke();
        ctx.lineWidth = 1.3;
        ctx.strokeStyle = "rgba(255,195,95,0.6)";
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.lineTo(n2x, n2y);
        ctx.moveTo(f.x + dir * L2 * 0.34, f.y - f.r * 0.1);
        ctx.lineTo(n3x, n3y);
        ctx.stroke();
        // faint membrane veins between the fingers
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(255,150,55,0.5)";
        ctx.beginPath();
        const vx = (wx + n1x) / 2;
        const vy = (wy + n1y) / 2;
        ctx.moveTo(vx, vy);
        ctx.quadraticCurveTo((vx + n2x) / 2, (vy + n2y) / 2, n2x, n2y);
        ctx.moveTo((wx + n2x) / 2, (wy + n2y) / 2);
        ctx.quadraticCurveTo((vx + n3x) / 2, (vy + n3y) / 2, n3x, n3y);
        ctx.stroke();
        ctx.restore();
      }
    };

    const drawHead = () => {
      // head grows with the body: an ember-sized wisp at the top of the page,
      // a full roaring head once the dragon is taking shape
      const r =
        g.R *
        1.55 *
        (0.35 + 0.65 * smoothstep(140 * g.u, 520 * g.u, bodyLen));

      // forked tongue flicker
      const cycle = tongueClock % 2.6;
      const flick = cycle < 0.7 ? Math.sin((cycle / 0.7) * Math.PI) : 0;
      if (flick > 0.02) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(255,170,60,0.75)";
        ctx.lineCap = "round";
        ctx.lineWidth = Math.max(1, r * 0.08);
        const bx = r * 2.9;
        const len = r * (0.3 + 1.1 * flick);
        const fork = r * 0.5 * flick;
        ctx.beginPath();
        ctx.moveTo(bx, r * 0.12);
        ctx.lineTo(bx + len, r * 0.16 * flick);
        for (const side of [-1, 1]) {
          ctx.moveTo(bx + len, r * 0.16 * flick);
          ctx.lineTo(bx + len + fork, r * 0.16 * flick + side * fork * 0.7);
        }
        ctx.stroke();
        ctx.restore();
      }

      // dark backdrop so the silhouette cuts out of the body glow
      ctx.fillStyle = "rgba(28,2,0,0.6)";
      ctx.beginPath();
      ctx.ellipse(0.6 * r, 0.1 * r, 3.4 * r, 1.85 * r, 0, 0, TAU);
      ctx.fill();

      // horns sweeping far back over the neck
      const horn = (
        sx: number,
        sy: number,
        cx1: number,
        cy1: number,
        tx: number,
        ty: number,
        cx2: number,
        cy2: number,
      ) => {
        ctx.beginPath();
        ctx.moveTo(sx * r, sy * r);
        ctx.quadraticCurveTo(cx1 * r, cy1 * r, tx * r, ty * r);
        ctx.quadraticCurveTo(cx2 * r, cy2 * r, (sx - 0.5) * r, (sy + 0.2) * r);
        ctx.closePath();
        const grin = ctx.createLinearGradient(sx * r, sy * r, tx * r, ty * r);
        grin.addColorStop(0, "rgba(255,215,110,0.95)");
        grin.addColorStop(1, "rgba(200,110,20,0.85)");
        ctx.fillStyle = grin;
        ctx.fill();
      };
      ctx.save();
      ctx.globalAlpha = 0.92;
      horn(0.45, -1.0, -0.8, -2.0, -2.6, -2.55, -1.5, -1.35);
      horn(-0.05, -1.2, -0.9, -2.5, -1.9, -3.3, -1.2, -1.7);
      ctx.restore();

      // upper skull: crown, brow ridge, long snout
      const head = new Path2D();
      head.moveTo(-1.45 * r, -0.7 * r);
      head.bezierCurveTo(-0.6 * r, -1.55 * r, 0.35 * r, -1.5 * r, 0.85 * r, -1.1 * r);
      head.quadraticCurveTo(1.7 * r, -1.0 * r, 2.45 * r, -0.55 * r);
      head.quadraticCurveTo(3.2 * r, -0.35 * r, 3.4 * r, -0.05 * r);
      // upper lip back to the mouth corner
      head.quadraticCurveTo(2.9 * r, 0.14 * r, 1.7 * r, 0.2 * r);
      head.quadraticCurveTo(1.05 * r, 0.24 * r, 0.75 * r, 0.4 * r);
      // cheek and jowl
      head.bezierCurveTo(-0.05 * r, 0.85 * r, -1.0 * r, 1.2 * r, -1.45 * r, 0.72 * r);
      head.closePath();

      const hg = ctx.createRadialGradient(0.15 * r, -0.35 * r, 0, 0.15 * r, -0.35 * r, 3.2 * r);
      hg.addColorStop(0, "rgba(255,240,165,0.98)");
      hg.addColorStop(0.42, "rgba(255,140,22,0.92)");
      hg.addColorStop(0.8, "rgba(198,40,0,0.95)");
      hg.addColorStop(1, "rgba(96,8,0,0.95)");
      ctx.fillStyle = hg;
      ctx.fill(head);
      ctx.lineJoin = "round";
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(64,4,0,0.75)";
      ctx.stroke(head);

      // dark maw between the jaws
      ctx.beginPath();
      ctx.moveTo(0.8 * r, 0.3 * r);
      ctx.quadraticCurveTo(2.0 * r, 0.28 * r, 3.3 * r, 0.02 * r);
      ctx.lineTo(3.0 * r, 0.9 * r);
      ctx.quadraticCurveTo(1.8 * r, 0.8 * r, 0.85 * r, 0.55 * r);
      ctx.closePath();
      ctx.fillStyle = "rgba(52,2,0,0.9)";
      ctx.fill();

      // fire building at the back of the throat
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.45 + 0.25 * Math.sin(performance.now() / 60);
      const mg = ctx.createRadialGradient(0.9 * r, 0.42 * r, 0, 0.9 * r, 0.42 * r, 2.1 * r);
      mg.addColorStop(0, "rgba(255,250,210,0.95)");
      mg.addColorStop(0.6, "rgba(255,130,10,0.35)");
      mg.addColorStop(1, "rgba(255,120,10,0)");
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.ellipse(1.4 * r, 0.45 * r, 1.9 * r, 0.6 * r, 0.1, 0, TAU);
      ctx.fill();
      ctx.restore();

      // lower jaw, biting down into the maw
      ctx.beginPath();
      ctx.moveTo(0.8 * r, 0.45 * r);
      ctx.quadraticCurveTo(2.0 * r, 0.55 * r, 3.05 * r, 0.95 * r);
      ctx.quadraticCurveTo(2.4 * r, 1.22 * r, 1.1 * r, 1.08 * r);
      ctx.quadraticCurveTo(0.5 * r, 1.0 * r, 0.55 * r, 0.7 * r);
      ctx.closePath();
      {
        const jg = ctx.createRadialGradient(1.2 * r, 0.7 * r, 0, 1.2 * r, 0.7 * r, 2.2 * r);
        jg.addColorStop(0, "rgba(255,145,32,0.95)");
        jg.addColorStop(1, "rgba(138,14,0,0.95)");
        ctx.fillStyle = jg;
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = "rgba(64,4,0,0.7)";
        ctx.stroke();
      }

      // teeth: white spikes on both jaws
      ctx.fillStyle = "rgba(255,240,205,0.95)";
      for (const [tx, ty, dir] of [
        [2.05, 0.22, 1],
        [2.6, 0.14, 1],
        [3.1, 0.0, 1],
        [1.45, 0.56, -1],
        [2.0, 0.6, -1],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo((tx - 0.16) * r, ty * r);
        ctx.lineTo((tx + 0.16) * r, ty * r);
        ctx.lineTo(tx * r, (ty + 0.34 * dir) * r);
        ctx.closePath();
        ctx.fill();
      }

      // glowing slit eye under a heavy brow
      const ex = 0.55 * r;
      const ey = -0.45 * r;
      ctx.save();
      ctx.shadowColor = "rgba(255,220,120,0.95)";
      ctx.shadowBlur = 9;
      const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 0.55 * r);
      eg.addColorStop(0, "#fffbe0");
      eg.addColorStop(1, "#ff8a1e");
      ctx.fillStyle = eg;
      ctx.beginPath();
      ctx.ellipse(ex, ey, 0.32 * r, 0.2 * r, -0.3, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = "#1a0400";
      ctx.beginPath();
      ctx.ellipse(ex, ey, 0.23 * r, 0.045 * r, -0.3, 0, TAU);
      ctx.fill();

      // full-scroll fire breath
      if (cur > 0.96) {
        const fa = clamp((cur - 0.96) / 0.04, 0, 1);
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = fa * (0.75 + 0.25 * Math.sin(performance.now() / 70));
        const bg = ctx.createLinearGradient(2.4 * r, 0, 6.5 * r, 0);
        bg.addColorStop(0, "rgba(255,240,170,0.9)");
        bg.addColorStop(0.4, "rgba(255,150,30,0.6)");
        bg.addColorStop(1, "rgba(220,60,0,0)");
        ctx.beginPath();
        ctx.moveTo(2.4 * r, -0.35 * r);
        ctx.quadraticCurveTo(4.4 * r, -0.9 * r + Math.sin(performance.now() / 90) * r * 0.4, 6.6 * r, 0.1 * r);
        ctx.quadraticCurveTo(4.4 * r, 0.9 * r + Math.cos(performance.now() / 80) * r * 0.4, 2.4 * r, 0.35 * r);
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

      // Wings over the body glow, appear from ~30% scroll on
      const wingA = smoothstep(0.3, 0.62, cur);
      if (wingA > 0.01) {
        let wi = 0;
        let wj = 0;
        let best = Infinity;
        for (let i = 0; i < n; i++) {
          const d = Math.abs(pool[i].s - L * 0.44);
          if (d < best) {
            best = d;
            wi = i;
          }
        }
        wj = Math.max(0, wi - Math.round(60 * g.u / step));
        drawWings(pool[wi], pool[wj], wingA);
      }

      // dorsal flame fins flickering along the spine
      const gap = 30 * g.u;
      ctx.beginPath();
      for (let i = 1, next = gap * 0.5; i < n - 1; i++) {
        const p = pool[i];
        if (p.s < next) continue;
        next += gap;
        if (p.r < 3 * g.u) continue;
        const h = p.r * (1.2 + 0.5 * Math.sin(p.s * 0.08 + performance.now() / 140));
        ctx.moveTo(p.x - p.tx * p.r * 0.5, p.y - p.ty * p.r * 0.5);
        ctx.quadraticCurveTo(
          p.x - p.nx * (p.r + h * 0.4),
          p.y - p.ny * (p.r + h * 0.4),
          p.x - p.nx * (p.r + h),
          p.y - p.ny * (p.r + h),
        );
        ctx.quadraticCurveTo(
          p.x - p.nx * (p.r + h * 0.4),
          p.y - p.ny * (p.r + h * 0.3),
          p.x + p.tx * p.r * 0.5,
          p.y + p.ty * p.r * 0.5,
        );
      }
      ctx.fillStyle = `rgba(255,150,30,${0.5 * flicker})`;
      ctx.fill();

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

      const dt = Math.min(0.05, (now - last) / 1000);
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
        flapClock += dt * (1 + boost * 2);
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
          ctx.arc(b.x, b.y, 3 + b.t * 130 * g.u, 0, TAU);
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
