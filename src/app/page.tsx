"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/components/SmoothScroll";
import { useMagic } from "@/components/experience";
import { isHomeIntroCompleted, setHomeIntroCompleted } from "@/lib/intro-state";
import { Hero } from "@/components/hero";
import { Timeline } from "@/components/timeline";
import {
  WizardingCampus,
  WizardingInvitation,
  WizardingJourney,
  WizardingManifesto,
  WizardingSponsors,
} from "@/components/wizarding-home";

const FRAME_COUNT = 234;
const INTRO_START_FRAME = 0;
const INTRO_END_FRAME = 50; // First 50 frames (0 to 50)
const SCROLL_START_FRAME = 50;
const INTRO_FPS = 30; // 30 FPS cleanly syncs with 60Hz/120Hz displays, eliminating judder
const INTRO_DURATION_MS = ((INTRO_END_FRAME - INTRO_START_FRAME) / INTRO_FPS) * 1000; // ~1666ms

const clampIndex = (i: number): number => {
  if (isNaN(i)) return 0;
  return Math.max(0, Math.min(FRAME_COUNT - 1, Math.floor(i)));
};

function currentFrame(index: number): string {
  const safeIndex = clampIndex(index);
  const padded = String(safeIndex + 1).padStart(4, "0");
  return `/images/frames/${padded}.jpg`;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(FRAME_COUNT).fill(null));
  const frameRef = useRef<number>(isHomeIntroCompleted() ? SCROLL_START_FRAME : INTRO_START_FRAME);
  const lastDrawnFrameRef = useRef<number>(-1);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(() => isHomeIntroCompleted());
  const { setReady } = useMagic();

  // Resize canvas according to device pixel ratio for sharp rendering without overwhelming GPU.
  // Smoothly accommodates mobile viewport changes while ignoring minor URL address-bar fluctuations.
  const setCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    const targetWidth = Math.round(window.innerWidth * pixelRatio);
    const targetHeight = Math.round(window.innerHeight * pixelRatio);

    const widthChanged = Math.abs(canvas.width - targetWidth) > 4;
    const heightChanged = Math.abs(canvas.height - targetHeight) > 100;

    if (canvas.width === 0 || widthChanged || heightChanged) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      lastDrawnFrameRef.current = -1; // Force redraw on meaningful resize
    }
  }, []);

  // Preload and decode a single frame off-thread so drawImage doesn't hitch
  const preloadImage = useCallback((index: number): Promise<HTMLImageElement> => {
    const safeIndex = clampIndex(index);
    const existing = imagesRef.current[safeIndex];
    if (existing && existing.complete && existing.naturalWidth > 0) {
      return Promise.resolve(existing);
    }
    const img = existing || new Image();
    if (!existing) {
      img.decoding = "async";
      img.src = currentFrame(safeIndex);
      imagesRef.current[safeIndex] = img;
    }
    return img
      .decode()
      .then(() => img)
      .catch(() => img);
  }, []);

  // Render the given frame using aspect-ratio cover math and sub-frame cross-dissolve interpolation for 60fps/120fps motion
  const render = useCallback(
    (targetFrame?: number, force = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx) return;

      const rawFrame = targetFrame !== undefined ? targetFrame : frameRef.current;
      const safeFrame = isNaN(rawFrame)
        ? 0
        : Math.max(0, Math.min(FRAME_COUNT - 1, rawFrame));

      if (!force && Math.abs(safeFrame - lastDrawnFrameRef.current) < 0.005) {
        return; // Skip if virtually no visual change
      }

      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      if (canvasWidth === 0 || canvasHeight === 0) return;

      const baseIndex = Math.floor(safeFrame);
      const nextIndex = Math.min(FRAME_COUNT - 1, baseIndex + 1);
      const fraction = safeFrame - baseIndex;

      // Base image
      let baseImg = imagesRef.current[baseIndex];
      if (!baseImg || !baseImg.complete || baseImg.naturalWidth === 0) {
        preloadImage(baseIndex).catch(() => {});
        for (let offset = 1; offset < FRAME_COUNT; offset++) {
          const lower = baseIndex - offset;
          if (lower >= 0 && imagesRef.current[lower]?.complete && imagesRef.current[lower]!.naturalWidth > 0) {
            baseImg = imagesRef.current[lower];
            break;
          }
          const higher = baseIndex + offset;
          if (higher < FRAME_COUNT && imagesRef.current[higher]?.complete && imagesRef.current[higher]!.naturalWidth > 0) {
            baseImg = imagesRef.current[higher];
            break;
          }
        }
      }

      if (baseImg && baseImg.complete && baseImg.naturalWidth > 0) {
        const imageAspect = baseImg.naturalWidth / baseImg.naturalHeight;
        const canvasAspect = canvasWidth / canvasHeight;
        let drawWidth: number;
        let drawHeight: number;
        let drawX: number;
        let drawY: number;

        // Minimum width of the video that must be visible (at least 55% visible width on mobile)
        const MIN_VISIBLE_WIDTH_FRACTION = 0.55;

        // In standard cover mode, what fraction of the video's width would be visible?
        const standardCoverWidth = canvasHeight * imageAspect;
        const visibleWidthFraction = canvasWidth / standardCoverWidth;

        if (visibleWidthFraction < MIN_VISIBLE_WIDTH_FRACTION) {
          // Mobile Portrait View: Ensure more than half (>55%) of the video width is visible
          drawWidth = Math.round(canvasWidth / MIN_VISIBLE_WIDTH_FRACTION);
          drawHeight = Math.round(drawWidth / imageAspect);
          drawX = Math.round((canvasWidth - drawWidth) / 2);
          drawY = Math.round((canvasHeight - drawHeight) * 0.45);
        } else {
          // Desktop / Tablet Landscape View: standard cover mode
          if (imageAspect > canvasAspect) {
            drawHeight = canvasHeight;
            drawWidth = drawHeight * imageAspect;
            drawX = (canvasWidth - drawWidth) / 2;
            drawY = 0;
          } else {
            drawWidth = canvasWidth;
            drawHeight = drawWidth / imageAspect;
            drawX = 0;
            drawY = (canvasHeight - drawHeight) / 2;
          }
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";

        // Draw base image fully opaque
        ctx.globalAlpha = 1.0;
        ctx.drawImage(baseImg, drawX, drawY, drawWidth, drawHeight);

        // Sub-frame cross-dissolve: seamlessly blend next frame for silky 60fps/120fps continuity
        if (fraction > 0.02 && nextIndex !== baseIndex) {
          const nextImg = imagesRef.current[nextIndex];
          if (nextImg && nextImg.complete && nextImg.naturalWidth > 0) {
            ctx.globalAlpha = fraction;
            ctx.drawImage(nextImg, drawX, drawY, drawWidth, drawHeight);
            ctx.globalAlpha = 1.0;
          } else {
            preloadImage(nextIndex).catch(() => {});
          }
        }

        // On mobile view where drawY > 0, feather the top and bottom into the background
        if (drawY > 0 || drawY + drawHeight < canvasHeight) {
          const featherHeight = Math.min(80, Math.round(drawHeight * 0.2));

          // Soft top feather into obsidian void
          const topFeather = ctx.createLinearGradient(0, drawY, 0, drawY + featherHeight);
          topFeather.addColorStop(0, "rgba(5, 5, 8, 1)");
          topFeather.addColorStop(1, "rgba(5, 5, 8, 0)");
          ctx.fillStyle = topFeather;
          ctx.fillRect(0, drawY, canvasWidth, featherHeight);

          // Soft bottom feather into obsidian void
          const bottomFeather = ctx.createLinearGradient(
            0,
            drawY + drawHeight - featherHeight,
            0,
            drawY + drawHeight
          );
          bottomFeather.addColorStop(0, "rgba(5, 5, 8, 0)");
          bottomFeather.addColorStop(1, "rgba(5, 5, 8, 1)");
          ctx.fillStyle = bottomFeather;
          ctx.fillRect(0, drawY + drawHeight - featherHeight, canvasWidth, featherHeight);

          // Solid background fill for any empty area above image
          if (drawY > 0) {
            ctx.fillStyle = "rgba(5, 5, 8, 1)";
            ctx.fillRect(0, 0, canvasWidth, drawY);
          }

          // Solid background fill for any empty area below image
          if (drawY + drawHeight < canvasHeight) {
            ctx.fillStyle = "rgba(5, 5, 8, 1)";
            ctx.fillRect(0, drawY + drawHeight, canvasWidth, canvasHeight - (drawY + drawHeight));
          }
        }

        lastDrawnFrameRef.current = safeFrame;
      }
    },
    [preloadImage]
  );

  useEffect(() => {
    let isMounted = true;
    let introRafId = 0;
    let scrollTriggerInstance: ScrollTrigger | null = null;
    let preventScrollActive = false;

    setCanvasSize();

    // Prevent scrolling while intro video is playing
    const preventScroll = (e: Event) => {
      e.preventDefault();
    };

    // Pipelined background preloader for scroll frames (controlled concurrency so TCP sockets aren't starved)
    const preloadScrollFrames = () => {
      let nextIndex = SCROLL_START_FRAME;
      const CONCURRENCY = 6;
      let activeRequests = 0;

      const pump = () => {
        if (!isMounted || nextIndex >= FRAME_COUNT) return;
        while (activeRequests < CONCURRENCY && nextIndex < FRAME_COUNT) {
          const idx = nextIndex++;
          activeRequests++;
          preloadImage(idx).finally(() => {
            activeRequests--;
            pump();
          });
        }
      };
      pump();
    };

    // Setup GSAP tween + ScrollTrigger starting from frame 50 to 233 (total 234 frames)
    // Using a GSAP tween with scrub ensures updates fire on GSAP's 60fps ticker with smooth sub-frame interpolation
    const initScrollTrigger = () => {
      if (scrollTriggerInstance) return;

      const triggerEl = document.querySelector(".home-page") || document.body;
      const frameObj = { frame: SCROLL_START_FRAME };

      const tween = gsap.to(frameObj, {
        frame: FRAME_COUNT - 1,
        ease: "none",
        scrollTrigger: {
          trigger: triggerEl,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.35, // Responsive, buttery smooth catch-up on both mobile touch and desktop wheel
        },
        onUpdate: () => {
          if (!isMounted) return;
          frameRef.current = frameObj.frame;
          render(frameObj.frame);
        },
      });

      tweenRef.current = tween;
      scrollTriggerInstance = tween.scrollTrigger as ScrollTrigger;

      setTimeout(() => {
        ScrollTrigger.refresh();
      }, 150);
    };

    // Window resize handler
    const handleResize = () => {
      setCanvasSize();
      render(frameRef.current, true);
    };
    window.addEventListener("resize", handleResize);

    // =========================================================================
    // BRANCH 1: Returning via link tag / redirect (Intro already completed)
    // =========================================================================
    if (isHomeIntroCompleted()) {
      frameRef.current = SCROLL_START_FRAME;
      preloadImage(SCROLL_START_FRAME).then(() => {
        if (isMounted) render(SCROLL_START_FRAME, true);
      });

      queueMicrotask(() => {
        if (!isMounted) return;
        setIsLoaded(true);
        setReady(true);
      });
      initScrollTrigger();
      preloadScrollFrames();

      return () => {
        isMounted = false;
        window.removeEventListener("resize", handleResize);
        tweenRef.current?.kill();
        scrollTriggerInstance?.kill();
      };
    }

    // =========================================================================
    // BRANCH 2: Loaded for 1st time or refreshed at home page
    // =========================================================================
    preventScrollActive = true;
    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });

    const lenis = (window as unknown as { lenis?: { stop: () => void; start: () => void } }).lenis;
    lenis?.stop();

    // Called when frame 50 finishes: reveals all UI elements and sets up ScrollTrigger from frame 50
    const finishIntro = () => {
      if (!isMounted) return;

      if (preventScrollActive) {
        preventScrollActive = false;
        window.removeEventListener("wheel", preventScroll);
        window.removeEventListener("touchmove", preventScroll);
      }
      lenis?.start();

      setHomeIntroCompleted(true);

      frameRef.current = SCROLL_START_FRAME;
      render(SCROLL_START_FRAME, true);

      setIsLoaded(true);
      setReady(true);
      initScrollTrigger();
      preloadScrollFrames();
    };

    // Playback loop locked to display refresh rate via performance.now() with sub-frame cross-dissolve
    let introStarted = false;
    const startIntroPlayback = () => {
      if (introStarted || !isMounted) return;
      introStarted = true;

      frameRef.current = INTRO_START_FRAME;
      render(INTRO_START_FRAME, true);

      const startTime = performance.now();

      const tick = (now: number) => {
        if (!isMounted) return;
        const elapsed = Math.max(0, now - startTime);
        const progress = Math.min(elapsed / INTRO_DURATION_MS, 1);
        const floatFrame =
          INTRO_START_FRAME +
          progress * (INTRO_END_FRAME - INTRO_START_FRAME);

        frameRef.current = floatFrame;
        render(floatFrame);

        if (progress < 1) {
          introRafId = requestAnimationFrame(tick);
        } else {
          finishIntro();
        }
      };

      introRafId = requestAnimationFrame(tick);
    };

    // Preload the first 50 frames (0 to 50) and begin continuous video playback
    let loadedIntroCount = 0;
    const requiredIntroBuffer = 20; // 20 frames buffer before starting playback

    for (let i = INTRO_START_FRAME; i <= INTRO_END_FRAME; i++) {
      preloadImage(i)
        .then(() => {
          loadedIntroCount++;
          if (loadedIntroCount >= requiredIntroBuffer && !introStarted) {
            startIntroPlayback();
          }
        })
        .catch(() => {
          loadedIntroCount++;
          if (loadedIntroCount >= requiredIntroBuffer && !introStarted) {
            startIntroPlayback();
          }
        });
    }

    // Safety fallback: start playback within 400ms even on slower connections
    const fallbackTimer = setTimeout(() => {
      if (!introStarted && isMounted) {
        startIntroPlayback();
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(fallbackTimer);
      cancelAnimationFrame(introRafId);
      if (preventScrollActive) {
        window.removeEventListener("wheel", preventScroll);
        window.removeEventListener("touchmove", preventScroll);
      }
      window.removeEventListener("resize", handleResize);
      lenis?.start();
      tweenRef.current?.kill();
      scrollTriggerInstance?.kill();
    };
  }, [preloadImage, render, setCanvasSize, setReady]);

  return (
    <div className="home-page home-atelier">
      {/* Pinned background canvas layer directly on home page */}
      <div
        className="home-canvas-layer fixed inset-0 z-0 pointer-events-none overflow-hidden"
        data-ready={isLoaded}
        aria-hidden="true"
      >
        <canvas
          ref={canvasRef}
          className="wizarding-canvas block h-full w-full object-cover"
        />
        {/* Subtle cinematic gradient vignette for phone & desktop text readability */}
        <div
          className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/55 via-transparent to-black/65"
          aria-hidden="true"
        />
      </div>

      <Hero />
      <WizardingJourney />
      <Timeline />
      <WizardingManifesto />
      <WizardingCampus />
      <WizardingSponsors />
      <WizardingInvitation />
    </div>
  );
}
