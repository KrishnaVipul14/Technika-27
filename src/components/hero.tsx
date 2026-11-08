"use client";

/**
 * Hero, styled with Tailwind + the theme tokens from houseThemes.css.
 * The GSAP animation code is unchanged; only markup classes and colours moved to Tailwind.
 * Every colour below is a token (bg-bg, text-fg-brand, primary-300, var(--primary-400) ...),
 * so the whole hero recolours with the active theme.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  MapPin,
  Sparkles,
  ArrowUpRight,
  BookOpen,
} from "lucide-react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { AmbientParticles, SnitchArtwork } from "./ornaments";
import { useMagic } from "./experience";
import { HouseBanners } from "./house-banners";
import Link from "next/link";

/** Timestamp in base.mp4 where the castle and moon are fully revealed after the flythrough */
const CASTLE_SCENE_TIME = 3.75;

/* Gradients that need CSS functions Tailwind can't express in a class. */
const FX = {
  shade:
    "linear-gradient(to bottom, color-mix(in oklab, var(--bg-sunken) 78%, transparent), transparent 38%, color-mix(in oklab, var(--bg) 94%, transparent) 100%), radial-gradient(120% 90% at 50% 42%, transparent 45%, color-mix(in oklab, var(--bg-sunken) 85%, transparent) 100%)",
  moon: "radial-gradient(circle, color-mix(in oklab, var(--fg-strong) 18%, transparent) 0%, color-mix(in oklab, var(--secondary-300) 12%, transparent) 38%, transparent 68%)",
  windows:
    "radial-gradient(45% 40% at 50% 78%, color-mix(in oklab, var(--primary-300) 24%, transparent), transparent 70%), radial-gradient(25% 25% at 28% 70%, color-mix(in oklab, var(--primary-400) 16%, transparent), transparent 70%), radial-gradient(25% 25% at 74% 66%, color-mix(in oklab, var(--primary-400) 14%, transparent), transparent 70%)",
  mist: "radial-gradient(60% 70% at 25% 100%, color-mix(in oklab, var(--secondary-300) 14%, transparent), transparent 70%), radial-gradient(55% 70% at 80% 100%, color-mix(in oklab, var(--primary-300) 10%, transparent), transparent 70%), linear-gradient(to top, var(--bg) 8%, color-mix(in oklab, var(--bg) 55%, transparent) 45%, transparent)",
  halo: "radial-gradient(circle, rgba(255, 218, 128, 0.6), transparent 66%)",
};

/* Keyframes (Tailwind classes reference them as animate-[hx-...]) + the snitch glow. */
const HERO_CSS = `
@keyframes hx-flicker{0%,100%{opacity:1;transform:scale(1)}20%{opacity:.82;transform:scale(.92,1.08)}45%{opacity:1;transform:scale(1.06,.96)}70%{opacity:.88;transform:scale(.96,1.05)}}
@keyframes hx-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes hx-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(5px)}}
@keyframes hx-pulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:.95;transform:scale(1.18)}}
.flying-snitch svg{position:relative;display:block;width:100%;height:100%;filter:drop-shadow(0 0 8px rgba(255, 201, 83, 0.78))}
`;

/* Buttons (same recipe as the navbar's Register button). */
const BTN =
  "group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.1em] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring";
const BTN_GOLD = `${BTN} bg-brand text-brand-on shadow-glow-brand hover:bg-brand-hover active:bg-brand-active`;
const BTN_GLASS = `${BTN} border border-line-strong bg-surface/40 text-fg shadow-inset backdrop-blur-xl backdrop-saturate-150 hover:border-brand/40 hover:bg-brand-soft`;

function GoldenSnitch() {
  const realmRef = useRef<HTMLDivElement>(null);
  const snitchRef = useRef<HTMLDivElement>(null);
  const { enabled, ready } = useMagic();

  useEffect(() => {
    const realm = realmRef.current;
    const snitch = snitchRef.current;
    if (!realm || !snitch) return;
    let flight: gsap.core.Timeline | undefined;
    let inView = true;
    const bank = { angle: 0 };
    const updatePlayback = () => {
      if (!flight) return;
      if (inView && !document.hidden && enabled && ready) flight.resume();
      else flight.pause();
    };
    const buildFlight = () => {
      const width = realm.clientWidth;
      const height = realm.clientHeight;
      const progress = flight?.progress() || 0;
      flight?.kill();
      // The first position is deliberately clear of the title, so the snitch is always visible on arrival.
      gsap.set(snitch, {
        x: width * 0.77,
        y: height * 0.25,
        opacity: 1,
        scale: 1,
        rotation: -12,
      });
      realm.style.zIndex = "8";
      realm.dataset.depth = "front";
      if (!enabled || !ready) return;
      flight = gsap.timeline({ repeat: -1, defaults: { ease: "none" } });
      flight.to(snitch, {
        duration: 14,
        motionPath: {
          path: [
            { x: width * 0.77, y: height * 0.25 },
            { x: width * 0.88, y: height * 0.4 },
            { x: width * 0.66, y: height * 0.64 },
            { x: width * 0.2, y: height * 0.56 },
            { x: width * 0.12, y: height * 0.3 },
            { x: width * 0.38, y: height * 0.35 },
            { x: width * 0.63, y: height * 0.36 },
            { x: width * 0.83, y: height * 0.18 },
            { x: width * 0.77, y: height * 0.25 },
          ],
          curviness: 1.45,
        },
        onUpdate: () => {
          if (!flight) return;
          const phase = flight.progress();
          const behind = phase > 0.49 && phase < 0.79;
          realm.style.zIndex = behind ? "4" : "8";
          realm.dataset.depth = behind ? "behind" : "front";
          // Only the opaque glyphs occlude the snitch; the gaps between letters remain transparent.
          bank.angle = Math.sin(phase * Math.PI * 6) * 22;
          gsap.set(snitch, { rotation: bank.angle, scale: behind ? 0.9 : 1 });
        },
      });
      flight.progress(progress);
      updatePlayback();
    };
    const resize = new ResizeObserver(buildFlight);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      updatePlayback();
    });
    resize.observe(realm);
    observer.observe(realm);
    document.addEventListener("visibilitychange", updatePlayback);
    buildFlight();
    return () => {
      flight?.kill();
      resize.disconnect();
      observer.disconnect();
      document.removeEventListener("visibilitychange", updatePlayback);
    };
  }, [enabled, ready]);

  return (
    <div
      ref={realmRef}
      className="snitch-realm pointer-events-none absolute inset-0 z-[8]"
      data-depth="front"
      aria-hidden="true"
    >
      <div
        className="flying-snitch absolute left-0 top-0 h-12 w-[4.5rem] will-change-transform sm:h-16 sm:w-24"
        ref={snitchRef}
      >
        <span
          className="snitch-halo absolute -inset-[45%] animate-[hx-pulse_2.6s_ease-in-out_infinite] rounded-full motion-reduce:animate-none"
          style={{ backgroundImage: FX.halo }}
        />
        <SnitchArtwork />
        <span
          className="snitch-trail absolute right-full top-1/2 h-px w-20"
          style={{
            background:
              "linear-gradient(to left, rgba(255, 216, 128, 0.7), transparent)",
          }}
        />
      </div>
    </div>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const introDoneRef = useRef(false);
  const entered = useRef(false);
  const [loadVideo, setLoadVideo] = useState(false);
  const { enabled, ready, setReady } = useMagic();

  const finishIntro = useCallback(() => {
    if (introDoneRef.current) return;
    introDoneRef.current = true;
    const video = videoRef.current;
    if (video) {
      video.pause();
      try {
        video.currentTime = CASTLE_SCENE_TIME;
      } catch {
        // ignore seeking errors
      }
    }
    setReady(true);
  }, [setReady]);

  // Video intro controller: autoplays base.mp4 from 0s and halts at castle scene (3.75s)
  useEffect(() => {
    if (ready) {
      introDoneRef.current = true;
      const video = videoRef.current;
      if (video) {
        video.pause();
        try {
          video.currentTime = CASTLE_SCENE_TIME;
        } catch {
          // ignore
        }
      }
      return;
    }

    // If page is already scrolled on load, skip intro directly
    if (typeof window !== "undefined" && window.scrollY > 30) {
      finishIntro();
      return;
    }

    const video = videoRef.current;
    if (!video || !loadVideo) return;

    video.currentTime = 0;
    video.play().catch(() => {
      // Autoplay with muted is usually allowed, but if blocked, user interaction will resume
    });

    let rafId = 0;
    const trackTime = () => {
      if (introDoneRef.current) return;
      if (video.currentTime >= CASTLE_SCENE_TIME || video.ended) {
        finishIntro();
        return;
      }
      rafId = requestAnimationFrame(trackTime);
    };
    rafId = requestAnimationFrame(trackTime);

    const onTimeUpdate = () => {
      if (introDoneRef.current) return;
      if (video.currentTime >= CASTLE_SCENE_TIME || video.ended) {
        finishIntro();
      }
    };

    const onEnded = () => {
      finishIntro();
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);

    // Skip intro on user scroll
    const onSkipScroll = () => {
      finishIntro();
    };

    window.addEventListener("wheel", onSkipScroll, { passive: true, once: true });
    window.addEventListener("touchmove", onSkipScroll, { passive: true, once: true });

    // Safety fallback: if video stalls or takes too long, reveal elements
    const fallbackTimer = window.setTimeout(finishIntro, 4500);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(fallbackTimer);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
      window.removeEventListener("wheel", onSkipScroll);
      window.removeEventListener("touchmove", onSkipScroll);
    };
  }, [ready, finishIntro, loadVideo]);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (reduced || connection?.saveData) {
      finishIntro();
      return;
    }
    const start = () => setLoadVideo(true);
    const timer = window.setTimeout(start, 350);
    return () => window.clearTimeout(timer);
  }, [finishIntro]);

  // GSAP scroll trigger & entrance animations once castle scene is reached
  useEffect(() => {
    const hero = ref.current;
    if (!hero || !ready) return;
    const ctx = gsap.context(() => {
      if (!enabled) {
        gsap.set(
          ".hero-presents, .hero-edition, .title-letter, .hero-subtitle, .hero-details, .hero-bottom",
          { opacity: 1, clearProps: "transform,filter" },
        );
        return;
      }
      if (!entered.current) {
        const intro = gsap.timeline({ defaults: { ease: "power3.out" } });
        intro
          .fromTo(
            ".hero-presents, .hero-edition",
            { opacity: 0, y: 22 },
            { opacity: 1, y: 0, duration: 1, stagger: 0.15 },
            0.15,
          )
          .fromTo(
            ".title-letter",
            { opacity: 0, yPercent: 110, rotationX: -70, filter: "blur(12px)" },
            {
              opacity: 1,
              yPercent: 0,
              rotationX: 0,
              filter: "blur(0px)",
              duration: 1.25,
              stagger: 0.065,
              clearProps: "transform,filter",
            },
            0.28,
          )
          .fromTo(
            ".hero-subtitle",
            { opacity: 0, y: 25 },
            { opacity: 1, y: 0, duration: 1 },
            0.8,
          )
          .fromTo(
            ".hero-details",
            { opacity: 0, y: 30 },
            { opacity: 1, y: 0, duration: 1 },
            1.05,
          )
          .fromTo(
            ".hero-bottom",
            { opacity: 0, y: 15 },
            { opacity: 1, y: 0, duration: 0.8 },
            1.3,
          );
        entered.current = true;
      }

      const scroll = {
        trigger: hero,
        start: "top top",
        end: "bottom top",
        scrub: 0.7,
        invalidateOnRefresh: true,
      };

      // Video timeline scrub: starts at CASTLE_SCENE_TIME (3.75s),
      // scrubs backwards towards 0.05s as user scrolls down, and back to 3.75s on scroll up
      const videoPlayhead = { time: CASTLE_SCENE_TIME };
      gsap.to(videoPlayhead, {
        time: 0.05,
        ease: "none",
        scrollTrigger: scroll,
        onUpdate: () => {
          const video = videoRef.current;
          if (video && !isNaN(video.duration) && video.readyState >= 2) {
            try {
              video.currentTime = videoPlayhead.time;
            } catch {
              // ignore
            }
          }
        },
      });

      gsap.to(".hero-castle", {
        y: () => hero.clientHeight * 0.22,
        ease: "none",
        scrollTrigger: scroll,
      });
      gsap.to(".hero-moon-aura", {
        y: () => hero.clientHeight * 0.16,
        ease: "none",
        scrollTrigger: scroll,
      });
      gsap.to(".hero-mist", {
        y: -160,
        xPercent: 8,
        ease: "none",
        scrollTrigger: scroll,
      });
      gsap.to(".floating-candles", {
        y: -100,
        ease: "none",
        scrollTrigger: scroll,
      });
      gsap.to(".hero-content", {
        y: -75,
        opacity: 0.12,
        ease: "none",
        scrollTrigger: { ...scroll, end: "bottom 15%" },
      });
      ScrollTrigger.refresh();
    }, hero);
    return () => ctx.revert();
  }, [enabled, ready]);

  return (
    <section
      ref={ref}
      className="hero relative isolate min-h-[100svh] overflow-hidden bg-bg text-fg select-none"
      aria-labelledby="hero-title"
    >
      <style dangerouslySetInnerHTML={{ __html: HERO_CSS }} />

      {/* Video Background with GSAP Scroll scrubbing */}
      <video
        ref={videoRef}
        src={loadVideo ? "/videos/base.mp4" : undefined}
        poster="/images/hogwarts.webp"
        className="hero-castle absolute inset-0 h-full w-full object-cover object-center scale-[1.06] will-change-transform pointer-events-none"
        playsInline
        muted
        autoPlay={loadVideo}
        preload="metadata"
        disablePictureInPicture
        disableRemotePlayback
        aria-hidden="true"
      />

      {/* Atmosphere overlays (smoothly illuminate when castle scene is reached) */}
      <div
        className="hero-shade pointer-events-none absolute inset-0 z-[1]"
        style={{ backgroundImage: FX.shade }}
      />
      <div
        className={`hero-moon-aura pointer-events-none absolute inset-x-0 -top-[14%] z-[1] mx-auto aspect-square w-[min(92vw,85vh)] rounded-full transition-opacity duration-1000 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
        style={{ backgroundImage: FX.moon }}
        aria-hidden="true"
      />
      <div
        className={`castle-house-light pointer-events-none absolute inset-0 z-[2] mix-blend-screen transition-opacity duration-1000 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
        style={{ backgroundImage: FX.windows }}
        aria-hidden="true"
      />

      <div
        className={`transition-opacity duration-1000 ${
          ready ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <HouseBanners />
      </div>
      <AmbientParticles count={46} />

      <div
        className={`floating-candles pointer-events-none absolute inset-0 z-[3] transition-opacity duration-1000 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden="true"
      >
        {[9, 18, 29, 72, 83, 93].map((left, i) => (
          <i
            key={left}
            className="absolute block h-9 w-2 animate-[hx-float_6s_ease-in-out_infinite] motion-reduce:animate-none"
            style={{
              left: `${left}%`,
              top: `${23 + ((i * 13) % 38)}%`,
              animationDelay: `${i * -0.8}s`,
            }}
          >
            {/* flame */}
            <span className="absolute -top-3.5 inset-x-0 mx-auto block h-3.5 w-2 animate-[hx-flicker_2.4s_ease-in-out_infinite] rounded-[50%_50%_50%_50%/60%_60%_40%_40%] bg-gradient-to-t from-primary-500 to-primary-100 shadow-[0_0_16px_6px_color-mix(in_oklab,var(--primary-400)_50%,transparent)] motion-reduce:animate-none" />
            {/* candle */}
            <span className="block h-full w-full rounded-[2px] bg-gradient-to-b from-fg-strong/90 to-secondary-200/50" />
          </i>
        ))}
      </div>

      <div
        className={`transition-opacity duration-700 ${
          ready ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <GoldenSnitch />
      </div>

      {/* Hero Typography & Content (Reveals after video hits castle scene) */}
      <div
        className={`hero-tilt-layer relative z-[6] flex min-h-[100svh] items-center justify-center px-4 pb-24 pt-28 sm:pt-32 transition-opacity duration-700 ${
          ready ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="hero-content mx-auto flex w-full max-w-5xl flex-col items-center text-center">
          <div className="hero-presents flex items-center justify-center gap-4 text-[10px] uppercase tracking-[0.3em] text-fg-muted sm:text-xs sm:tracking-[0.35em]">
            <span className="h-px w-8 bg-gradient-to-r from-transparent to-primary-400/70 sm:w-16" />
            BIRLA INSTITUTE OF TECHNOLOGY · PATNA
            <span className="h-px w-8 bg-gradient-to-l from-transparent to-primary-400/70 sm:w-16" />
          </div>

          <div className="hero-heading mt-6 flex flex-col items-center">
            <span className="hero-edition inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-soft px-4 py-1.5 text-[10px] font-medium uppercase tracking-[0.25em] text-fg-brand backdrop-blur-md sm:text-[11px]">
              <Sparkles size={12} /> TECHNIKA 2K26 · THE MAKERS&apos; CHAPTER{" "}
              <Sparkles size={12} />
            </span>
            <h1
              id="hero-title"
              aria-label="Technika 2K26"
              className="mt-6 font-serif text-[clamp(2.6rem,12vw,9.5rem)] font-semibold leading-[0.95] tracking-[0.1em] drop-shadow-[0_0_28px_color-mix(in_oklab,var(--primary-500)_35%,transparent)]"
            >
              <span
                aria-hidden="true"
                className="inline-block [perspective:900px]"
              >
                {"TECHNIKA".split("").map((letter, i) => (
                  <span
                    className="title-letter inline-block bg-gradient-to-b from-fg-strong via-primary-300 to-primary-500 bg-clip-text text-transparent"
                    key={i}
                  >
                    {letter}
                  </span>
                ))}
              </span>
            </h1>
            <p className="hero-subtitle mt-4 font-serif text-lg italic tracking-wide text-fg-muted sm:text-xl">
              The annual techno-cultural festival
            </p>
          </div>

          <div className="hero-details mt-10 flex flex-col items-center gap-5">
            <div className="hero-date flex items-center gap-4">
              <span className="h-px w-10 bg-gradient-to-r from-transparent to-primary-400/70 sm:w-20" />
              <p className="font-serif text-xl tracking-[0.16em] text-fg-brand sm:text-3xl">
                16 <i className="px-1 not-italic text-fg-subtle">—</i> 18
                JANUARY, 2026
              </p>
              <span className="h-px w-10 bg-gradient-to-l from-transparent to-primary-400/70 sm:w-20" />
            </div>
            <p className="hero-description max-w-xl text-sm leading-relaxed text-fg-muted sm:text-base">
              Innovation, creativity, and hands-on engineering excellence.
              <br />A celebration of the minds shaping tomorrow.
            </p>
            <div className="hero-actions mt-1 flex flex-wrap items-center justify-center gap-3">
              <Link href="/registrations" className={BTN_GOLD}>
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-fg/40 via-transparent to-transparent"
                />
                <span className="relative">Register now</span>
                <ArrowUpRight
                  size={17}
                  className="relative transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </Link>
              <a href="#about" className={BTN_GLASS}>
                Explore the events <BookOpen size={16} />
              </a>
            </div>
            <span className="hero-place inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.3em] text-fg-subtle">
              <MapPin size={12} />
              BIT PATNA · INDIA
            </span>
          </div>
        </div>
      </div>

      <div
        className="hero-mist pointer-events-none absolute -inset-x-[10%] bottom-0 z-[5] h-[48%]"
        style={{ backgroundImage: FX.mist }}
        aria-hidden="true"
      />

      <div
        className={`hero-bottom absolute inset-x-0 bottom-0 z-[7] grid grid-cols-3 items-end px-5 pb-6 text-[10px] uppercase tracking-[0.3em] text-fg-subtle sm:px-10 transition-opacity duration-700 ${
          ready ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="hero-volume max-sm:invisible">
          VOL. XVI <i className="px-1 not-italic text-fg-brand">✦</i> A NEW
          CHAPTER
        </span>
        <a
          href="#timeline"
          className="scroll-cue flex flex-col items-center gap-2 text-fg-muted transition-colors hover:text-fg-brand"
        >
          <span>Unfold the magic</span>
          <ArrowDown
            size={15}
            className="animate-[hx-bob_2s_ease-in-out_infinite] motion-reduce:animate-none"
          />
        </a>
        <span className="hero-side-note text-right max-sm:invisible">
          BUILD WHAT COMES NEXT.
        </span>
      </div>

      {/* Skip button during intro video flythrough */}
      {!ready && (
        <button
          type="button"
          onClick={finishIntro}
          className="group absolute bottom-6 right-6 z-30 inline-flex items-center gap-2 rounded-full border border-primary-400/30 bg-bg-sunken/70 px-4 py-2 text-[10px] uppercase tracking-[0.25em] text-fg-muted backdrop-blur-md transition-all hover:border-primary-400 hover:text-fg-brand active:scale-95 cursor-pointer shadow-lg"
          aria-label="Skip to castle scene"
        >
          <span>Skip Intro</span>
          <ArrowUpRight
            size={13}
            className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          />
        </button>
      )}
    </section>
  );
}
