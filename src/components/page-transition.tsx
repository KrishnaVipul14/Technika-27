"use client";

/**
 * Page transition: the Chamber of Secrets door.
 *
 *  1. You click an internal link. The door seals over the page            (~0.6s)
 *  2. The route changes while the door is shut
 *  3. The door unlocks and the new page is revealed through it             (~0.75s)
 *
 *  Total is about 1.4s. Tune SPEED / MIN_HOLD below. Back/forward buttons and
 *  router.push() calls get the same door, just without the closing half.
 *
 *  Links that skip the transition: external, new-tab, downloads, #hash-only,
 *  same-URL, modifier-key clicks, and anything with data-no-transition.
 *
 *  Replaces your old page-transition.tsx. Needs chamber-door.tsx next to it.
 *  The old .route-spell-veil CSS is no longer used and can be deleted.
 */

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useMagic } from "./experience";
import { ChamberDoor, type ChamberDoorHandle } from "./ChamberDoor";

/** 1 = default (~1.4s). 1.25 = quicker, 0.8 = slower. */
const SPEED = 1;
/** Seconds the door stays shut before opening (avoids a flash when the next page is instant). */
const MIN_HOLD = 0.15;
/** If the URL never changes (redirect, error), open the door again after this many seconds. */
const GIVE_UP = 4;

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Phase = "idle" | "closing" | "waiting" | "opening";

function BrickTransition({ phase }: { phase: "closing" | "opening" }) {
  return (
    <div className="brick-transition" data-phase={phase} aria-hidden="true">
      {Array.from({ length: 35 }, (_, index) => (
        <span
          className="brick-transition__brick"
          key={index}
          style={{ "--brick-index": index } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isRoom = pathname === "/account";
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);
  const door = useRef<ChamberDoorHandle>(null);
  const previous = useRef(pathname);
  const phase = useRef<Phase>("idle");
  const closedAt = useRef(0);
  const giveUp = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [brickPhase, setBrickPhase] = useState<"idle" | "closing" | "opening">("idle");
  const { enabled, ready } = useMagic();

  const clearGiveUp = () => {
    if (giveUp.current) clearTimeout(giveUp.current);
    giveUp.current = null;
  };

  /** Door unlocks, new page rises into view. */
  const reveal = useCallback(async () => {
    phase.current = "opening";
    setBrickPhase("opening");
    const wait = MIN_HOLD * 1000 - (performance.now() - closedAt.current);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    if (pageRef.current) {
      gsap.fromTo(
        pageRef.current,
        { opacity: 0, y: 18 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8 / SPEED,
          delay: 0.2 / SPEED,
          ease: "power3.out",
          clearProps: "opacity,transform",
        },
      );
    }
    await door.current?.open();
    setBrickPhase("idle");
    phase.current = "idle";
    ScrollTrigger.refresh();
  }, []);

  /** Close the door, then navigate. */
  const go = useCallback(
    async (href: string) => {
      if (!door.current) {
        router.push(href);
        return;
      }
      phase.current = "closing";
      setBrickPhase("closing");
      await door.current.close();
      phase.current = "waiting";
      closedAt.current = performance.now();
      router.push(href);
      clearGiveUp();
      giveUp.current = setTimeout(() => {
        if (phase.current === "waiting") void reveal();
      }, GIVE_UP * 1000);
    },
    [router, reveal],
  );

  /* Intercept clicks on internal links (capture phase, before Next's own handler). */
  useEffect(() => {
    if (!enabled || !ready || isRoom) return;
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
      const a = (e.target as Element | null)?.closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (!a) return;
      if (
        (a.target && a.target !== "_self") ||
        a.hasAttribute("download") ||
        a.hasAttribute("data-no-transition")
      )
        return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === "/account") return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      )
        return; // hash / same page
      e.preventDefault(); // Next's <Link> sees defaultPrevented and stays out of the way
      if (phase.current !== "idle") return;
      void go(url.pathname + url.search + url.hash);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [enabled, ready, go, isRoom]);

  /* The route changed. */
  useIsoLayoutEffect(() => {
    const changed = previous.current !== pathname;
    const fromRoom = previous.current === "/account";
    previous.current = pathname;
    if (isRoom || fromRoom) {
      clearGiveUp();
      phase.current = "idle";
      if (pageRef.current) gsap.set(pageRef.current, { clearProps: "all" });
      return;
    }
    if (!ready || !enabled) return;

    if (!changed) {
      // first load: a soft fade-in, no door
      if (pageRef.current) {
        gsap.fromTo(
          pageRef.current,
          { opacity: 0, filter: "blur(5px)" },
          {
            opacity: 1,
            filter: "blur(0px)",
            duration: 1,
            ease: "power3.out",
            clearProps: "opacity,filter",
          },
        );
      }
      return;
    }

    clearGiveUp();
    if (phase.current === "idle") {
      // back/forward or router.push: hide the swap instantly, then open
      setBrickPhase("closing");
      door.current?.cover();
      closedAt.current = performance.now();
    }
    void reveal();
  }, [pathname, enabled, ready, reveal, isRoom]);

  useEffect(() => clearGiveUp, []);

  if (isRoom) return <>{children}</>;
  return (
    <>
      {brickPhase !== "idle" && <BrickTransition phase={brickPhase} />}
      <ChamberDoor ref={door} speed={SPEED} />
      <div ref={pageRef} className="page-transition">
        {children}
      </div>
    </>
  );
}
