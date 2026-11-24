"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useMagic } from "./experience";

export function Reveal({ children, className = "", delay = 0 }: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { enabled, ready } = useMagic();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const media = gsap.matchMedia();
    media.add({ motion: "(prefers-reduced-motion: no-preference)", reduced: "(prefers-reduced-motion: reduce)" }, (match) => {
      if (!enabled || match.conditions?.reduced) {
        gsap.set(element, { opacity: 1, clearProps: "transform,filter" });
        return;
      }
      if (!ready) return;
      // Only this hydrated Reveal may animate its server-rendered children.
      // The global shell can mount before streamed page sections hydrate.
      element.querySelectorAll<HTMLElement>(".about-crest, .campus-art > img, .delegate-emblem, .owl-moon").forEach((decoration) => {
        if (decoration.closest("[data-reveal]") !== element) return;
        const crest = decoration.classList.contains("about-crest");
        gsap.fromTo(decoration, { y: 28, rotation: crest ? -7 : 0 }, {
          y: -28, rotation: crest ? 7 : 0, ease: "none",
          scrollTrigger: { trigger: decoration.parentElement, start: "top bottom", end: "bottom top", scrub: 1.4 },
        });
      });
      const children = element.querySelectorAll(".sponsor-card, .house-card, .academy-card, .memory-card, .about-features > span, .campus-points > span");
      const reveal = gsap.timeline({ paused: true, defaults: { ease: "power3.out" } });
      reveal.fromTo(element, { opacity: 0, y: 58, filter: "blur(5px)" }, {
        opacity: 1, y: 0, filter: "blur(0px)", duration: 1.05, delay,
        onComplete: () => { gsap.set(element, { clearProps: "filter,transform" }); },
      });
      if (children.length) {
        reveal.fromTo(children, { opacity: 0, y: 28, scale: .94 }, {
          opacity: 1, y: 0, scale: 1, duration: .85, stagger: .11,
          clearProps: "transform",
        }, .16);
      }
      ScrollTrigger.create({ trigger: element, start: "top 90%", once: true, onEnter: () => { reveal.play(); } });
    }, element);
    return () => media.revert();
  }, [enabled, ready, delay]);

  return <div ref={ref} className={className} data-reveal>{children}</div>;
}
