"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

const START_FRAME = 93; // Start from 93th frame as requested
const TOTAL_FRAMES = 300;

function getFrameUrl(index: number): string {
  const clamped = Math.max(1, Math.min(TOTAL_FRAMES, Math.round(index)));
  const padded = String(clamped).padStart(3, "0");
  return `/bg_zip/ezgif-frame-${padded}.jpg`;
}

export function HomeScrollCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesCache = useRef<Map<number, HTMLImageElement>>(new Map());
  const currentFrameRef = useRef(START_FRAME);

  // Helper to draw an image on canvas using "cover" aspect ratio
  const renderImage = (img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    if (!iw || !ih) return;

    const scale = Math.max(cw / iw, ch / ih);
    const sw = iw * scale;
    const sh = ih * scale;
    const sx = (cw - sw) / 2;
    const sy = (ch - sh) / 2;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, sx, sy, sw, sh);
  };

  // Helper to draw the target frame or the nearest loaded fallback
  const drawNearestAvailable = (targetFrame: number) => {
    const cache = framesCache.current;
    const direct = cache.get(targetFrame);
    if (direct && direct.complete && direct.naturalWidth > 0) {
      currentFrameRef.current = targetFrame;
      renderImage(direct);
      return;
    }

    // Search outwards for nearest available cached frame
    for (let offset = 1; offset <= 40; offset++) {
      const lower = targetFrame - offset;
      if (lower >= 1) {
        const imgLower = cache.get(lower);
        if (imgLower && imgLower.complete && imgLower.naturalWidth > 0) {
          renderImage(imgLower);
          return;
        }
      }
      const higher = targetFrame + offset;
      if (higher <= TOTAL_FRAMES) {
        const imgHigher = cache.get(higher);
        if (imgHigher && imgHigher.complete && imgHigher.naturalWidth > 0) {
          renderImage(imgHigher);
          return;
        }
      }
    }
  };

  // Canvas dimension updater with device pixel ratio
  const updateCanvasDimensions = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    drawNearestAvailable(currentFrameRef.current);
  };

  useEffect(() => {
    const cache = framesCache.current;

    const preloadFrame = (index: number): Promise<HTMLImageElement> => {
      return new Promise((resolve) => {
        if (cache.has(index)) {
          resolve(cache.get(index)!);
          return;
        }
        const img = new Image();
        img.src = getFrameUrl(index);
        img.onload = () => {
          cache.set(index, img);
          resolve(img);
        };
        img.onerror = () => {
          resolve(img);
        };
      });
    };

    // 1. Immediately preload the starting frame (93) and neighboring frames
    preloadFrame(START_FRAME).then((img) => {
      updateCanvasDimensions();
      renderImage(img);
    });

    for (let i = START_FRAME; i <= Math.min(START_FRAME + 35, TOTAL_FRAMES); i++) {
      preloadFrame(i);
    }

    // 2. Stream all other frames progressively in idle batches
    let batchIndex = START_FRAME + 36;
    const streamNextBatch = () => {
      if (batchIndex > TOTAL_FRAMES) return;
      const end = Math.min(batchIndex + 20, TOTAL_FRAMES);
      for (let i = batchIndex; i <= end; i++) {
        preloadFrame(i);
      }
      batchIndex = end + 1;
      if (batchIndex <= TOTAL_FRAMES) {
        setTimeout(streamNextBatch, 80);
      }
    };
    const streamTimer = setTimeout(streamNextBatch, 150);

    // Also preload frames 1..92 in background in case user needs reverse bounds
    let reverseIndex = START_FRAME - 1;
    const streamReverseBatch = () => {
      if (reverseIndex < 1) return;
      const start = Math.max(1, reverseIndex - 15);
      for (let i = reverseIndex; i >= start; i--) {
        preloadFrame(i);
      }
      reverseIndex = start - 1;
      if (reverseIndex >= 1) {
        setTimeout(streamReverseBatch, 100);
      }
    };
    setTimeout(streamReverseBatch, 300);

    window.addEventListener("resize", updateCanvasDimensions);

    // 3. GSAP ScrollTrigger bound to the whole landing page (.home-page)
    // Starts at 93th frame and ends a little before the bottom of the page (bottom 82%)
    const triggerEl = document.querySelector(".home-page") || document.body;

    const st = ScrollTrigger.create({
      trigger: triggerEl,
      start: "top top",
      end: "bottom 82%", // Video reaches end frame a little before bottom of the page
      scrub: 1, // Smooth scrub
      onUpdate: (self) => {
        // Progress 0.0 -> Frame 93
        // Progress 1.0 -> Frame 300
        const targetFrame = Math.round(
          START_FRAME + (TOTAL_FRAMES - START_FRAME) * self.progress,
        );
        currentFrameRef.current = targetFrame;
        drawNearestAvailable(targetFrame);
      },
    });

    return () => {
      st.kill();
      clearTimeout(streamTimer);
      window.removeEventListener("resize", updateCanvasDimensions);
    };
  }, []);

  return (
    <div
      className="home-canvas-layer fixed inset-0 z-0 pointer-events-none overflow-hidden bg-neutral-950"
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="wizarding-canvas h-full w-full object-cover"
      />
      {/* Subtle atmospheric vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 95% 85% at 50% 45%, transparent 35%, rgba(3, 7, 18, 0.65) 100%), linear-gradient(180deg, rgba(2, 6, 23, 0.4) 0%, transparent 40%, rgba(2, 6, 23, 0.75) 100%)",
        }}
      />
    </div>
  );
}

