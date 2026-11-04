"use client";

/**
 * SnakeScroll — a custom scrollbar where a Nagini-style snake slithers down
 * the right edge of the viewport and grows longer the further you scroll.
 *
 * Works in React (Vite/CRA) and Next.js (App Router or Pages Router).
 * The snake is drawn on a <canvas>, so it needs no extra dependencies.
 *
 * Colours:
 *   palette="nagini" (default)  the original dark-green snake with gold diamonds
 *   palette="theme"             recoloured from the active house theme (house-themes.css)
 *
 * Usage (Next.js App Router) — app/layout.tsx:
 *   <body>{children}<SnakeScroll /></body>
 */

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

export interface SnakeScrollProps {
  /** Width of the scrollbar strip in px. The snake scales with it. Default 56. */
  width?: number;
  /** Space kept free above the tail and below the head, in px. Default 20. */
  inset?: number;
  /** Hide the browser's native scrollbar (html element only). Default true. */
  hideNativeScrollbar?: boolean;
  /** "nagini" = the original green snake. "theme" = colours follow the active house. */
  palette?: "nagini" | "theme";
  /** Extra classes for the fixed wrapper, e.g. "hidden md:block" or "z-[100]". */
  className?: string;
}

/* ------------------------------------------------------------------ */
/* colours                                                             */
/* ------------------------------------------------------------------ */

type Palette = {
  outline: string;
  flankA: string;
  flankB: string;
  backA: string;
  backB: string;
  dorsal: string;
  sheen: string;
  diamondFill: string;
  diamondStroke: string;
  spots: string;
  headA: string;
  headB: string;
  headC: string;
  headMarkFill: string;
  headMarkStroke: string;
  eyeGlow: string;
  eyeA: string;
  eyeB: string;
  pupil: string;
  glint: string;
  nostril: string;
  tongue: string;
};

/** The original Nagini look. */
const NAGINI: Palette = {
  outline: "#02100a",
  flankA: "#3b6a2c",
  flankB: "#6f9a35",
  backA: "#14452a",
  backB: "#1b5e35",
  dorsal: "#06210f",
  sheen: "rgba(200,255,200,0.2)",
  diamondFill: "rgba(2,16,8,0.85)",
  diamondStroke: "rgba(230,190,70,0.55)",
  spots: "rgba(232,205,110,0.75)",
  headA: "#164a2c",
  headB: "#256b3a",
  headC: "#3c8a3f",
  headMarkFill: "rgba(3,22,10,0.55)",
  headMarkStroke: "rgba(230,190,70,0.55)",
  eyeGlow: "rgba(255,200,40,0.7)",
  eyeA: "#fff7a8",
  eyeB: "#e3a30c",
  pupil: "#050505",
  glint: "rgba(255,255,255,0.85)",
  nostril: "#02100a",
  tongue: "#d3203f",
};

type RGB = [number, number, number];
const rgba = (c: RGB, a = 1) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

/**
 * Turns a theme token into a plain [r, g, b].
 * getPropertyValue("--primary-600") returns the raw text, which contains calc()
 * and that the canvas can't parse (it then silently stays black). So we let the
 * browser compute a real colour on a hidden element and read it back as pixels.
 */
function makeReader() {
  const probe = document.createElement("span");
  probe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none";
  document.documentElement.appendChild(probe);
  const px = document.createElement("canvas");
  px.width = px.height = 1;
  const pctx = px.getContext("2d", { willReadFrequently: true });
  const root = getComputedStyle(document.documentElement);

  const read = (token: string, fallback: RGB): RGB => {
    if (!pctx || !root.getPropertyValue(token).trim()) return fallback; // token missing
    probe.style.color = `var(${token})`;
    const css = getComputedStyle(probe).color;
    pctx.clearRect(0, 0, 1, 1);
    pctx.fillStyle = "#ff00ff"; // sentinel: stays magenta if the browser can't parse `css`
    pctx.fillStyle = css;
    pctx.fillRect(0, 0, 1, 1);
    const d = pctx.getImageData(0, 0, 1, 1).data;
    if (d[0] === 255 && d[1] === 0 && d[2] === 255) return fallback;
    return [d[0], d[1], d[2]];
  };
  return { read, dispose: () => probe.remove() };
}

/** Same snake, recoloured from the active theme's tokens. */
function themePalette(read: (token: string, fb: RGB) => RGB): Palette {
  const bg = read("--bg-sunken", [2, 16, 10]);
  const p400 = read("--primary-400", [111, 154, 53]);
  const p600 = read("--primary-600", [59, 106, 44]);
  const p800 = read("--primary-800", [20, 69, 42]);
  const p900 = read("--primary-900", [6, 33, 15]);
  const p200 = read("--primary-200", [200, 255, 200]);
  const accent = read("--secondary-400", [230, 190, 70]);
  const accentPale = read("--secondary-300", [232, 205, 110]);
  const eyeLight = read("--warning-fg", [255, 247, 168]);
  const eyeDeep = read("--warning-solid", [227, 163, 12]);
  const tongue = read("--danger-solid", [211, 32, 63]);
  const white = read("--fg-strong", [255, 255, 255]);
  return {
    outline: rgba(bg),
    flankA: rgba(p600),
    flankB: rgba(p400),
    backA: rgba(p800),
    backB: rgba(p600),
    dorsal: rgba(p900),
    sheen: rgba(p200, 0.22),
    diamondFill: rgba(p900, 0.85),
    diamondStroke: rgba(accent, 0.6),
    spots: rgba(accentPale, 0.75),
    headA: rgba(p800),
    headB: rgba(p600),
    headC: rgba(p400),
    headMarkFill: rgba(p900, 0.6),
    headMarkStroke: rgba(accent, 0.6),
    eyeGlow: rgba(eyeDeep, 0.7),
    eyeA: rgba(eyeLight),
    eyeB: rgba(eyeDeep),
    pupil: rgba(bg),
    glint: rgba(white, 0.85),
    nostril: rgba(bg),
    tongue: rgba(tongue),
  };
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

/** All sizes derive from `width` so the snake scales cleanly. */
function geometry(width: number, inset: number, height: number) {
  const u = width / 56;
  const R = 5.6 * u; // max body radius
  const headReach = 2.6 * R; // how far the snout sticks out past the head point
  const minLen = 46 * u; // snake length at scroll position 0
  return {
    u,
    R,
    amp: 14.5 * u, // sideways swing of the wave
    k: TAU / (88 * u), // wave number (one S-curve every ~88px)
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

/* ------------------------------------------------------------------ */
/* component                                                           */
/* ------------------------------------------------------------------ */

export default function SnakeScroll({
  width = 56,
  inset = 20,
  hideNativeScrollbar = true,
  palette = "nagini",
  className = "",
}: SnakeScrollProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
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
    style.setAttribute("data-snake-scroll", "");
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
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pool: Pt[] = [];

    let g = geometry(width, inset, window.innerHeight);
    let W = 0;
    let H = 0;
    let target = 0;
    let cur = 0;
    let speed = 0;
    let phase = 0;
    let tongueClock = 0;
    let last = performance.now();
    let raf = 0;
    let dirty = true;

    let pal: Palette = NAGINI;
    const reader = palette === "theme" ? makeReader() : null;
    const refreshColors = () => {
      pal = reader ? themePalette(reader.read) : NAGINI;
      dirty = true;
    };
    const observer = reader
      ? new MutationObserver(refreshColors)
      : null;
    observer?.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-house", "data-theme"],
    });
    refreshColors();

    const wave = (y: number, y0: number, ph: number) => {
      const env = 0.45 + 0.55 * smoothstep(0, 90 * g.u, y - y0);
      return g.amp * env * Math.sin(g.k * (y - y0) + ph);
    };

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

    const drawHead = () => {
      const r = g.R;

      // Tongue (drawn first so it tucks under the snout)
      const cycle = tongueClock % 3.1;
      const flick = cycle < 0.85 ? Math.sin((cycle / 0.85) * Math.PI) : 0;
      if (flick > 0.02) {
        const startX = r * 2.3;
        const len = r * (0.5 + 2.2 * flick);
        const fork = r * 0.8 * flick;
        const spread = 0.4 + 0.18 * Math.sin(tongueClock * 40);
        ctx.save();
        ctx.lineCap = "round";
        ctx.strokeStyle = pal.tongue;
        ctx.lineWidth = Math.max(1, r * 0.16);
        ctx.beginPath();
        ctx.moveTo(startX, 0);
        ctx.lineTo(startX + len, 0);
        for (const side of [-1, 1]) {
          ctx.moveTo(startX + len, 0);
          ctx.lineTo(
            startX + len + Math.cos(spread) * fork,
            side * Math.sin(spread) * fork,
          );
        }
        ctx.stroke();
        ctx.restore();
      }

      // Skull
      const head = new Path2D();
      head.moveTo(-0.9 * r, -0.72 * r);
      head.bezierCurveTo(
        -0.1 * r,
        -1.55 * r,
        1.25 * r,
        -1.35 * r,
        2.05 * r,
        -0.5 * r,
      );
      head.quadraticCurveTo(2.55 * r, 0, 2.05 * r, 0.5 * r);
      head.bezierCurveTo(
        1.25 * r,
        1.35 * r,
        -0.1 * r,
        1.55 * r,
        -0.9 * r,
        0.72 * r,
      );
      head.closePath();

      const hg = ctx.createLinearGradient(-0.9 * r, 0, 2.4 * r, 0);
      hg.addColorStop(0, pal.headA);
      hg.addColorStop(0.55, pal.headB);
      hg.addColorStop(1, pal.headC);
      ctx.fillStyle = hg;
      ctx.fill(head);
      ctx.lineJoin = "round";
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = pal.outline;
      ctx.stroke(head);

      // Dorsal diamond marking, same motif as the body
      ctx.beginPath();
      ctx.moveTo(-0.7 * r, 0);
      ctx.lineTo(0.2 * r, -0.5 * r);
      ctx.lineTo(1.5 * r, 0);
      ctx.lineTo(0.2 * r, 0.5 * r);
      ctx.closePath();
      ctx.fillStyle = pal.headMarkFill;
      ctx.fill();
      ctx.lineWidth = 0.7;
      ctx.strokeStyle = pal.headMarkStroke;
      ctx.stroke();

      // Eyes: glowing amber, slit pupils
      ctx.save();
      ctx.shadowColor = pal.eyeGlow;
      ctx.shadowBlur = 4;
      for (const side of [-1, 1]) {
        const ex = 1.05 * r;
        const ey = side * 0.78 * r;
        const eg = ctx.createRadialGradient(
          ex - 0.08 * r,
          ey - 0.08 * r,
          0,
          ex,
          ey,
          0.4 * r,
        );
        eg.addColorStop(0, pal.eyeA);
        eg.addColorStop(1, pal.eyeB);
        ctx.fillStyle = eg;
        ctx.beginPath();
        ctx.ellipse(ex, ey, 0.4 * r, 0.32 * r, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      for (const side of [-1, 1]) {
        const ex = 1.05 * r;
        const ey = side * 0.78 * r;
        ctx.fillStyle = pal.pupil;
        ctx.beginPath();
        ctx.ellipse(ex, ey, 0.3 * r, 0.07 * r, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = pal.glint;
        ctx.beginPath();
        ctx.arc(ex + 0.14 * r, ey - 0.12 * r, Math.max(0.6, 0.06 * r), 0, TAU);
        ctx.fill();
      }

      // Nostrils
      ctx.fillStyle = pal.nostril;
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(2.0 * r, side * 0.17 * r, Math.max(0.6, 0.07 * r), 0, TAU);
        ctx.fill();
      }
    };

    /* ---------------- body ---------------- */
    const drawSnake = () => {
      const cx = W / 2;
      const y0 = inset; // tail is pinned to the top of the track
      const y1 = y0 + g.minLen + cur * g.span; // head moves with scroll

      // Sample the centre line from tail to head
      const step = 1.6;
      let n = 0;
      let s = 0;
      let px = 0;
      let py = 0;
      for (let y = y0; y <= y1 + step * 0.5; y += step) {
        const yy = y > y1 ? y1 : y;
        const x = cx + wave(yy, y0, phase);
        if (n > 0) s += Math.hypot(x - px, yy - py);
        const slope = wave(yy + 0.5, y0, phase) - wave(yy - 0.5, y0, phase);
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
      if (n < 2) return;

      // Thin at the tail, full thickness a little way up, slight neck
      const L = s;
      for (let i = 0; i < n; i++) {
        const p = pool[i];
        const tail =
          0.1 + 0.9 * smoothstep(0, Math.min(110 * g.u, L * 0.9), p.s);
        const neck = 0.86 + 0.14 * smoothstep(0, 22 * g.u, L - p.s);
        p.r = g.R * tail * neck;
      }

      const vGrad = (c0: string, c1: string) => {
        const gr = ctx.createLinearGradient(0, y0, 0, y1 + 1);
        gr.addColorStop(0, c0);
        gr.addColorStop(1, c1);
        return gr;
      };

      // One path of overlapping circles = one smooth, variable-width tube.
      const layer = (
        mul: number,
        add: number,
        fill: string | CanvasGradient,
        offset = 0,
      ) => {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const p = pool[i];
          const r = p.r * mul + add;
          if (r <= 0) continue;
          const x = p.x + p.nx * p.r * offset;
          const y = p.y + p.ny * p.r * offset;
          ctx.moveTo(x + r, y);
          ctx.arc(x, y, r, 0, TAU);
        }
        ctx.fillStyle = fill;
        ctx.fill();
      };

      layer(1, 1.3, pal.outline); // outline
      layer(1, 0, vGrad(pal.flankA, pal.flankB)); // pale flanks
      layer(0.8, 0, vGrad(pal.backA, pal.backB)); // green back
      layer(0.42, 0, pal.dorsal); // dark dorsal stripe
      layer(0.16, 0, pal.sheen, -0.5); // wet sheen

      // Diamond pattern along the back
      const gap = 17 * g.u;
      ctx.beginPath();
      for (let i = 1, next = gap * 0.5; i < n - 1; i++) {
        const p = pool[i];
        if (p.s < next) continue;
        next += gap;
        if (p.r < 1.8) continue;
        const a = Math.max(1.5, p.r * 0.95);
        const b = p.r * 0.62;
        ctx.moveTo(p.x + p.tx * a, p.y + p.ty * a);
        ctx.lineTo(p.x + p.nx * b, p.y + p.ny * b);
        ctx.lineTo(p.x - p.tx * a, p.y - p.ty * a);
        ctx.lineTo(p.x - p.nx * b, p.y - p.ny * b);
        ctx.closePath();
      }
      ctx.fillStyle = pal.diamondFill;
      ctx.fill();
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = pal.diamondStroke;
      ctx.stroke();

      // Pale flank spots between the diamonds
      ctx.beginPath();
      for (let i = 1, next = gap; i < n - 1; i++) {
        const p = pool[i];
        if (p.s < next) continue;
        next += gap;
        if (p.r < 2.2) continue;
        const dr = Math.max(0.7, p.r * 0.13);
        for (const side of [-1, 1]) {
          const x = p.x + p.nx * p.r * 0.74 * side;
          const y = p.y + p.ny * p.r * 0.74 * side;
          ctx.moveTo(x + dr, y);
          ctx.arc(x, y, dr, 0, TAU);
        }
      }
      ctx.fillStyle = pal.spots;
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
      if (!W || !H) return;

      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const reduced = reduceMotion.matches;

      const prev = cur;
      cur += (target - cur) * (reduced ? 1 : 1 - Math.exp(-dt * 12));
      if (Math.abs(target - cur) < 0.00002) cur = target;

      // With reduced motion, only redraw when something actually changed.
      if (reduced && !dirty && cur === prev) return;

      const vPx = dt > 0 ? (Math.abs(cur - prev) * g.span) / dt : 0;
      speed += (vPx - speed) * 0.12;
      const boost = clamp(speed / 500, 0, 1); // 0 idle → 1 scrolling fast

      if (!reduced) {
        phase += dt * (1.5 + boost * 8); // body ripples faster while scrolling
        tongueClock += dt * (1 + boost * 2.5); // and the tongue flicks more
      }

      ctx.clearRect(0, 0, W, H);
      drawSnake();
      dirty = false;
    };

    resize();
    cur = target; // no slide-in when the page loads already scrolled
    raf = requestAnimationFrame(frame);

    window.addEventListener("scroll", readScroll, { passive: true });
    window.addEventListener("resize", resize);
    const roWrap = new ResizeObserver(resize);
    roWrap.observe(wrap);
    const roDoc = new ResizeObserver(readScroll); // content height changes
    roDoc.observe(document.documentElement);
    roDoc.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      reader?.dispose();
      window.removeEventListener("scroll", readScroll);
      window.removeEventListener("resize", resize);
      roWrap.disconnect();
      roDoc.disconnect();
    };
  }, [width, inset, palette, isMobile]);

  /* Click / drag the track to scrub the page ------------------------ */
  const scrub = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (isMobile) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    const g = geometry(width, inset, wrap.clientHeight);
    const rect = wrap.getBoundingClientRect();
    // Put the head under the pointer
    const p = clamp((e.clientY - rect.top - inset - g.minLen) / g.span, 0, 1);
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
      style={{ width }}
      className={[
        "fixed inset-y-0 right-0 z-50 cursor-grab touch-none select-none transition-opacity duration-300 active:cursor-grabbing",
        scrollable ? "opacity-100" : "pointer-events-none opacity-0",
        className,
      ].join(" ")}
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
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]"
        data-testid="snake-scroll-canvas"
      />
    </div>
  );
}