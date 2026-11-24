"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useMagic } from "./experience";

export function MagicInteractions() {
  const pathname = usePathname();
  const { enabled, ready } = useMagic();

  useEffect(() => {
    if (!enabled || !ready) return;
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const cleanup: (() => void)[] = [];
      const ctx = gsap.context(() => {
      gsap.fromTo(".scroll-progress", { scaleX: 0 }, { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: .3 } });
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      const hero = document.querySelector<HTMLElement>(".hero");
      const heroLayer = hero?.querySelector<HTMLElement>(".hero-tilt-layer");
      if (hero && heroLayer) {
        const rotateX = gsap.quickTo(heroLayer, "rotationX", { duration: .8, ease: "power3.out" });
        const rotateY = gsap.quickTo(heroLayer, "rotationY", { duration: .8, ease: "power3.out" });
        const enter = () => hero.classList.add("hero-depth-active");
        const move = (event: PointerEvent) => {
          const rect = hero.getBoundingClientRect();
          const px = (event.clientX - rect.left) / rect.width;
          const py = (event.clientY - rect.top) / rect.height;
          rotateX((.5 - py) * 2.4);
          rotateY((px - .5) * 2.8);
          hero.style.setProperty("--hero-light-x", `${px * 100}%`);
          hero.style.setProperty("--hero-light-y", `${py * 100}%`);
        };
        const leave = () => {
          rotateX(0); rotateY(0); hero.classList.remove("hero-depth-active");
          hero.style.removeProperty("--hero-light-x"); hero.style.removeProperty("--hero-light-y");
        };
        hero.addEventListener("pointerenter", enter);
        hero.addEventListener("pointermove", move, { passive: true });
        hero.addEventListener("pointerleave", leave);
        cleanup.push(() => {
          hero.removeEventListener("pointerenter", enter);
          hero.removeEventListener("pointermove", move);
          hero.removeEventListener("pointerleave", leave);
          hero.classList.remove("hero-depth-active");
          hero.style.removeProperty("--hero-light-x");
          hero.style.removeProperty("--hero-light-y");
          gsap.set(heroLayer, { clearProps: "transform" });
        });
      }
      const selector = '.event-card, .sponsor-card, .house-card, .academy-card, .memory-card, .order-gallery[data-magic-hydrated="true"] .order-card, .about-copy.parchment-sheet, .campus-panel, .sponsor-invite, .invitation';
      const attached = new WeakSet<HTMLElement>();
      const attachCards = () => gsap.utils.toArray<HTMLElement>(selector).forEach((element) => {
        if (attached.has(element)) return;
        attached.add(element);
        const x = gsap.quickTo(element, "rotationY", { duration: .45, ease: "power3.out" });
        const y = gsap.quickTo(element, "rotationX", { duration: .45, ease: "power3.out" });
        let rect: DOMRect;
        const enter = () => {
          rect = element.getBoundingClientRect();
          element.classList.add("magic-card-active");
          ctx.add(() => { gsap.to(element, { y: -8, scale: 1.015, duration: .35, ease: "power3.out", overwrite: "auto" }); });
        };
        const move = (event: PointerEvent) => {
          if (!rect) rect = element.getBoundingClientRect();
          const px = (event.clientX - rect.left) / rect.width;
          const py = (event.clientY - rect.top) / rect.height;
          x((px - .5) * 9); y((.5 - py) * 9);
          element.style.setProperty("--glow-x", `${px * 100}%`);
          element.style.setProperty("--glow-y", `${py * 100}%`);
        };
        const leave = () => {
          x(0); y(0); element.classList.remove("magic-card-active");
          ctx.add(() => { gsap.to(element, { y: 0, scale: 1, duration: .5, ease: "power3.out", overwrite: "auto" }); });
        };
        element.addEventListener("pointerenter", enter);
        element.addEventListener("pointermove", move, { passive: true });
        element.addEventListener("pointerleave", leave);
        cleanup.push(() => {
          element.removeEventListener("pointerenter", enter);
          element.removeEventListener("pointermove", move);
          element.removeEventListener("pointerleave", leave);
          element.classList.remove("magic-card-active");
          gsap.set(element, { clearProps: "transform" });
        });
      });
      attachCards();
      const observer = new MutationObserver((records) => {
        const newCards = records.some((record) => record.type === "attributes" || [...record.addedNodes].some((node) =>
          node instanceof Element && (node.matches(selector) || node.querySelector(selector))));
        if (newCards) ctx.add(attachCards);
      });
      const main = document.getElementById("main-content");
      if (main) observer.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-magic-hydrated"] });
      cleanup.push(() => observer.disconnect());
      });
      const refresh = window.setTimeout(() => ScrollTrigger.refresh(), 120);
      return () => { window.clearTimeout(refresh); cleanup.forEach((fn) => fn()); ctx.revert(); };
    });
    return () => media.revert();
  }, [enabled, ready, pathname]);

  return null;
}
