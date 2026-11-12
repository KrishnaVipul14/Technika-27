"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MotionConfig } from "motion/react";
import { ScrollTrigger } from "@/lib/gsap";
import { MagicInteractions } from "./magic-interactions";
import { WandCursor } from "./wand-cursor";
import { isHomeIntroCompleted } from "@/lib/intro-state";
import FireworkDragon from "@/components/fireworks-dragon";
import { HouseSwitcher } from "./house-switcher";
import { useRegistrationArrival } from "./registration-arrival";

interface MagicContextValue {
  enabled: boolean;
  ready: boolean;
  setReady: (ready: boolean) => void;
}

const MagicContext = createContext<MagicContextValue>({
  enabled: true,
  ready: false,
  setReady: () => {},
});
export const useMagic = () => useContext(MagicContext);

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  size: number;
  blue: boolean;
};

function WandSparks({ enabled }: { enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let sparks: Spark[] = [];
    let frame = 0;
    let lastSpawn = 0;
    const finePointer = window.matchMedia("(pointer: fine)");
    let accent = "";
    let highlight = "";
    const getAccent = () => {
      const styles = getComputedStyle(document.documentElement);
      accent = styles.getPropertyValue("--fg-brand").trim();
      highlight = styles.getPropertyValue("--fg-highlight").trim();
    };
    const palette = new MutationObserver(getAccent);
    palette.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-house"],
    });
    getAccent();
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      sparks = sparks.filter((p) => p.age < p.life);
      for (const p of sparks) {
        p.age++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.025;
        ctx.globalAlpha = Math.max(0, (1 - p.age / p.life) * 0.9);
        ctx.fillStyle = p.blue ? highlight : accent;
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      frame = sparks.length ? requestAnimationFrame(draw) : 0;
    };
    const spawn = (event: PointerEvent, burst: boolean) => {
      if (
        !burst &&
        (!finePointer.matches || performance.now() - lastSpawn < 32)
      )
        return;
      lastSpawn = performance.now();
      const count = burst ? 22 : 2;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = burst ? 1.3 + Math.random() * 3 : 0.3;
        sparks.push({
          x: event.clientX + 4,
          y: event.clientY + 4,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          age: 0,
          life: burst ? 30 + Math.random() * 25 : 22,
          size: burst ? 0.8 + Math.random() * 1.5 : 0.9,
          blue: Math.random() > 0.8,
        });
      }
      sparks = sparks.slice(-100);
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const move = (e: PointerEvent) => spawn(e, false);
    const click = (e: PointerEvent) => spawn(e, true);
    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", click, { passive: true });
    return () => {
      palette.disconnect();
      cancelAnimationFrame(frame);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", click);
    };
  }, [enabled]);
  return <canvas className="wand-sparks" ref={canvasRef} aria-hidden="true" />;
}

export function Experience({
  children,
  header,
  footer,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();
  const { active: arrivalActive } = useRegistrationArrival();
  const immersive = pathname === "/account" || arrivalActive;
  const isHome = pathname === "/";
  // On the home page, the intro video controls when ready becomes true (at the castle scene).
  // On all other routes (or when returning to home after intro has completed), ready is immediately true.
  const [homeReady, setReady] = useState(
    () => !isHome || isHomeIntroCompleted(),
  );
  const ready = !isHome || homeReady || isHomeIntroCompleted();
  const enabled = true;

  return (
    <MotionConfig
      reducedMotion={immersive ? "user" : enabled ? "never" : "always"}
    >
      <MagicContext.Provider value={{ enabled, ready, setReady }}>
        <div className="experience-content" data-home-ready={ready}>
          {!immersive && header}
          {children}
          {!immersive && footer}
        </div>
        {!immersive && ready && (
          <>
            <WandSparks enabled={enabled} />
            <WandCursor />
            <FireworkDragon />
            <MagicInteractions />
            <HouseSwitcher />
            <div className="scroll-progress" aria-hidden="true" />
          </>
        )}
      </MagicContext.Provider>
    </MotionConfig>
  );
}
