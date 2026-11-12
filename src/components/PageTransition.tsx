"use client";

/**
 * BrickTransition — Diagon Alley style page transition for the Next.js App Router.
 *
 * Bricks fly in from every direction in 3D (depth, sides, top, bottom, even from
 * the viewer), slam together into a running-bond wall, the route changes behind
 * it, then the wall cracks outward from the impact point and the bricks tumble
 * away to reveal the new page. Zero dependencies: a single canvas with a tiny
 * perspective engine and procedurally painted brick textures.
 *
 * Usage (app/layout.tsx):
 *   import BrickTransition from "@/components/BrickTransition";
 *   <body>{children}<BrickTransition /></body>
 *
 * Every internal <Link>/<a> click is picked up automatically. For code-driven
 * navigation use brickNavigate("/about") instead of router.push.
 * Opt a link out with data-no-transition.
 */

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

/* ───────────────────────────── public API ───────────────────────────── */

export interface BrickTransitionProps {
  /** Total effect length in ms, clamped to 1000–2000. Default 1600. */
  duration?: number;
  /** Where the wall bursts open from. Default "center". */
  origin?: "center" | "click";
  /** "r, g, b" of the light that spills through the broken wall, or false for none. */
  glow?: string | false;
}

const NAVIGATE_EVENT = "brick-transition:navigate";

/** Programmatic navigation that plays the transition. */
export function brickNavigate(href: string, at?: { x: number; y: number }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NAVIGATE_EVENT, { detail: { href, at } }),
  );
}

/* ───────────────────────────── helpers ───────────────────────────── */

type Config = Required<BrickTransitionProps>;

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ───────────────────────────── textures ───────────────────────────── */

const TW = 360; // texture size, px
const TH = 150;
const MORTAR = 5;

interface Variant {
  tex: HTMLCanvasElement;
  h: number;
  s: number;
  l: number;
}

function roundedRect(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** Aged, soot-dark bricks with a mortar frame so neighbours form the mortar line. */
function makeVariants(count: number): Variant[] {
  const out: Variant[] = [];
  for (let n = 0; n < count; n++) {
    const rnd = mulberry32(1337 + n * 7919);
    const tex = document.createElement("canvas");
    tex.width = TW;
    tex.height = TH;
    const g = tex.getContext("2d")!;

    // mortar
    g.fillStyle = "#070605";
    g.fillRect(0, 0, TW, TH);
    for (let i = 0; i < 500; i++) {
      g.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.25)";
      g.fillRect(rnd() * TW, rnd() * TH, 1 + rnd() * 2, 1 + rnd() * 2);
    }

    const h = 6 + rnd() * 16;
    const s = 14 + rnd() * 12;
    const l = 7.5 + rnd() * 4.5;
    const m = MORTAR;

    g.save();
    roundedRect(g, m, m, TW - 2 * m, TH - 2 * m, 7);
    g.clip();

    const base = g.createLinearGradient(0, m, 0, TH - m);
    base.addColorStop(0, `hsl(${h} ${s}% ${l + 3.5}%)`);
    base.addColorStop(1, `hsl(${h} ${s}% ${l - 3}%)`);
    g.fillStyle = base;
    g.fillRect(0, 0, TW, TH);

    // mottling
    for (let i = 0; i < 16; i++) {
      const x = rnd() * TW,
        y = rnd() * TH,
        r = 18 + rnd() * 50;
      const rg = g.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(
        0,
        rnd() < 0.55 ? "rgba(0,0,0,0.3)" : "rgba(255,150,100,0.045)",
      );
      rg.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = rg;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    // a little moss on some bricks
    if (rnd() < 0.2) {
      const x = rnd() < 0.5 ? 0 : TW,
        y = rnd() < 0.5 ? 0 : TH;
      const rg = g.createRadialGradient(x, y, 0, x, y, 80);
      rg.addColorStop(0, "rgba(70,95,55,0.2)");
      rg.addColorStop(1, "rgba(70,95,55,0)");
      g.fillStyle = rg;
      g.fillRect(0, 0, TW, TH);
    }
    // grain
    for (let i = 0; i < 1400; i++) {
      g.fillStyle =
        rnd() < 0.6
          ? `rgba(0,0,0,${0.08 + rnd() * 0.22})`
          : `rgba(255,190,150,${0.02 + rnd() * 0.06})`;
      const sz = 0.8 + rnd() * 2.2;
      g.fillRect(rnd() * TW, rnd() * TH, sz, sz);
    }
    // pits
    for (let i = 0; i < 10; i++) {
      g.fillStyle = "rgba(0,0,0,0.4)";
      g.beginPath();
      g.arc(rnd() * TW, rnd() * TH, 1 + rnd() * 2.2, 0, Math.PI * 2);
      g.fill();
    }
    // hairline crack
    if (rnd() < 0.4) {
      let x = rnd() * TW,
        y = m;
      g.beginPath();
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++) {
        x += (rnd() - 0.5) * 40;
        y += 12 + rnd() * 14;
        g.lineTo(x, y);
      }
      g.strokeStyle = "rgba(0,0,0,0.55)";
      g.lineWidth = 1.3;
      g.stroke();
    }
    // bevel
    g.lineWidth = 3;
    g.strokeStyle = "rgba(255,200,160,0.08)";
    g.beginPath();
    g.moveTo(m + 4, TH - m - 4);
    g.lineTo(m + 4, m + 4);
    g.lineTo(TW - m - 4, m + 4);
    g.stroke();
    g.strokeStyle = "rgba(0,0,0,0.5)";
    g.beginPath();
    g.moveTo(m + 4, TH - m - 4);
    g.lineTo(TW - m - 4, TH - m - 4);
    g.lineTo(TW - m - 4, m + 4);
    g.stroke();
    g.restore();

    out.push({ tex, h, s, l });
  }
  return out;
}

function makeDust(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 96;
  const g = c.getContext("2d")!;
  const rg = g.createRadialGradient(48, 48, 0, 48, 48, 48);
  rg.addColorStop(0, "rgba(120,106,94,0.5)");
  rg.addColorStop(0.5, "rgba(85,75,66,0.2)");
  rg.addColorStop(1, "rgba(60,54,48,0)");
  g.fillStyle = rg;
  g.fillRect(0, 0, 96, 96);
  return c;
}

/* ───────────────────────────── engine ───────────────────────────── */

interface Brick {
  hx: number;
  hy: number;
  hz: number; // half extents
  tx: number;
  ty: number; // wall slot, relative to screen centre
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  sx: number;
  sy: number;
  sz: number;
  srx: number;
  sry: number;
  srz: number; // flight start
  delay: number;
  dur: number; // assemble timing (ms)
  d: number;
  bdelay: number;
  blife: number; // break timing (s)
  vx: number;
  vy: number;
  vz: number;
  vrx: number;
  vry: number;
  vrz: number;
  jx: number;
  jy: number;
  v: number;
  alpha: number;
  key: number;
  landed: boolean;
  released: boolean;
  rest: boolean;
  dead: boolean;
}

interface Particle {
  chip: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  grow: number;
  age: number;
  life: number;
  a: number;
  col: string;
}

interface Engine {
  start(href: string, x: number | null, y: number | null): void;
  pathChanged(): void;
  isActive(): boolean;
  warm(): void;
  destroy(): void;
}

const FACES: { n: number[]; i: number[]; front?: boolean }[] = [
  { n: [0, 0, -1], i: [0, 1, 3, 2], front: true },
  { n: [-1, 0, 0], i: [0, 2, 6, 4] },
  { n: [1, 0, 0], i: [1, 5, 7, 3] },
  { n: [0, -1, 0], i: [0, 4, 5, 1] },
  { n: [0, 1, 0], i: [2, 3, 7, 6] },
  { n: [0, 0, 1], i: [4, 5, 7, 6] },
];

const LIGHT = (() => {
  const v = [-0.35, -0.5, -0.8];
  const n = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / n, v[1] / n, v[2] / n];
})();
const AMBIENT = 0.22;
const REST_LIGHT = AMBIENT + (1 - AMBIENT) * -LIGHT[2];
const CHIP_COLORS = ["#1c1411", "#140e0c", "#241813", "#100b09"];
const MAX_WAIT = 2500; // longest we hold the wall waiting for the new route (ms)
const GRAVITY = 2300;

function createEngine(
  canvas: HTMLCanvasElement,
  cfg: { current: Config },
  push: (href: string) => void,
): Engine {
  const ctx = canvas.getContext("2d")!;
  let variants: Variant[] | null = null;
  let dust: HTMLCanvasElement | null = null;

  let phase: "idle" | "assemble" | "hold" | "break" = "idle";
  let bricks: Brick[] = [];
  const drawList: Brick[] = [];
  const parts: Particle[] = [];
  const px = new Float64Array(8);
  const py = new Float64Array(8);

  let W = 0,
    H = 0,
    dpr = 1,
    F = 1000;
  let A = 0,
    HOLD = 0,
    B = 0,
    TAIL = 0; // phase lengths (ms)
  let holdMin = 0,
    phaseStart = 0,
    last = 0,
    raf = 0;
  let href: string | null = null;
  let pushed = false,
    routeReady = false;
  let imp = { x: 0, y: 0 };
  let shake = 0,
    shakeX = 0,
    shakeY = 0;

  const stopScroll = (e: Event) => {
    if (e.cancelable) e.preventDefault();
  };
  const lock = (on: boolean) => {
    if (on) {
      window.addEventListener("wheel", stopScroll, { passive: false });
      window.addEventListener("touchmove", stopScroll, { passive: false });
    } else {
      window.removeEventListener("wheel", stopScroll);
      window.removeEventListener("touchmove", stopScroll);
    }
  };

  function ensure() {
    if (!variants) variants = makeVariants(10);
    if (!dust) dust = makeDust();
  }

  /* ----- wall ----- */

  function makeBrick(tx: number, ty: number, bw: number, bh: number): Brick {
    const hx = bw / 2 + 0.6,
      hy = bh / 2 + 0.6,
      hz = bh * 0.45;
    let sx = tx,
      sy = ty,
      sz = 0;
    const m = Math.random();
    if (m < 0.38) {
      // out of the distance
      sz = rand(1400, 3600);
      sx = tx + rand(-1, 1) * W * 0.9;
      sy = ty + rand(-1, 1) * H * 0.9;
    } else if (m < 0.64) {
      // from the sides
      sx = (Math.random() < 0.5 ? -1 : 1) * (W * 0.75 + rand(0, W * 0.6));
      sy = ty + rand(-0.5, 0.5) * H;
      sz = rand(-200, 1200);
    } else if (m < 0.8) {
      // from above
      sy = -(H * 0.75 + rand(0, H * 0.6));
      sx = tx + rand(-0.4, 0.4) * W;
      sz = rand(-200, 1200);
    } else if (m < 0.92) {
      // from below
      sy = H * 0.75 + rand(0, H * 0.6);
      sx = tx + rand(-0.4, 0.4) * W;
      sz = rand(-200, 1200);
    } else {
      // from the viewer
      sz = -F * rand(0.5, 0.72);
      sx = tx * rand(1.3, 2.2);
      sy = ty * rand(1.3, 2.2);
    }
    const spin = Math.PI * 1.4;
    return {
      hx,
      hy,
      hz,
      tx,
      ty,
      x: sx,
      y: sy,
      z: sz,
      rx: 0,
      ry: 0,
      rz: 0,
      sx,
      sy,
      sz,
      srx: rand(-spin, spin),
      sry: rand(-spin, spin),
      srz: rand(-spin, spin),
      delay: rand(0, 0.38) * A,
      dur: rand(0.5, 0.62) * A,
      d: 0,
      bdelay: 0,
      blife: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      vrx: 0,
      vry: 0,
      vrz: 0,
      jx: 0,
      jy: 0,
      v: Math.floor(Math.random() * 10),
      alpha: 0,
      key: 0,
      landed: false,
      released: false,
      rest: false,
      dead: false,
    };
  }

  function prepare(ox: number | null, oy: number | null) {
    ensure();
    const c = cfg.current;
    const total = clamp(c.duration, 1000, 2000);
    A = total * 0.42;
    HOLD = total * 0.06;
    B = total * 0.44;
    TAIL = total * 0.08;

    canvas.style.display = "block";
    const r = canvas.getBoundingClientRect();
    W = r.width || window.innerWidth;
    H = r.height || window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    F = Math.max(W, H) * 0.9;
    imp =
      c.origin === "click" && ox !== null && oy !== null
        ? { x: ox - W / 2, y: oy - H / 2 }
        : { x: 0, y: 0 };

    const bw = clamp(W / 9, 96, 190);
    const bh = bw / 2.4;
    const cols = Math.ceil(W / bw) + 2;
    const rows = Math.ceil(H / bh) + 2;
    bricks = [];
    for (let r2 = 0; r2 < rows; r2++) {
      for (let c2 = 0; c2 < cols; c2++) {
        const tx = (c2 - (cols - 1) / 2) * bw + (r2 % 2 ? bw / 2 : 0);
        const ty = (r2 - (rows - 1) / 2) * bh;
        if (
          Math.abs(tx) - bw / 2 > W / 2 + 2 ||
          Math.abs(ty) - bh / 2 > H / 2 + 2
        )
          continue;
        bricks.push(makeBrick(tx, ty, bw, bh));
      }
    }
    parts.length = 0;
    shake = shakeX = shakeY = 0;
    lock(true);
  }

  /* ----- particles ----- */

  function addDust(
    x: number,
    y: number,
    size: number,
    life: number,
    a: number,
  ) {
    if (parts.length > 700) return;
    parts.push({
      chip: false,
      x,
      y,
      vx: rand(-45, 45),
      vy: rand(-35, 10),
      rot: 0,
      vr: 0,
      size,
      grow: size * 1.2,
      age: 0,
      life,
      a,
      col: "",
    });
  }

  function addChip(x: number, y: number, vx: number, vy: number) {
    if (parts.length > 700) return;
    parts.push({
      chip: true,
      x,
      y,
      vx: vx * 0.6 + rand(-200, 200),
      vy: vy * 0.6 + rand(-260, 40),
      rot: rand(0, 6.28),
      vr: rand(-12, 12),
      size: rand(3, 9),
      grow: 0,
      age: 0,
      life: rand(0.45, 0.8),
      a: 1,
      col: CHIP_COLORS[Math.floor(Math.random() * 4)],
    });
  }

  function updateParticles(dt: number) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) {
        parts[i] = parts[parts.length - 1];
        parts.pop();
        continue;
      }
      if (p.chip) {
        p.vy += 2600 * dt;
      } else {
        p.vx *= Math.exp(-2.2 * dt);
        p.vy = p.vy * Math.exp(-2 * dt) - 18 * dt;
        p.size += p.grow * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
  }

  /* ----- phases ----- */

  function land(b: Brick) {
    shake = Math.min(shake + 0.6, 5.5);
    if (Math.random() < 0.5) {
      addDust(
        W / 2 + b.tx + rand(-b.hx, b.hx) * 0.6,
        H / 2 + b.ty + rand(-b.hy, b.hy) * 0.6,
        rand(46, 90),
        rand(0.32, 0.5),
        0.2,
      );
    }
  }

  function updateAssemble(el: number) {
    for (const b of bricks) {
      const t = clamp((el - b.delay) / b.dur, 0, 1);
      if (t <= 0) {
        b.alpha = 0;
        continue;
      }
      const e = easeOutCubic(t);
      const er = easeOutQuart(t);
      b.x = lerp(b.sx, b.tx, e);
      b.y = lerp(b.sy, b.ty, e);
      b.z = lerp(b.sz, 0, e);
      b.rx = lerp(b.srx, 0, er);
      b.ry = lerp(b.sry, 0, er);
      b.rz = lerp(b.srz, 0, er);
      b.alpha = clamp(t * 6, 0, 1);
      if (t >= 1) {
        b.rest = true;
        if (!b.landed) {
          b.landed = true;
          land(b);
        }
      }
    }
  }

  function enterHold(ts: number) {
    for (const b of bricks) {
      b.x = b.tx;
      b.y = b.ty;
      b.z = 0;
      b.rx = b.ry = b.rz = 0;
      b.alpha = 1;
      b.rest = true;
    }
    phase = "hold";
    phaseStart = ts;
    shake = Math.max(shake, 5);
    if (href && !pushed) {
      pushed = true;
      push(href);
    }
  }

  function enterBreak(ts: number) {
    phase = "break";
    phaseStart = ts;
    const Bs = B / 1000;
    let maxD = 1;
    for (const b of bricks) {
      b.d = Math.hypot(b.tx - imp.x, b.ty - imp.y);
      if (b.d > maxD) maxD = b.d;
    }
    for (const b of bricks) {
      b.bdelay = (b.d / maxD) * 0.3 * Bs + rand(0, 0.03) * Bs;
      b.blife = 0.66 * Bs;
      b.d /= maxD;
    }
    shake = 9;
  }

  function release(b: Brick) {
    b.released = true;
    b.rest = false;
    const dx = b.tx - imp.x,
      dy = b.ty - imp.y;
    const dist = Math.hypot(dx, dy);
    const k = 1 - b.d; // 1 at the impact point, 0 at the far corner
    const ang = rand(0, 6.28);
    const nx = dist > 1 ? dx / dist : Math.cos(ang);
    const ny = dist > 1 ? dy / dist : Math.sin(ang);
    const speed = 220 + 760 * Math.pow(k, 1.3) + rand(0, 140);
    b.vx = nx * speed + rand(-50, 50);
    b.vy = ny * speed * 0.7 - (80 + 380 * k) + rand(-40, 40);
    b.vz = -(120 + 1100 * Math.pow(k, 1.2)) * rand(0.6, 1);
    const spin = 2.5 + 7 * k;
    b.vrx = rand(-1, 1) * spin;
    b.vry = rand(-1, 1) * spin;
    b.vrz = rand(-1, 1) * spin;

    const sx = W / 2 + b.tx,
      sy = H / 2 + b.ty;
    if (Math.random() < 0.55) {
      addChip(
        sx + rand(-b.hx, b.hx) * 0.8,
        sy + rand(-b.hy, b.hy) * 0.8,
        b.vx,
        b.vy,
      );
      addChip(
        sx + rand(-b.hx, b.hx) * 0.8,
        sy + rand(-b.hy, b.hy) * 0.8,
        b.vx,
        b.vy,
      );
    }
    if (k > 0.2 && Math.random() < 0.5)
      addDust(sx, sy, 70 + 90 * k, rand(0.4, 0.6), 0.32);
  }

  function updateBreak(elSec: number, dt: number) {
    let alive = 0;
    const drag = Math.exp(-0.9 * dt);
    for (const b of bricks) {
      if (b.dead) continue;
      const age = elSec - b.bdelay;
      if (age < 0) {
        // trembling just before it lets go
        const k = clamp(1 + age / 0.09, 0, 1);
        b.jx = (Math.random() - 0.5) * 2.4 * k;
        b.jy = (Math.random() - 0.5) * 2.4 * k;
        alive++;
        continue;
      }
      if (!b.released) release(b);
      b.jx = b.jy = 0;
      b.vy += GRAVITY * dt;
      b.vx *= drag;
      b.vz *= drag;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z += b.vz * dt;
      b.rx += b.vrx * dt;
      b.ry += b.vry * dt;
      b.rz += b.vrz * dt;
      if (b.z < -F * 0.72) {
        b.z = -F * 0.72;
        b.vz = 0;
      }
      const u = age / b.blife;
      if (u >= 1) {
        b.dead = true;
        b.alpha = 0;
        continue;
      }
      b.alpha = 1 - smooth(0.4, 1, u);
      alive++;
    }
    return alive;
  }

  function finish() {
    phase = "idle";
    cancelAnimationFrame(raf);
    raf = 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = "none";
    lock(false);
    bricks = [];
    parts.length = 0;
    href = null;
  }

  /* ----- drawing ----- */

  function quad(i: number[]) {
    ctx.beginPath();
    ctx.moveTo(px[i[0]], py[i[0]]);
    ctx.lineTo(px[i[1]], py[i[1]]);
    ctx.lineTo(px[i[2]], py[i[2]]);
    ctx.lineTo(px[i[3]], py[i[3]]);
    ctx.closePath();
  }

  function drawBrick(b: Brick, cx: number, cy: number) {
    const v = variants![b.v];
    const X = b.x + b.jx,
      Y = b.y + b.jy;
    ctx.globalAlpha = b.alpha;

    if (b.rest) {
      // settled in the wall: a flat blit is exact
      ctx.drawImage(v.tex, cx + X - b.hx, cy + Y - b.hy, b.hx * 2, b.hy * 2);
      return;
    }

    const ca = Math.cos(b.rx),
      sa = Math.sin(b.rx);
    const cb = Math.cos(b.ry),
      sb = Math.sin(b.ry);
    const cg = Math.cos(b.rz),
      sg = Math.sin(b.rz);
    const m00 = cg * cb,
      m01 = cg * sb * sa - sg * ca,
      m02 = cg * sb * ca + sg * sa;
    const m10 = sg * cb,
      m11 = sg * sb * sa + cg * ca,
      m12 = sg * sb * ca - cg * sa;
    const m20 = -sb,
      m21 = cb * sa,
      m22 = cb * ca;
    const zMin = -F * 0.9;

    for (let i = 0; i < 8; i++) {
      const lx = i & 1 ? b.hx : -b.hx;
      const ly = i & 2 ? b.hy : -b.hy;
      const lz = i & 4 ? b.hz : -b.hz;
      const x = X + m00 * lx + m01 * ly + m02 * lz;
      const y = Y + m10 * lx + m11 * ly + m12 * lz;
      const z = Math.max(b.z + m20 * lx + m21 * ly + m22 * lz, zMin);
      const s = F / (F + z);
      px[i] = cx + x * s;
      py[i] = cy + y * s;
    }

    const fog = clamp(b.z / (F * 3), 0, 0.55);

    for (const f of FACES) {
      const nx = f.n[0],
        ny = f.n[1],
        nz = f.n[2];
      const wx = m00 * nx + m01 * ny + m02 * nz;
      const wy = m10 * nx + m11 * ny + m12 * nz;
      const wz = m20 * nx + m21 * ny + m22 * nz;
      const lx = nx * b.hx,
        ly = ny * b.hy,
        lz = nz * b.hz;
      const fx = X + m00 * lx + m01 * ly + m02 * lz;
      const fy = Y + m10 * lx + m11 * ly + m12 * lz;
      const fz = b.z + m20 * lx + m21 * ly + m22 * lz;
      if (wx * fx + wy * fy + wz * (F + fz) >= 0) continue; // facing away

      const bright =
        AMBIENT +
        (1 - AMBIENT) *
          Math.max(0, wx * LIGHT[0] + wy * LIGHT[1] + wz * LIGHT[2]);

      if (f.front) {
        ctx.setTransform(
          ((px[1] - px[0]) / TW) * dpr,
          ((py[1] - py[0]) / TW) * dpr,
          ((px[2] - px[0]) / TH) * dpr,
          ((py[2] - py[0]) / TH) * dpr,
          px[0] * dpr,
          py[0] * dpr,
        );
        ctx.drawImage(v.tex, 0, 0);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const dark =
          1 - (1 - clamp(1 - bright / REST_LIGHT, 0, 0.8)) * (1 - fog);
        if (dark > 0.01) {
          quad(f.i);
          ctx.fillStyle = `rgba(0,0,0,${dark.toFixed(3)})`;
          ctx.fill();
        }
      } else {
        const col = `hsl(${v.h.toFixed(0)} ${v.s.toFixed(0)}% ${(v.l * (bright / REST_LIGHT) * 0.85 * (1 - fog)).toFixed(1)}%)`;
        quad(f.i);
        ctx.fillStyle = col;
        ctx.fill();
        ctx.lineWidth = 0.7;
        ctx.strokeStyle = col;
        ctx.stroke();
      }
    }
  }

  function render(el: number) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2 + shakeX,
      cy = H / 2 + shakeY;
    const glow = cfg.current.glow;

    // light spilling through the broken wall
    if (glow && phase === "break") {
      const u = clamp(el / (B * 0.75), 0, 1);
      const R = (0.25 + easeOutCubic(u)) * Math.max(W, H);
      const a = 0.34 * Math.pow(1 - u, 1.6);
      const gx = W / 2 + imp.x,
        gy = H / 2 + imp.y;
      const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, R);
      rg.addColorStop(0, `rgba(${glow},${a.toFixed(3)})`);
      rg.addColorStop(0.35, `rgba(${glow},${(a * 0.45).toFixed(3)})`);
      rg.addColorStop(1, `rgba(${glow},0)`);
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }

    // bricks, far to near (outer first at equal depth)
    drawList.length = 0;
    for (const b of bricks) {
      if (b.dead || b.alpha < 0.01) continue;
      b.key = b.z + Math.hypot(b.x, b.y) * 0.001;
      drawList.push(b);
    }
    drawList.sort((p, q) => q.key - p.key);
    for (const b of drawList) drawBrick(b, cx, cy);
    ctx.globalAlpha = 1;

    // dust and chips
    for (const p of parts) {
      const u = p.age / p.life;
      if (p.chip) {
        ctx.globalAlpha = 1 - smooth(0.55, 1, u);
        const c = Math.cos(p.rot),
          s = Math.sin(p.rot);
        ctx.setTransform(
          c * dpr,
          s * dpr,
          -s * dpr,
          c * dpr,
          p.x * dpr,
          p.y * dpr,
        );
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else {
        ctx.globalAlpha = p.a * clamp(u * 8, 0, 1) * (1 - u);
        ctx.drawImage(
          dust!,
          p.x - p.size / 2,
          p.y - p.size / 2,
          p.size,
          p.size,
        );
      }
    }
    ctx.globalAlpha = 1;

    // vignette keeps the wall moody against a dark UI
    const va =
      phase === "assemble"
        ? smooth(0, A, el)
        : phase === "hold"
          ? 1
          : phase === "break"
            ? 1 - smooth(0, B * 0.6, el)
            : 0;
    if (va > 0.01) {
      const r = Math.hypot(W, H) / 2;
      const vg = ctx.createRadialGradient(
        W / 2,
        H / 2,
        r * 0.25,
        W / 2,
        H / 2,
        r,
      );
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, `rgba(0,0,0,${(0.72 * va).toFixed(3)})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function frame(ts: number) {
    raf = 0;
    if (phase === "idle") return;
    const dt = clamp((ts - last) / 1000, 0, 0.034);
    last = ts;
    const el = Math.max(0, ts - phaseStart);

    if (phase === "assemble") {
      updateAssemble(el);
      if (el >= A) enterHold(ts);
    } else if (phase === "hold") {
      if ((el >= holdMin && routeReady) || el >= holdMin + MAX_WAIT)
        enterBreak(ts);
    } else {
      const alive = updateBreak(el / 1000, dt);
      if ((el >= B && alive === 0 && parts.length === 0) || el >= B + TAIL) {
        finish();
        return;
      }
    }

    updateParticles(dt);
    shake *= Math.exp(-9 * dt);
    shakeX = (Math.random() - 0.5) * 2 * shake;
    shakeY = (Math.random() - 0.5) * 2 * shake;
    render(Math.max(0, ts - phaseStart));
    raf = requestAnimationFrame(frame);
  }

  /* ----- public ----- */

  return {
    start(h, ox, oy) {
      if (phase !== "idle") return;
      prepare(ox, oy);
      href = h;
      pushed = false;
      routeReady = false;
      holdMin = HOLD;
      phase = "assemble";
      phaseStart = last = performance.now();
      render(0);
      raf = requestAnimationFrame(frame);
    },
    /** Route changed. Either our own push landed, or something else navigated (back button, router.push). */
    pathChanged() {
      if (phase === "hold" && pushed) {
        routeReady = true;
      } else if (phase === "idle" && !prefersReducedMotion()) {
        prepare(null, null); // wall appears instantly, then breaks to reveal the new page
        for (const b of bricks) {
          b.x = b.tx;
          b.y = b.ty;
          b.z = 0;
          b.rx = b.ry = b.rz = 0;
          b.alpha = 1;
          b.rest = true;
          b.landed = true;
        }
        href = null;
        pushed = true;
        routeReady = true;
        holdMin = 50;
        phase = "hold";
        phaseStart = last = performance.now();
        render(0);
        raf = requestAnimationFrame(frame);
      }
    },
    isActive: () => phase !== "idle",
    warm: ensure,
    destroy() {
      cancelAnimationFrame(raf);
      lock(false);
      phase = "idle";
      canvas.style.display = "none";
    },
  };
}

/* ───────────────────────────── component ───────────────────────────── */

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function PageTransition({
  duration = 1600,
  origin = "center",
  glow = "255, 190, 120",
}: BrickTransitionProps) {
  const router = useRouter();
  const pathname = usePathname();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const prevPath = useRef(pathname);
  const glowRef = useRef(glow);
  const cfgRef = useRef<Config>({ duration, origin, glow });
  const routerRef = useRef(router);

  useEffect(() => {
    cfgRef.current = { duration, origin, glow: glowRef.current };
  }, [duration, origin]);

  // The mortar glow follows the active house theme.
  useEffect(() => {
    const HOUSE_GLOWS: Record<string, string> = {
      hogwarts: "255, 190, 120",
      gryffindor: "255, 122, 88",
      slytherin: "118, 235, 172",
      ravenclaw: "126, 188, 255",
      hufflepuff: "255, 214, 96",
    };
    const read = () => {
      const theme =
        document.documentElement.getAttribute("data-theme") || "hogwarts";
      glowRef.current = HOUSE_GLOWS[theme] ?? glow;
      cfgRef.current = { duration, origin, glow: glowRef.current };
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => mo.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = createEngine(canvas, cfgRef, (href) =>
      routerRef.current.push(href),
    );
    engineRef.current = engine;
    const warmup = window.setTimeout(() => engine.warm(), 400);

    const begin = (href: string, x: number | null, y: number | null) => {
      const target = new URL(href, window.location.href);
      if (
        prefersReducedMotion() ||
        target.pathname === window.location.pathname
      ) {
        routerRef.current.push(href);
        return;
      }
      routerRef.current.prefetch(href);
      engine.start(href, x, y);
    };

    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const el = (e.target as Element | null)?.closest?.("a[href]");
      if (!(el instanceof HTMLAnchorElement)) return;
      if (
        (el.target && el.target !== "_self") ||
        el.hasAttribute("download") ||
        el.hasAttribute("data-no-transition")
      )
        return;
      let url: URL;
      try {
        url = new URL(el.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return; // hash / query only
      if (prefersReducedMotion()) return;
      // preventDefault is enough: next/link skips its own navigation when the event is already handled
      e.preventDefault();
      if (engine.isActive()) return;
      begin(url.pathname + url.search + url.hash, e.clientX, e.clientY);
    };

    const onNavigate = (e: Event) => {
      const d = (
        e as CustomEvent<{ href: string; at?: { x: number; y: number } }>
      ).detail;
      if (d?.href) begin(d.href, d.at?.x ?? null, d.at?.y ?? null);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener(NAVIGATE_EVENT, onNavigate);
    return () => {
      window.clearTimeout(warmup);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener(NAVIGATE_EVENT, onNavigate);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  // Runs before paint, so the wall is already up when a new route commits.
  useIsoLayoutEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    engineRef.current?.pathChanged();
  }, [pathname]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 9999,
        display: "none",
        touchAction: "none",
        background: "transparent",
      }}
    />
  );
}
