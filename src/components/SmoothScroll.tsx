"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

export { gsap, ScrollTrigger };

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // 1. Initialize Lenis instance with super smooth scrolling settings
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      syncTouch: false,
      autoResize: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.5,
    });

    lenisRef.current = lenis;
    (window as unknown as { lenis?: Lenis }).lenis = lenis;

    // 2. Sync Lenis scroll with GSAP ScrollTrigger
    lenis.on("scroll", ScrollTrigger.update);

    // 3. Drive Lenis updates using GSAP's ticker
    const updateTicker = (time: number) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    gsap.ticker.lagSmoothing(0);

    // 4. Smooth anchor clicks (#timeline, #journey, #about, etc.)
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (href && href.startsWith("#") && href.length > 1) {
        const el = document.querySelector(href);
        if (el) {
          e.preventDefault();
          lenis.scrollTo(el as HTMLElement, { offset: -60, duration: 1.3 });
        }
      }
    };
    document.addEventListener("click", handleAnchorClick, { capture: true });

    // 5. Cleanup
    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
      gsap.ticker.remove(updateTicker);
      lenis.off("scroll", ScrollTrigger.update);
      lenis.destroy();
      lenisRef.current = null;
      delete (window as unknown as { lenis?: Lenis }).lenis;
    };
  }, []);

  // 6. Handle route changes across every page so smooth scroll always measures correct height
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;

    // Reset scroll to top if not navigating to a specific hash anchor
    if (!window.location.hash) {
      lenis.scrollTo(0, { immediate: true });
    }

    // Allow new page DOM to mount and settle, then recompute dimensions & ScrollTrigger
    const timer = setTimeout(() => {
      lenis.resize();
      ScrollTrigger.refresh();
    }, 120);

    return () => clearTimeout(timer);
  }, [pathname]);

  return <>{children}</>;
}

export default SmoothScroll;
