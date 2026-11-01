"use client";

import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { gsap } from "gsap";
import { houseThemes } from "@/lib/houses";
import type { ArrivalJourney } from "./registration-arrival";
import styles from "./registration-arrival.module.css";

const copy = ["Your journey at Technika'27 has officially begun.", "Your place in the magical world awaits you.", "Welcome to Technika'27."];

export default function AcceptanceLetter({ journey, reduced, onRevealed }: { journey: ArrivalJourney; reduced: boolean; onRevealed: (token: number) => void }) {
  const root = useRef<HTMLDivElement>(null);
  const { token, phase, participant } = journey;
  useLayoutEffect(() => {
    const node = root.current!;
    let timeline: gsap.core.Timeline | undefined;
    const context = gsap.context(() => {
      const select = gsap.utils.selector(node);
      const paper = select("[data-paper]"), envelope = select("[data-envelope]"), rig = select("[data-rig]");
      const folds = select("[data-fold]"), ink = select("[data-ink]"), veil = select("[data-veil]");
      const openLetter = () => {
        gsap.set(rig, { xPercent: -50, yPercent: -50, rotation: 0, rotationX: 0, rotationY: 0, scale: 1 });
        gsap.set(paper, { yPercent: -50, y: 0, zIndex: 5, scale: 1 });
        gsap.set(folds, { rotationX: 0 });
        gsap.set(ink, { opacity: 1 });
        gsap.set(select("[data-paper-text]"), { autoAlpha: 1 });
        gsap.set(envelope, { autoAlpha: 0 });
        gsap.set(veil, { opacity: 1 });
      };
      if (phase !== "letter" || reduced) {
        openLetter(); node.dataset.stage = "reading";
        if (phase !== "revealing" || reduced) {
          if (reduced && phase === "travelling") onRevealed(token);
          return;
        }
        node.dataset.stage = "dissolving";
        timeline = gsap.timeline({ onComplete: () => onRevealed(token) });
        timeline.to(paper, { scale: 3.8, rotation: -3, duration: 1.55, ease: "power2.inOut" }, 0)
          .to(select("[data-paper-text]"), { opacity: 0, duration: .45 }, .15)
          .to(node, { "--dissolve": "160%", duration: 1.45, ease: "power2.in" }, .25)
          .to(veil, { "--iris": "160%", duration: 1.6, ease: "power2.inOut" }, .25)
          .to(select("[data-mote]"), { x: (i: number) => Math.sin(i * 7.3) * 260, y: (i: number) => Math.cos(i * 4.1) * 220, scale: .1, opacity: 0, duration: 1.65 }, .1)
          .fromTo(select("[data-homecoming]"), { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: .8 }, 1.35)
          .to(select("[data-homecoming]"), { autoAlpha: 0, y: -8, duration: .6 }, 3.5);
        return;
      }
      node.dataset.stage = "arriving";
      gsap.set(rig, { xPercent: -50, yPercent: -50, y: 100, scale: .78, rotation: -8, rotationY: -16, rotationX: 8, autoAlpha: 0 });
      gsap.set(paper, { yPercent: -50, y: 0, zIndex: 1 });
      gsap.set(select('[data-fold="top"]'), { rotationX: -179.5 });
      gsap.set(select('[data-fold="bottom"]'), { rotationX: 179.5 });
      gsap.set(select("[data-paper-text]"), { autoAlpha: 0 });
      gsap.set(ink, { opacity: 0 });
      gsap.set(veil, { opacity: 0 });
      timeline = gsap.timeline({ onComplete: () => { node.dataset.stage = "reading"; } });
      timeline.to(veil, { opacity: 1, duration: .75 }, 0)
        .to(rig, { autoAlpha: 1, y: 0, scale: 1, rotation: -2, rotationY: -6, rotationX: 3, duration: 1.6, ease: "power3.out" }, .25)
        .call(() => { node.dataset.stage = "sealed"; }, [], 1.85)
        .to(rig, { y: -8, rotation: 1, duration: 1.1, ease: "sine.inOut" }, 1.85)
        .to(select("[data-seal]"), { rotation: 2, duration: .08, yoyo: true, repeat: 3 }, 2.85)
        .to(select('[data-seal="left"]'), { x: -42, y: 22, rotation: -24, opacity: 0, duration: .7, ease: "power2.in" }, 3.16)
        .to(select('[data-seal="right"]'), { x: 42, y: 15, rotation: 25, opacity: 0, duration: .7, ease: "power2.in" }, 3.16)
        .call(() => { node.dataset.stage = "opening"; }, [], 3.3)
        .to(select("[data-flap]"), { rotationX: -165, duration: 1, ease: "power2.inOut" }, 3.45)
        .to(paper, { y: -205, duration: 1.15, ease: "power2.inOut" }, 4.15)
        .set(paper, { zIndex: 5 }, 4.85)
        .to(envelope, { y: 140, rotationX: 32, opacity: 0, duration: .9 }, 5)
        .to(rig, { y: 0, rotation: 0, rotationX: 0, rotationY: 0, duration: 1.2 }, 5)
        .to(paper, { y: 0, scale: .97, duration: 1.2, ease: "power2.inOut" }, 5.1)
        .call(() => { node.dataset.stage = "unfolding"; }, [], 5.7)
        .to(folds, { rotationX: 0, duration: 1.2, stagger: .18, ease: "power2.inOut" }, 5.7)
        .set(select("[data-paper-text]"), { autoAlpha: 1 }, 7)
        .call(() => { node.dataset.stage = "ink"; }, [], 7)
        .to(ink, { opacity: 1, duration: .09, stagger: .014, ease: "none" }, 7)
        .to(paper, { scale: 1, duration: 3.3, ease: "sine.out" }, 7);
    }, node);
    const visibility = () => {
      node.dataset.paused = String(document.hidden);
      if (document.hidden) timeline?.pause(); else timeline?.resume();
    };
    visibility(); document.addEventListener("visibilitychange", visibility);
    return () => { document.removeEventListener("visibilitychange", visibility); context.revert(); };
  }, [token, phase, reduced, onRevealed]);

  const lines = [`Dear ${participant.displayName},`, ...copy];
  return <div ref={root} className={styles.art} data-testid="acceptance-art" data-stage="arriving" data-reduced={reduced}>
    <div className={styles.veil} data-veil />
    <div className={styles.motes} aria-hidden="true">{Array.from({ length: 26 }, (_, i) => <i key={i} data-mote style={{ left: `${(i * 47 + 9) % 100}%`, top: `${(i * 29 + 7) % 100}%`, "--drift": `${(i % 2 ? 1 : -1) * (25 + i * 3)}px`, animationDelay: `${-i * .7}s`, animationDuration: `${13 + i % 7}s` } as CSSProperties} />)}</div>
    <div className={styles.rig} data-rig>
      <div className={styles.paper} data-paper data-testid="acceptance-paper">
        <div className={`${styles.sheetPiece} ${styles.paperCore}`} />
        <div className={`${styles.sheetPiece} ${styles.foldTop}`} data-fold="top" />
        <div className={`${styles.sheetPiece} ${styles.foldBottom}`} data-fold="bottom" />
        <article className={styles.paperText} data-paper-text tabIndex={0} aria-label="Your letter" data-lenis-prevent>
          <div className={styles.letterhead} aria-hidden="true"><span>✦</span><strong>TECHNIKA ’27</strong><small>BIT PATNA · AN INVITATION TO BELONG</small></div>
          <div aria-hidden="true">{lines.map((line, index) => <p key={index} className={index === 0 ? styles.salutation : index === 3 ? styles.signature : undefined}>{Array.from(line).map((character, i) => <span data-ink key={i}>{character}</span>)}</p>)}</div>
          <p className={styles.srOnly}>{lines.join(" ")}</p>
          <div className={styles.postscript} aria-hidden="true"><span /> YOUR PLACE IS IN {houseThemes[participant.house].name.toUpperCase()} <span /></div>
        </article>
      </div>
      <div className={styles.envelope} data-envelope aria-hidden="true">
        <div className={styles.envelopeBack} />
        <div className={styles.flap} data-flap />
        <div className={styles.pocket}><small>BY OWL POST · PERSONAL & CONFIDENTIAL</small><span>{participant.displayName}</span></div>
        {(["left", "right"] as const).map((side) => <div key={side} className={styles.seal} data-seal={side}><b>T</b><small>TECHNIKA ’27</small></div>)}
      </div>
    </div>
    <div className={styles.homecoming} data-homecoming aria-hidden="true"><span>THE CASTLE HAS BEEN EXPECTING YOU</span><h2>Welcome home,<br /><em>{participant.displayName}.</em></h2></div>
  </div>;
}
