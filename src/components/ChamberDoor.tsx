"use client";

/**
 * chamber-door.tsx — the Chamber of Secrets door used by the page transition.
 *
 *  SVG     the door itself: riveted rim (turns like a lock), scalloped plate, studs, grain, glow
 *  Canvas  the snakes:
 *            - a ring of snakes slithering in a wavy circle around the rim, weaving under and
 *              over it (two canvases, one behind the door and one in front)
 *            - the braided coil on the left and seven snakes fanning across the door face
 *
 *  Dark only: metal is built from the theme's tertiary + neutral scales (rust-bronze in
 *  Hogwarts, verdigris in Slytherin, steel in Ravenclaw, ...). Needs house-themes.css.
 *
 *  Imperative API (used by page-transition.tsx):
 *    close()  door seals over the page, resolves when the page is fully covered
 *    open()   door unlocks, snakes retract, the page is revealed through an iris
 *    cover()  cover instantly (for back/forward navigation)
 */

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
} from "react";
import { gsap } from "@/lib/gsap";

export interface ChamberDoorHandle {
  close: () => Promise<void>;
  open: () => Promise<void>;
  cover: () => void;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a || 1), 0, 1);
  return t * t * (3 - 2 * t);
};

type RGB = [number, number, number];
const rgba = (c: RGB, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

type Pt = {
  x: number;
  y: number;
  tx: number;
  ty: number;
  nx: number;
  ny: number;
  r: number;
  front: boolean;
};
const mkPt = (): Pt => ({
  x: 0,
  y: 0,
  tx: 1,
  ty: 0,
  nx: 0,
  ny: 1,
  r: 1,
  front: true,
});

/* Door layout inside the 400 x 400 SVG viewBox (outer rim radius 190). */
const CX = 200;
const round = (v: number) => Math.round(v * 100) / 100;
const ringPts = (n: number, r: number, off = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * TAU + off;
    return {
      x: round(CX + Math.cos(a) * r),
      y: round(CX + Math.sin(a) * r),
      a,
    };
  });

const RIVETS = ringPts(32, 181);
const BOLTS = ringPts(8, 181, TAU / 16);
const STUDS_A = ringPts(54, 150);
const STUDS_B = ringPts(40, 136, 0.04);
const SEAMS = ringPts(8, 1, TAU / 16).map(({ a }) => ({
  x1: round(CX + Math.cos(a) * 172),
  y1: round(CX + Math.sin(a) * 172),
  x2: round(CX + Math.cos(a) * 190),
  y2: round(CX + Math.sin(a) * 190),
}));
const DASHES = [-64, -22, 36, 76].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return {
    x1: round(CX + Math.cos(a) * 70),
    y1: round(CX + Math.sin(a) * 70),
    x2: round(CX + Math.cos(a) * 148),
    y2: round(CX + Math.sin(a) * 148),
  };
});
const PLATE = (() => {
  let d = "";
  for (let i = 0; i <= 200; i++) {
    const a = (i / 200) * TAU;
    const r = 164 + 5 * Math.sin(a * 11) * (0.6 + 0.4 * Math.sin(a * 3 + 1));
    d += `${i ? "L" : "M"}${(CX + r * Math.cos(a)).toFixed(1)} ${(CX + r * Math.sin(a)).toFixed(1)}`;
  }
  return d + "Z";
})();

/* The snakes on the door face. a = head angle (deg, 0 = right, -90 = top), rad = head distance
   from centre (x door radius), bend = S-curve strength, root = height of the coil loop it grows from. */
const FAN = [
  { a: -92, rad: 0.86, bend: 0.1, root: -0.36 },
  { a: -52, rad: 0.86, bend: -0.12, root: -0.26 },
  { a: -22, rad: 0.88, bend: 0.1, root: -0.16 },
  { a: 3, rad: 0.9, bend: -0.08, root: -0.06 },
  { a: 26, rad: 0.86, bend: 0.12, root: 0.04 },
  { a: 58, rad: 0.84, bend: -0.1, root: 0.14 },
  { a: 90, rad: 0.86, bend: 0.1, root: 0.24 },
];
const RING_N = 6;
const RING_PTS = 56;
const FAN_PTS = 64;

const FALLBACK: Record<string, RGB> = {
  outline: [8, 6, 10],
  dark: [40, 22, 14],
  base: [112, 66, 40],
  lit: [196, 140, 86],
  eye: [255, 222, 150],
  tongue: [196, 44, 56],
};

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export const ChamberDoor = forwardRef<ChamberDoorHandle, { speed?: number }>(
  function ChamberDoor({ speed = 1 }, handleRef) {
    const uid = useId().replace(/:/g, "");
    const rootRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const backRef = useRef<HTMLCanvasElement>(null);
    const frontRef = useRef<HTMLCanvasElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const rimRef = useRef<SVGGElement>(null);
    const glowRef = useRef<SVGCircleElement>(null);
    const crackRef = useRef<SVGPathElement>(null);
    const speedRef = useRef(speed);
    speedRef.current = speed;

    const api = useRef<ChamberDoorHandle>({
      close: () => Promise.resolve(),
      open: () => Promise.resolve(),
      cover: () => {},
    });
    useImperativeHandle(handleRef, () => ({
      close: () => api.current.close(),
      open: () => api.current.open(),
      cover: () => api.current.cover(),
    }));

    useEffect(() => {
      const root = rootRef.current;
      const backdrop = backdropRef.current;
      const back = backRef.current;
      const front = frontRef.current;
      const svg = svgRef.current;
      const rim = rimRef.current;
      const glow = glowRef.current;
      const crack = crackRef.current;
      const bctx = back?.getContext("2d");
      const fctx = front?.getContext("2d");
      if (
        !root ||
        !backdrop ||
        !back ||
        !front ||
        !svg ||
        !rim ||
        !glow ||
        !crack ||
        !bctx ||
        !fctx
      )
        return;

      /* animated state: every number is driven by gsap, drawn by the ticker */
      const P = {
        door: 0,
        extend: 0,
        ring: 0,
        spin: 1,
        glow: 0,
        zoom: 0,
        expand: 0,
        rot: 0,
        rim: 0,
        hole: 0,
      };

      let R = 200; // door radius in px
      let S = 660; // canvas size in px
      let holeMax = 2000;
      let active = false;
      let last = 0;
      let Tc = 0; // clock for tongues + coil
      let ringAng = 0;
      let wavePh = 0;
      let tl: gsap.core.Timeline | null = null;
      let pulse: gsap.core.Tween | null = null;

      /* ---------- palette: resolve theme tokens to plain rgb for the canvas ---------- */
      const C: Record<string, RGB> = { ...FALLBACK };
      const probe = document.createElement("span");
      probe.style.cssText =
        "position:absolute;visibility:hidden;pointer-events:none";
      root.appendChild(probe);
      const pixel = document.createElement("canvas");
      pixel.width = pixel.height = 1;
      const px = pixel.getContext("2d", { willReadFrequently: true });

      const readColor = (token: string, fallback: RGB): RGB => {
        if (!px) return fallback;
        probe.style.color = `var(${token})`;
        const css = getComputedStyle(probe).color;
        px.clearRect(0, 0, 1, 1);
        px.fillStyle = "#ff00ff"; // sentinel: stays magenta if the browser can't parse `css`
        px.fillStyle = css;
        px.fillRect(0, 0, 1, 1);
        const d = px.getImageData(0, 0, 1, 1).data;
        if (d[0] === 255 && d[1] === 0 && d[2] === 255) return fallback;
        return [d[0], d[1], d[2]];
      };
      const readPalette = () => {
        C.outline = readColor("--neutral-1000", FALLBACK.outline);
        C.dark = readColor("--tertiary-950", FALLBACK.dark);
        C.base = readColor("--tertiary-700", FALLBACK.base);
        C.lit = readColor("--tertiary-400", FALLBACK.lit);
        C.eye = readColor("--warning-fg", FALLBACK.eye);
        C.tongue = readColor("--danger-solid", FALLBACK.tongue);
      };

      /* ---------- sizing ---------- */
      const layout = () => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        // Capping decorative canvas resolution prevents 4K/high-DPI devices
        // from drawing millions of unnecessary pixels during transitions.
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        R = clamp(Math.min(vw, vh) * 0.35, 125, 310);
        S = Math.ceil(R * 3.3);
        for (const c of [back, front]) {
          c.style.width = c.style.height = `${S}px`;
          c.width = c.height = Math.round(S * dpr);
          c.getContext("2d")!.setTransform(
            dpr,
            0,
            0,
            dpr,
            (S * dpr) / 2,
            (S * dpr) / 2,
          );
        }
        svg.style.width = svg.style.height = `${(R * 2 * 400) / 380}px`;
        holeMax = Math.hypot(vw, vh) / 2 + 60;
        if (!active) P.hole = holeMax;
        apply();
      };

      /* ---------- snake geometry (all arrays are head-first) ---------- */
      const ringPool: Pt[][] = Array.from({ length: RING_N }, () =>
        Array.from({ length: RING_PTS }, mkPt),
      );
      const fanPool: Pt[][] = FAN.map(() =>
        Array.from({ length: FAN_PTS }, mkPt),
      );

      const finish = (pts: Pt[], n: number) => {
        for (let j = 0; j < n; j++) {
          const a = pts[Math.max(0, j - 1)];
          const b = pts[Math.min(n - 1, j + 1)];
          let tx = a.x - b.x;
          let ty = a.y - b.y;
          const l = Math.hypot(tx, ty) || 1;
          tx /= l;
          ty /= l;
          const p = pts[j];
          p.tx = tx;
          p.ty = ty;
          p.nx = -ty;
          p.ny = tx;
        }
      };

      const buildRing = (i: number, pts: Pt[]) => {
        const len = (TAU / RING_N) * 0.64; // angular length of one snake
        const head = ringAng + i * (TAU / RING_N);
        const base = R * (1 + P.expand * 0.3);
        for (let j = 0; j < RING_PTS; j++) {
          const s = j / (RING_PTS - 1); // 0 head -> 1 tail
          const a = head - s * len;
          const w = Math.sin(wavePh - s * TAU * 2.2 + i * 1.7);
          const rad = base + R * 0.085 * (0.45 + 0.55 * (1 - s * 0.6)) * w;
          const p = pts[j];
          p.x = Math.cos(a) * rad;
          p.y = Math.sin(a) * rad;
          const taper =
            (1 - 0.88 * smoothstep(0.35, 1, s)) *
            (0.82 + 0.18 * smoothstep(0, 0.08, s));
          p.r = R * 0.05 * taper;
          p.front = Math.sin(a * 3 + Tc * 0.5 + i) > -0.05; // weave under / over the rim
        }
        finish(pts, RING_PTS);
      };

      const COIL_X = () => -0.6 * R;
      const COIL_HALF = () => 0.085 * R;

      const buildFan = (k: number, pts: Pt[]) => {
        const f = FAN[k];
        const ext = P.extend;
        const rootX = COIL_X() + COIL_HALF() * 0.9;
        const rootY = f.root * R;
        const ang = (f.a * Math.PI) / 180;
        const tx = Math.cos(ang) * f.rad * R;
        const ty = Math.sin(ang) * f.rad * R;
        const dx = tx - rootX;
        const dy = ty - rootY;
        const len = Math.hypot(dx, dy);
        const bx = (-dy / len) * f.bend * len;
        const by = (dx / len) * f.bend * len;
        const x1 = rootX + dx * 0.33 + bx;
        const y1 = rootY + dy * 0.33 + by;
        const x2 = rootX + dx * 0.66 - bx;
        const y2 = rootY + dy * 0.66 - by;
        const rc = R * 0.032;
        for (let j = 0; j < FAN_PTS; j++) {
          const s = j / (FAN_PTS - 1); // 0 head -> 1 root
          const u = ext * (1 - s);
          const m = 1 - u;
          let x =
            m * m * m * rootX +
            3 * m * m * u * x1 +
            3 * m * u * u * x2 +
            u * u * u * tx;
          let y =
            m * m * m * rootY +
            3 * m * m * u * y1 +
            3 * m * u * u * y2 +
            u * u * u * ty;
          const ddx =
            3 * m * m * (x1 - rootX) +
            6 * m * u * (x2 - x1) +
            3 * u * u * (tx - x2);
          const ddy =
            3 * m * m * (y1 - rootY) +
            6 * m * u * (y2 - y1) +
            3 * u * u * (ty - y2);
          const dl = Math.hypot(ddx, ddy) || 1;
          const lat =
            R *
            0.03 *
            (0.3 + 0.7 * u) *
            smoothstep(0, 0.12, u) *
            Math.sin((TAU * (u * len)) / (R * 0.55) - wavePh * 1.1 + k * 1.3);
          x += (-ddy / dl) * lat;
          y += (ddx / dl) * lat;
          const p = pts[j];
          p.x = x;
          p.y = y;
          p.r = rc * (0.84 + 0.16 * smoothstep(0, 0.07, s));
          p.front = true;
        }
        finish(pts, FAN_PTS);
      };

      /* ---------- drawing ---------- */
      const layer = (
        ctx: CanvasRenderingContext2D,
        pts: Pt[],
        n: number,
        front: boolean,
        mul: number,
        add: number,
        fill: string,
        ox = 0,
        oy = 0,
        lx = 0,
        ly = 0,
      ) => {
        ctx.beginPath();
        for (let j = 0; j < n; j++) {
          const p = pts[j];
          if (p.front !== front) continue;
          const r = p.r * mul + add;
          if (r <= 0.2) continue;
          const x = p.x + ox + lx * p.r;
          const y = p.y + oy + ly * p.r;
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, TAU);
        }
        ctx.fillStyle = fill;
        ctx.fill();
      };

      const drawHead = (
        ctx: CanvasRenderingContext2D,
        p: Pt,
        seed: number,
        glowAmt: number,
      ) => {
        const r = p.r;
        const h = r * 1.12;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.ty, p.tx));

        // tongue
        const cyc = (Tc * 0.8 + seed * 2.3) % 2.8;
        const f = cyc < 0.55 ? Math.sin((cyc / 0.55) * Math.PI) : 0;
        if (f > 0.03) {
          const sx = h * 2.2;
          const len = h * (0.6 + 2 * f);
          const fork = h * 0.7 * f;
          ctx.strokeStyle = rgba(C.tongue);
          ctx.lineWidth = Math.max(1, h * 0.2);
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(sx, 0);
          ctx.lineTo(sx + len, 0);
          ctx.moveTo(sx + len, 0);
          ctx.lineTo(sx + len + Math.cos(0.45) * fork, Math.sin(0.45) * fork);
          ctx.moveTo(sx + len, 0);
          ctx.lineTo(sx + len + Math.cos(0.45) * fork, -Math.sin(0.45) * fork);
          ctx.stroke();
        }

        // skull
        ctx.beginPath();
        ctx.moveTo(-0.9 * h, -0.72 * h);
        ctx.bezierCurveTo(
          -0.1 * h,
          -1.55 * h,
          1.25 * h,
          -1.35 * h,
          2.05 * h,
          -0.5 * h,
        );
        ctx.quadraticCurveTo(2.55 * h, 0, 2.05 * h, 0.5 * h);
        ctx.bezierCurveTo(
          1.25 * h,
          1.35 * h,
          -0.1 * h,
          1.55 * h,
          -0.9 * h,
          0.72 * h,
        );
        ctx.closePath();
        ctx.lineJoin = "round";
        ctx.lineWidth = 2.4;
        ctx.strokeStyle = rgba(C.outline);
        ctx.stroke();
        ctx.fillStyle = rgba(C.base);
        ctx.fill();
        ctx.fillStyle = rgba(C.lit, 0.3);
        ctx.beginPath();
        ctx.ellipse(0.7 * h, -0.35 * h, 1.1 * h, 0.4 * h, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = rgba(C.dark, 0.7);
        ctx.beginPath();
        ctx.moveTo(-0.6 * h, 0);
        ctx.lineTo(0.2 * h, -0.4 * h);
        ctx.lineTo(1.4 * h, 0);
        ctx.lineTo(0.2 * h, 0.4 * h);
        ctx.closePath();
        ctx.fill();

        // eyes
        ctx.shadowColor = rgba(C.eye, 0.9);
        ctx.shadowBlur = 5 + 9 * glowAmt;
        ctx.fillStyle = rgba(C.eye);
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(1.0 * h, side * 0.62 * h, 0.3 * h, 0.24 * h, 0, 0, TAU);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.fillStyle = rgba(C.outline);
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(1.0 * h, side * 0.62 * h, 0.2 * h, 0.05 * h, 0, 0, TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(2.0 * h, side * 0.16 * h, Math.max(0.5, 0.06 * h), 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      };

      const drawSnake = (pts: Pt[], n: number, alpha: number, seed: number) => {
        for (const isFront of [false, true]) {
          const ctx = isFront ? fctx : bctx;
          ctx.globalAlpha = alpha;
          if (isFront)
            layer(ctx, pts, n, true, 1, 1.4, "rgba(0,0,0,0.35)", 1.5, 2.5); // soft shadow
          layer(ctx, pts, n, isFront, 1, 1.4, rgba(C.outline));
          layer(ctx, pts, n, isFront, 1, 0, rgba(C.base));
          layer(
            ctx,
            pts,
            n,
            isFront,
            0.55,
            0,
            rgba(C.lit, 0.5),
            0,
            0,
            -0.28,
            -0.34,
          ); // light from the top left
          layer(ctx, pts, n, isFront, 0.34, 0, rgba(C.dark, 0.8)); // dark dorsal line
          ctx.beginPath(); // belly scutes
          for (let j = 2; j < n - 1; j += 3) {
            const p = pts[j];
            if (p.front !== isFront || p.r < 2) continue;
            const w = p.r * 0.85;
            ctx.moveTo(p.x - p.nx * w, p.y - p.ny * w);
            ctx.lineTo(p.x + p.nx * w, p.y + p.ny * w);
          }
          ctx.strokeStyle = rgba(C.lit, 0.22);
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        const head = pts[0];
        const hctx = head.front ? fctx : bctx;
        hctx.globalAlpha = alpha;
        drawHead(hctx, head, seed, P.glow);
      };

      const drawCoil = (alpha: number) => {
        const ctx = fctx;
        const x0 = COIL_X();
        const half = COIL_HALF();
        const rc = R * 0.032 * 1.45; // fatter than the fan snakes, so the loops touch and read as one braid
        const ys = FAN.map(
          (f, i) => f.root * R + Math.sin(Tc * 1.8 + i) * R * 0.004,
        );
        ctx.globalAlpha = alpha;
        ctx.lineCap = "round";
        const strokeAll = (
          fn: (i: number) => [number, number, number, number],
          w: number,
          color: string,
          dy = 0,
        ) => {
          ctx.beginPath();
          for (let i = 0; i < ys.length; i++) {
            const [ax, ay, bx, by] = fn(i);
            ctx.moveTo(ax, ay + dy);
            ctx.lineTo(bx, by + dy);
          }
          ctx.lineWidth = w;
          ctx.strokeStyle = color;
          ctx.stroke();
        };
        const loop = (i: number): [number, number, number, number] => [
          x0 - half,
          ys[i],
          x0 + half,
          ys[i],
        ];
        const twist = (i: number): [number, number, number, number] =>
          i < ys.length - 1
            ? [x0 + half * 0.55, ys[i], x0 - half * 0.55, ys[i + 1]]
            : [x0, ys[i], x0, ys[i]];
        strokeAll(loop, rc * 2 + 2.8, rgba(C.outline));
        strokeAll(twist, rc * 1.8 + 2.4, rgba(C.outline));
        strokeAll(loop, rc * 2, rgba(C.base));
        strokeAll(twist, rc * 1.6, rgba(C.base));
        strokeAll(loop, rc * 1.0, rgba(C.lit, 0.5), -rc * 0.3);
        strokeAll(loop, rc * 0.5, rgba(C.dark, 0.7));
      };

      /* ---------- push state into the DOM ---------- */
      const apply = () => {
        root.style.visibility = active ? "visible" : "hidden";
        root.style.pointerEvents = active ? "auto" : "none";
        backdrop.style.setProperty("--hole", `${P.hole.toFixed(1)}px`);
        const z = 1 + P.zoom;
        const doorScale = (0.78 + 0.22 * clamp(P.door, 0, 1)) * z;
        svg.style.opacity = String(clamp(P.door, 0, 1));
        svg.style.transform = `translate(-50%, -50%) scale(${doorScale.toFixed(4)}) rotate(${P.rot.toFixed(2)}deg)`;
        rim.setAttribute("transform", `rotate(${P.rim.toFixed(2)} 200 200)`);
        glow.style.opacity = String(P.glow * 0.8);
        crack.style.opacity = String(P.glow);
        const cs = `translate(-50%, -50%) scale(${((0.78 + 0.22 * clamp(P.door, 0, 1)) * z).toFixed(4)})`;
        back.style.transform = cs;
        front.style.transform = cs;
      };

      const frame = () => {
        const now = performance.now();
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        Tc += dt;
        ringAng += dt * 0.9 * P.spin;
        wavePh += dt * (3 + 2.2 * P.spin);

        bctx.clearRect(-S / 2, -S / 2, S, S);
        fctx.clearRect(-S / 2, -S / 2, S, S);

        const ringA = smoothstep(0, 0.2, P.ring);
        const doorA = smoothstep(0, 0.3, P.door);
        if (ringA > 0.01) {
          for (let i = 0; i < RING_N; i++) {
            buildRing(i, ringPool[i]);
            drawSnake(ringPool[i], RING_PTS, ringA, i);
          }
        }
        if (doorA > 0.01) {
          drawCoil(doorA);
          if (P.extend > 0.03) {
            for (let k = 0; k < FAN.length; k++) {
              buildFan(k, fanPool[k]);
              drawSnake(fanPool[k], FAN_PTS, doorA, k + 10);
            }
          }
        }
        bctx.globalAlpha = 1;
        fctx.globalAlpha = 1;
        apply();
      };

      const start = () => {
        if (active) return;
        active = true;
        last = performance.now();
        gsap.ticker.add(frame);
      };
      const stop = () => {
        gsap.ticker.remove(frame);
        active = false;
        P.hole = holeMax;
        apply();
      };
      const killAll = () => {
        pulse?.kill();
        tl?.kill();
        pulse = null;
        tl = null;
      };
      const hold = () => {
        pulse?.kill();
        pulse = gsap.to(P, {
          glow: 0.22,
          duration: 0.55,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
        });
      };
      const closedState = () =>
        Object.assign(P, {
          door: 1,
          extend: 1,
          ring: 1,
          spin: 1,
          glow: 0,
          zoom: 0,
          expand: 0,
          rot: 0,
          rim: 60,
          hole: 0,
        });

      /* ---------- public API ---------- */
      api.current = {
        close: () =>
          new Promise<void>((resolve) => {
            killAll();
            readPalette();
            Object.assign(P, {
              door: 0,
              extend: 0,
              ring: 0,
              spin: 1,
              glow: 0,
              zoom: 0,
              expand: 0,
              rot: -16,
              rim: 0,
              hole: holeMax,
            });
            start();
            const k = 1 / speedRef.current;
            tl = gsap
              .timeline({
                onComplete: () => {
                  hold();
                  resolve();
                },
                onInterrupt: resolve,
              })
              .to(P, { hole: 0, duration: 0.45 * k, ease: "power2.in" }, 0)
              .to(
                P,
                { door: 1, rot: 0, duration: 0.5 * k, ease: "power3.out" },
                0.04 * k,
              )
              .to(
                P,
                { ring: 1, duration: 0.4 * k, ease: "power2.out" },
                0.06 * k,
              )
              .to(
                P,
                { extend: 1, duration: 0.5 * k, ease: "power2.out" },
                0.1 * k,
              )
              .to(P, { spin: 2.6, duration: 0.28 * k, ease: "power2.out" }, 0)
              .to(
                P,
                { spin: 1, duration: 0.35 * k, ease: "power2.inOut" },
                0.28 * k,
              )
              .to(P, { rim: 60, duration: 0.55 * k, ease: "power3.out" }, 0);
          }),

        open: () =>
          new Promise<void>((resolve) => {
            killAll();
            if (!active) {
              readPalette();
              closedState();
              start();
            }
            const k = 1 / speedRef.current;
            tl = gsap
              .timeline({
                onComplete: () => {
                  stop();
                  resolve();
                },
                onInterrupt: resolve,
              })
              .to(P, { glow: 1, duration: 0.2 * k, ease: "power2.out" }, 0)
              .to(
                P,
                { rim: "+=80", duration: 0.7 * k, ease: "power2.inOut" },
                0,
              )
              .to(P, { spin: 3.2, duration: 0.3 * k, ease: "power2.in" }, 0)
              .to(
                P,
                { extend: 0, duration: 0.38 * k, ease: "power3.in" },
                0.05 * k,
              )
              .to(
                P,
                { expand: 1, ring: 0, duration: 0.5 * k, ease: "power2.in" },
                0.15 * k,
              )
              .to(
                P,
                { zoom: 0.75, door: 0, duration: 0.5 * k, ease: "power2.in" },
                0.22 * k,
              )
              .to(
                P,
                { hole: holeMax, duration: 0.5 * k, ease: "power2.inOut" },
                0.25 * k,
              )
              .to(P, { glow: 0, duration: 0.3 * k }, 0.45 * k);
          }),

        cover: () => {
          killAll();
          readPalette();
          closedState();
          start();
          apply();
          hold();
        },
      };

      readPalette();
      layout();
      window.addEventListener("resize", layout);
      return () => {
        window.removeEventListener("resize", layout);
        killAll();
        gsap.ticker.remove(frame);
        probe.remove();
      };
    }, []);

    /* ---------- markup ---------- */
    const id = (name: string) => `${uid}-${name}`;
    const mask =
      "radial-gradient(circle at 50% 50%, transparent calc(var(--hole) - 1px), #000 var(--hole))";

    return (
      <div
        ref={rootRef}
        aria-hidden="true"
        className="fixed inset-0 z-[9998] overflow-hidden"
        style={{ visibility: "hidden", pointerEvents: "none" }}
      >
        {/* dark backdrop: an iris (circular mask) opens and closes over the page */}
        <div
          ref={backdropRef}
          className="absolute inset-0"
          style={
            {
              "--hole": "3000px",
              WebkitMaskImage: mask,
              maskImage: mask,
              backgroundColor: "var(--bg-sunken)",
              backgroundImage:
                "radial-gradient(circle at 50% 50%, color-mix(in oklab, var(--tertiary-700) 24%, transparent), transparent 52%), radial-gradient(120% 90% at 50% 50%, transparent 55%, color-mix(in oklab, var(--bg-sunken) 90%, transparent) 100%)",
            } as React.CSSProperties
          }
        />

        {/* snakes weaving behind the door */}
        <canvas
          ref={backRef}
          className="pointer-events-none absolute left-1/2 top-1/2"
        />

        {/* the door */}
        <svg
          ref={svgRef}
          viewBox="0 0 400 400"
          className="pointer-events-none absolute left-1/2 top-1/2"
          style={{
            opacity: 0,
            filter: "drop-shadow(0 18px 36px rgba(0,0,0,0.65))",
          }}
        >
          <defs>
            <radialGradient id={id("metal")} cx="35%" cy="28%" r="85%">
              <stop
                offset="0"
                style={{
                  stopColor:
                    "color-mix(in oklab, var(--tertiary-400) 80%, var(--neutral-600))",
                }}
              />
              <stop
                offset="0.45"
                style={{ stopColor: "var(--tertiary-700)" }}
              />
              <stop
                offset="1"
                style={{
                  stopColor:
                    "color-mix(in oklab, var(--tertiary-900) 70%, var(--neutral-1000))",
                }}
              />
            </radialGradient>
            <linearGradient id={id("rim")} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" style={{ stopColor: "var(--tertiary-300)" }} />
              <stop offset="0.4" style={{ stopColor: "var(--tertiary-700)" }} />
              <stop offset="1" style={{ stopColor: "var(--tertiary-950)" }} />
            </linearGradient>
            <radialGradient id={id("rivet")} cx="35%" cy="30%" r="70%">
              <stop offset="0" style={{ stopColor: "var(--tertiary-200)" }} />
              <stop offset="1" style={{ stopColor: "var(--tertiary-800)" }} />
            </radialGradient>
            <radialGradient id={id("glow")}>
              <stop
                offset="0"
                style={{ stopColor: "var(--primary-300)", stopOpacity: 0.85 }}
              />
              <stop
                offset="1"
                style={{ stopColor: "var(--primary-500)", stopOpacity: 0 }}
              />
            </radialGradient>
            <clipPath id={id("clip")}>
              <circle cx="200" cy="200" r="190" />
            </clipPath>
            <filter
              id={id("grain")}
              x="0"
              y="0"
              width="100%"
              height="100%"
              colorInterpolationFilters="sRGB"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.8"
                numOctaves="2"
                seed="7"
                result="n"
              />
              <feColorMatrix
                in="n"
                type="matrix"
                values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1.2 -0.45"
              />
            </filter>
          </defs>

          {/* rim: turns like a lock when the door opens */}
          <g ref={rimRef}>
            <circle cx="200" cy="200" r="190" fill={`url(#${id("rim")})`} />
            <circle
              cx="200"
              cy="200"
              r="189"
              fill="none"
              strokeWidth="1.4"
              style={{
                stroke:
                  "color-mix(in oklab, var(--tertiary-200) 40%, transparent)",
              }}
            />
            <circle
              cx="200"
              cy="200"
              r="172"
              fill="none"
              strokeWidth="2"
              style={{ stroke: "var(--neutral-1000)", strokeOpacity: 0.55 }}
            />
            {SEAMS.map((s, i) => (
              <line
                key={i}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                strokeWidth="1.6"
                style={{ stroke: "var(--neutral-1000)", strokeOpacity: 0.6 }}
              />
            ))}
            {RIVETS.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="3.6"
                fill={`url(#${id("rivet")})`}
                style={{ stroke: "var(--neutral-1000)", strokeOpacity: 0.5 }}
                strokeWidth="0.6"
              />
            ))}
            {BOLTS.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="6.2"
                fill={`url(#${id("rivet")})`}
                style={{ stroke: "var(--neutral-1000)", strokeOpacity: 0.6 }}
                strokeWidth="1"
              />
            ))}
          </g>

          {/* plate */}
          <path
            d={PLATE}
            fill={`url(#${id("metal")})`}
            strokeWidth="2.4"
            style={{ stroke: "var(--neutral-1000)", strokeOpacity: 0.65 }}
          />
          <path
            d={PLATE}
            fill="none"
            strokeWidth="1.3"
            transform="translate(-1.2 -1.2)"
            style={{
              stroke:
                "color-mix(in oklab, var(--tertiary-300) 45%, transparent)",
            }}
          />
          <circle
            cx="200"
            cy="200"
            r="150"
            fill="none"
            strokeWidth="1.2"
            style={{ stroke: "var(--neutral-1000)", strokeOpacity: 0.35 }}
          />
          {STUDS_A.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="1.5"
              style={{
                fill: "color-mix(in oklab, var(--tertiary-300) 60%, transparent)",
              }}
            />
          ))}
          {STUDS_B.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="1.2"
              style={{
                fill: "color-mix(in oklab, var(--tertiary-300) 40%, transparent)",
              }}
            />
          ))}
          {DASHES.map((l, i) => (
            <line
              key={i}
              {...l}
              strokeWidth="1.4"
              strokeDasharray="1.5 6"
              strokeLinecap="round"
              style={{
                stroke:
                  "color-mix(in oklab, var(--tertiary-300) 55%, transparent)",
              }}
            />
          ))}

          {/* rust grain */}
          <g clipPath={`url(#${id("clip")})`} opacity="0.55">
            <rect width="400" height="400" filter={`url(#${id("grain")})`} />
          </g>

          {/* the lock glows as the door opens */}
          <circle
            ref={glowRef}
            cx="200"
            cy="200"
            r="172"
            fill={`url(#${id("glow")})`}
            style={{ opacity: 0, mixBlendMode: "screen" }}
          />
          <path
            ref={crackRef}
            d={PLATE}
            fill="none"
            strokeWidth="3"
            style={{
              opacity: 0,
              stroke: "var(--primary-300)",
              filter: "drop-shadow(0 0 6px var(--primary-400))",
            }}
          />
        </svg>

        {/* the coil, the fan of snakes and the heads in front of the door */}
        <canvas
          ref={frontRef}
          className="pointer-events-none absolute left-1/2 top-1/2"
        />
      </div>
    );
  },
);
