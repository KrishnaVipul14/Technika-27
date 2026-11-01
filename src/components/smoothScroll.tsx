"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useRegistrationArrival } from "./registration-arrival";

type LenisContextValue = {
  getLenis: () => Lenis | null;
  scrollTo: (
    target: string | number | HTMLElement,
    options?: {
      offset?: number;
      duration?: number;
      immediate?: boolean;
      lock?: boolean;
    },
  ) => void;
};

const LenisContext = createContext<LenisContextValue>({
  getLenis: () => null,
  scrollTo: () => {},
});

export const useLenis = () => useContext(LenisContext);

export interface SmoothScrollProps {
  children: ReactNode;
}

export function SmoothScroll({ children }: SmoothScrollProps) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();
  const { active: arrivalActive } = useRegistrationArrival();
  const immersive = pathname === "/account" || arrivalActive;

  useEffect(() => {
    if (immersive) return;
    // Instantiate Lenis with optimal fluid lerp smoothing
    const lenis = new Lenis({
      lerp: 0.088, // Silky smooth deceleration without sluggishness
      wheelMultiplier: 0.95,
      touchMultiplier: 1.25,
      smoothWheel: true,
      syncTouch: false,
      // Do not disable smooth scroll based on OS reduced motion;
      // ensures the experience remains fluid across all systems
      respectReducedMotion: false,
      prevent: (node) =>
        node instanceof HTMLElement &&
        (node.hasAttribute("data-lenis-prevent") ||
          node.closest("[data-lenis-prevent]") !== null),
    });

    lenisRef.current = lenis;

    // Expose globally for devtools, custom scripts, and external controls
    if (typeof window !== "undefined") {
      (window as unknown as { lenis: Lenis }).lenis = lenis;
    }

    // Sync Lenis scroll position with GSAP ScrollTrigger on every frame
    lenis.on("scroll", ScrollTrigger.update);

    // Drive Lenis from GSAP's ticker for unified animation frame timing
    const handleTicker = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(handleTicker);
    // Allow graceful lag smoothing so heavy scenes don't cause sudden jerks
    gsap.ticker.lagSmoothing(500, 33);

    // Smooth scroll for in-page anchor links (e.g., href="#timeline", href="#about")
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (href && href.startsWith("#") && href.length > 1) {
        const element = document.querySelector(href);
        if (element) {
          e.preventDefault();
          lenis.scrollTo(element as HTMLElement, {
            offset: -90,
            duration: 1.2,
          });
        }
      }
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });

    // Initial resize calculation
    lenis.resize();

    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
      lenis.off("scroll", ScrollTrigger.update);
      gsap.ticker.remove(handleTicker);
      lenis.destroy();
      lenisRef.current = null;
      if (typeof window !== "undefined") {
        delete (window as unknown as { lenis?: Lenis }).lenis;
      }
    };
  }, [immersive]);

  // On route changes, recalculate dimensions and update ScrollTrigger
  useEffect(() => {
    if (!lenisRef.current) return;
    const timer = setTimeout(() => {
      lenisRef.current?.resize();
      ScrollTrigger.refresh();
    }, 150);
    return () => clearTimeout(timer);
  }, [pathname]);

  const scrollTo = (
    target: string | number | HTMLElement,
    options?: {
      offset?: number;
      duration?: number;
      immediate?: boolean;
      lock?: boolean;
    },
  ) => {
    lenisRef.current?.scrollTo(target, options);
  };

  const getLenis = () => lenisRef.current;

  return (
    <LenisContext.Provider value={{ getLenis, scrollTo }}>
      {children}
    </LenisContext.Provider>
  );
}

export default SmoothScroll;

