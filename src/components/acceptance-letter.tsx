"use client";

import { Component, Fragment, lazy, Suspense, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { gsap } from "gsap";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, RotateCcw } from "lucide-react";
import type { ArrivalJourney } from "./registration-arrival";
import { ChamberDoor, type ChamberDoorHandle } from "./ChamberDoor";
import { buildLetterTimeline, computeLayout, PERSPECTIVE, type LetterFx } from "./acceptance-letter/letter-timeline";
import type { Tier } from "./acceptance-letter/letter-room";
import styles from "./acceptance-letter/letter.module.css";

const LetterRoom = lazy(() => import("./acceptance-letter/letter-room"));

const BODY = [
  "We are delighted to inform you that your journey into the extraordinary world of Technika’27 is about to begin.",
  "You have been invited to experience a gathering where technology meets imagination, innovation meets ambition, and extraordinary minds create the impossible.",
  "Your adventure awaits beyond these doors.",
];
const CLOSE = "Hogwarts awaits you.";
const SIGN_OFF = "Yours sincerely,";
// HarryP has no typographic apostrophe, so the displayed signature uses a straight one.
const SIGN = "The Technika'27 Organising Committee";

// ── external stores (no setState-in-effect, no hydration branches) ─────────
function subscribeViewport(callback: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onResize = () => { clearTimeout(timer); timer = setTimeout(callback, 160); };
  window.addEventListener("resize", onResize);
  return () => { clearTimeout(timer); window.removeEventListener("resize", onResize); };
}
const viewportSnapshot = () => `${window.innerWidth}x${window.innerHeight}`;
function subscribeFonts(callback: () => void) {
  if (!document.fonts) return () => {};
  document.fonts.addEventListener("loadingdone", callback);
  void document.fonts.ready.then(callback);
  return () => document.fonts.removeEventListener("loadingdone", callback);
}
const fontsSnapshot = () => !document.fonts || document.fonts.status === "loaded";

function graphemes(text: string) {
  return "Segmenter" in Intl ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment) : Array.from(text);
}
function tierFor(vw: number): Tier {
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 8 : 8;
  const level = (vw < 640 ? 2 : vw < 1024 ? 1 : 0) + (cores <= 4 ? 1 : 0);
  return (["desktop", "tablet", "mobile"] as const)[Math.min(2, level)];
}

/** If WebGL is unavailable or the room throws, the CSS room underneath carries the same story. */
class RoomBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onError(); }
  render() { return this.state.failed ? null : this.props.children; }
}

// ── pieces ──────────────────────────────────────────────────────────────────
function Letterhead({ foil }: { foil?: boolean }) {
  return (
    <header className={styles.letterhead}>
      <div className={styles.crestMark}>{foil && <i className={styles.crestFoil} data-crest />}</div>
      <strong>Technika&apos;27</strong>
      <span className={styles.institute}>Birla Institute of Technology · Patna</span>
      <span className={styles.rule}><i />Official Invitation<i /></span>
    </header>
  );
}

/** One face of a fold strip. `row` is the strip's offset in sheet heights of P, so paper grain and print line up. */
function Face({ row, back, print }: { row: number; back?: boolean; print?: boolean }) {
  return (
    <div className={`${styles.face} ${back ? styles.back : ""}`} style={{ "--row": row } as CSSProperties}>
      <div className={styles.print}><i className={styles.frame} />{print && <Letterhead />}</div>
      <i className={styles.shade} data-shade />
    </div>
  );
}

function Fold({ side }: { side: "top" | "bottom" }) {
  const [near, far] = side === "top" ? [0.5, 0] : [2, 2.5];
  return (
    <div className={styles.fold} data-fold={side}>
      <div className={styles.strip} data-strip="near"><Face row={near} print={side === "top"} /><Face row={near} back /></div>
      <div className={styles.strip} data-strip="far" data-curl={side}><Face row={far} print={side === "top"} /><Face row={far} back /></div>
    </div>
  );
}

function Seal({ half }: { half: "top" | "bottom" }) {
  return (
    <div className={styles.seal} data-seal={half}>
      <div className={styles.sealWax} />
      <div className={styles.sealCrest} />
      <i className={styles.sealSheen} data-seal-sheen />
      <svg className={styles.crack} data-crack viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <polyline points="0,52 14,47 27,55 41,46 55,54 68,47 82,55 100,49" />
      </svg>
    </div>
  );
}

// Quill geometry: shaft is a cubic from the nib (6,296) to the tip of the feather (92,6).
const bez = (t: number, a: number, b: number, c: number, d: number) => (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t ** 2 * c + t ** 3 * d;
const shaft = (t: number) => [bez(t, 6, 30, 60, 92), bez(t, 296, 230, 120, 6)] as const;
const QUILL = (() => {
  const left: string[] = [], right: string[] = [], barbs: string[] = [];
  for (let i = 0; i <= 28; i++) {
    const t = 0.3 + (i / 28) * 0.7, [x, y] = shaft(t), [x2, y2] = shaft(Math.min(1, t + 0.01));
    const len = Math.hypot(x2 - x, y2 - y) || 1, tx = (x2 - x) / len, ty = (y2 - y) / len, nx = -ty, ny = tx;
    const w = 22 * Math.sin((Math.PI * (t - 0.3)) / 0.72);
    left.push(`${(x + nx * w - tx * w * 0.35).toFixed(1)},${(y + ny * w - ty * w * 0.35).toFixed(1)}`);
    right.unshift(`${(x - nx * w * 0.8 - tx * w * 0.3).toFixed(1)},${(y - ny * w * 0.8 - ty * w * 0.3).toFixed(1)}`);
    if (i % 3 === 1) barbs.push(`M${x.toFixed(1)} ${y.toFixed(1)}L${(x + nx * w * 0.9 - tx * w * 0.4).toFixed(1)} ${(y + ny * w * 0.9 - ty * w * 0.4).toFixed(1)}`);
  }
  const [sx, sy] = shaft(0.3);
  return { left: `M${sx} ${sy}L${left.join("L")}L92 6Z`, right: `M${sx} ${sy}L${right.reverse().join("L")}L92 6Z`, barbs: barbs.join("") };
})();

function Quill() {
  const id = useId();
  return (
    <div className={styles.quill} data-quill aria-hidden="true">
      <div className={styles.quillWobble} data-quill-wobble>
        <svg className={styles.quillShadow} viewBox="0 0 100 300"><path d={QUILL.left} /><path d={QUILL.right} /><path d="M6 296C30 230 60 120 92 6" strokeWidth="3" stroke="#000" fill="none" /></svg>
        <svg viewBox="0 0 100 300">
          <defs>
            <linearGradient id={`${id}v`} x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#bfb196" /><stop offset=".55" stopColor="#f3ecdc" /><stop offset="1" stopColor="#fffaf0" /></linearGradient>
          </defs>
          <path d={QUILL.right} fill="#d9cfb9" />
          <path d={QUILL.left} fill={`url(#${id}v)`} />
          <path d={QUILL.barbs} stroke="#a89a7c" strokeWidth=".7" fill="none" opacity=".7" />
          <path d="M6 296C30 230 60 120 92 6" stroke="#b7a37f" strokeWidth="2.2" fill="none" />
          <path d="M6 296L15 268" stroke="#21160c" strokeWidth="3.2" strokeLinecap="round" />
        </svg>
        <i className={styles.tipDrop} data-tip-drop />
      </div>
    </div>
  );
}

const words = (text: string, group: string) => text.split(" ").map((word, i) => (
  <Fragment key={i}>{i > 0 && " "}<span className={styles.word} data-ink="word" data-group={group}>{word}</span></Fragment>
));
const motes = (group: string, count: number, place: (i: number) => CSSProperties) => Array.from({ length: count }, (_, i) => <i key={i} className={styles.mote} data-mote={group} style={place(i)} />);

type Props = { journey: ArrivalJourney; reduced: boolean; onRevealed: (token: number) => void; onEnter: () => void };

export default function AcceptanceLetter({ journey, reduced, onRevealed, onEnter }: Props) {
  const { token, phase, participant, skipped } = journey;
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const progress = useRef(0);
  const phaseRef = useRef(phase);
  const primary = useRef<HTMLButtonElement>(null);
  const door = useRef<ChamberDoorHandle>(null);
  const gate = useRef<Promise<void> | null>(null);
  const [gateState, setGateState] = useState<"open" | "closing" | "closed">("open");
  const [fx] = useState<LetterFx>(() => ({ dolly: 0, glow: 0, owl: 0 }));
  const viewport = useSyncExternalStore(subscribeViewport, viewportSnapshot, () => "1280x800");
  const fontsLoaded = useSyncExternalStore(subscribeFonts, fontsSnapshot, () => false);
  const [fontWaitOver, setFontWaitOver] = useState(false);
  const [done, setDone] = useState(reduced || phase !== "letter");
  const [roomFailed, setRoomFailed] = useState(false);
  const layout = useMemo(() => { const [w, h] = viewport.split("x").map(Number); return computeLayout(w, h); }, [viewport]);
  const tier = useMemo(() => tierFor(layout.vw), [layout.vw]);
  const name = participant.displayName.trim() || "Future Innovator";
  const nameGlyphs = useMemo(() => graphemes(name), [name]);
  const ready = fontsLoaded || fontWaitOver;

  useEffect(() => { phaseRef.current = phase; }, [phase]);
  useEffect(() => { const t = setTimeout(() => setFontWaitOver(true), 1200); return () => clearTimeout(t); }, []);

  // Build (or rebuild on resize / late font load) the one master timeline, keeping its progress.
  useLayoutEffect(() => {
    const node = root.current;
    if (!node || !ready) return;
    const context = gsap.context(() => {
      const tl = buildLetterTimeline(node, layout, fx, {
        curl: tier !== "mobile",
        onStage: (stage) => { node.dataset.stage = stage; },
        onDone: () => setDone(true),
      });
      timeline.current = tl;
      if (reduced || phaseRef.current !== "letter") tl.progress(1).pause();
      else if (progress.current > 0) tl.progress(progress.current);
      node.dataset.ready = "true";
    }, node);
    const visibility = () => {
      const tl = timeline.current;
      if (!tl || tl.progress() === 1) return;
      if (document.hidden) tl.pause(); else tl.resume();
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      progress.current = timeline.current?.progress() ?? 0;
      timeline.current = null;
      context.revert();
    };
  }, [ready, fontsLoaded, layout, tier, reduced, token, name, fx]);

  // The Common Room has loaded behind the sealed gate: unlock it and reveal the room through its iris.
  useEffect(() => {
    if (phase !== "revealing" || reduced || skipped) return;
    let live = true;
    void (async () => {
      await (gate.current ?? Promise.resolve());
      await door.current?.open();
      if (live) onRevealed(token);
    })();
    return () => { live = false; };
  }, [phase, reduced, skipped, token, onRevealed]);

  /** Seal the gate over the letter, then travel; the room loads unseen behind it. */
  const enter = () => {
    if (gate.current) return;
    if (reduced || !door.current) { onEnter(); return; }
    timeline.current?.pause();
    setGateState("closing");
    gate.current = door.current.close().then(() => setGateState("closed"));
    onEnter();
  };

  useEffect(() => { if (done && phase === "letter") primary.current?.focus({ preventScroll: true }); }, [done, phase]);

  const skip = () => timeline.current?.progress(1);
  const replay = () => {
    const node = root.current, tl = timeline.current;
    if (!node || !tl) return;
    setDone(false);
    node.dataset.stage = "arriving";
    tl.restart();
  };

  const vars = { "--W": `${layout.W}px`, "--P": `${layout.P}px`, "--E": `${layout.E}px`, "--EH": `${layout.EH}px`, "--D": `${layout.D}px`, "--S": `${layout.P * 0.34}px`, "--persp": `${PERSPECTIVE}px` } as CSSProperties;
  // Keep the room lit while the gate swings shut; it is released before the Common Room renders.
  const roomLive = !reduced && !roomFailed && (phase === "letter" || gateState === "closing");
  const gateShut = gateState === "closed" || phase === "revealing";
  const { panel } = layout;

  return (
    <div ref={root} className={styles.root} style={vars} data-testid="acceptance-art" data-stage="arriving" data-ready="false" data-reduced={reduced} data-gate={gateShut ? "closed" : "open"}>
      <div className={styles.backdrop} aria-hidden="true">
        <div className={styles.fallbackRoom} />
        {roomLive && <RoomBoundary onError={() => setRoomFailed(true)}><Suspense fallback={null}><LetterRoom fx={fx} tier={tier} /></Suspense></RoomBoundary>}
        <div className={styles.vignette} />
      </div>
      <div className={styles.pool} data-pool aria-hidden="true" />
      <div className={styles.drift} aria-hidden="true">{motes("drift", 6, (i) => ({ left: `${30 + i * 7}%`, top: `${38 + (i % 3) * 9}%` }))}</div>

      <div className={styles.viewport}>
        <div className={styles.world} data-world>
          <div className={styles.desk}>
            <div className={styles.envShadow} data-env-shadow aria-hidden="true" />
            <div className={styles.parcel} data-parcel>
              <div className={styles.envelope} data-envelope aria-hidden="true">
                <div className={styles.envBack} />
                <div className={styles.pocket}>
                  <div className={styles.address}><span>{name}</span><small>The Owlery, Technika’27</small><small>Birla Institute of Technology, Patna</small></div>
                </div>
                <i className={styles.sealGlow} data-seal-glow />
                <Seal half="bottom" />
                <div className={styles.flap} data-flap>
                  <div className={styles.flapFront} />
                  <div className={styles.flapInner} />
                  <Seal half="top" />
                </div>
                {motes("land", 10, (i) => ({ left: `${(i * 11 + 4) % 100}%`, top: i % 3 ? "100%" : "86%" }))}
                {motes("seal", 12, () => ({ left: "50%", top: "56%" }))}
              </div>
              <div className={styles.letterShadow} data-letter-shadow aria-hidden="true" />
              <div className={styles.rig} data-rig>
                <div className={styles.panelMid} data-panel aria-hidden="true"><Face row={1} /></div>
                <Fold side="top" />
                <Fold side="bottom" />
                {motes("edge", 14, (i) => (i < 8 ? { left: `${(i / 7) * 100}%`, top: "0%" } : { left: i % 2 ? "100%" : "0%", top: `${12 + (i - 8) * 6}%` }))}
                <article className={styles.sheet} data-sheet data-testid="acceptance-paper" aria-label="Your acceptance letter from Technika’27">
                  <i className={styles.frame} aria-hidden="true" />
                  <div className={styles.sheetInner} aria-hidden="true">
                    <Letterhead foil />
                    <p className={styles.greeting}>
                      {graphemes("Dear ").map((c, i) => <span key={i} data-ink="char" data-group="greet">{c}</span>)}
                      <span className={styles.name} data-name data-text={name}>
                        {nameGlyphs.map((c, i) => <span key={i} data-ink="char" data-group="name">{c}</span>)}
                        {motes("name", 7, (i) => ({ left: `${8 + i * 14}%`, top: "62%" }))}
                      </span>
                      <span data-ink="char" data-group="comma">,</span>
                    </p>
                    {BODY.map((paragraph, i) => <p key={i} className={styles.body}>{words(paragraph, "body")}</p>)}
                    <p className={styles.close}>{words(CLOSE, "close")}</p>
                    <footer className={styles.signoff}>
                      <p className={styles.yours}>{words(SIGN_OFF, "close")}</p>
                      <p className={styles.signature} data-sig-text data-text={SIGN}>{words(SIGN, "sig")}</p>
                      <span className={styles.sigTitle}>Festival Committee · BIT Patna</span>
                    </footer>
                  </div>
                  <Quill />
                  <i className={styles.drop} data-drop aria-hidden="true" />
                  <p className={styles.srOnly}>{`Technika’27, Birla Institute of Technology, Patna. Official invitation. Dear ${name}, ${BODY.join(" ")} ${CLOSE} ${SIGN_OFF} The Technika’27 Organising Committee.`}</p>
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!reduced && <ChamberDoor ref={door} speed={0.8} />}
      {!done && phase === "letter" && <button type="button" className={styles.skip} onClick={skip}>Reveal letter now</button>}
      <AnimatePresence>
        {done && phase === "letter" && gateState === "open" && (
          <motion.section
            key="finale"
            className={styles.finale}
            data-kind={panel.kind}
            style={panel.kind === "side" ? { left: panel.left, width: panel.width } : { height: panel.height }}
            initial={{ opacity: 0, y: reduced ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0.2 : 0.8, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Your journey begins"
          >
            <p className={styles.kicker}>Your journey begins here</p>
            <h2>Welcome to <em>Technika’27</em></h2>
            <button ref={primary} type="button" className={styles.primary} onClick={enter} disabled={gateState !== "open"}>Enter the Wizarding World <ArrowRight size={17} aria-hidden="true" /></button>
            {!reduced && <button type="button" className={styles.secondary} onClick={replay}><RotateCcw size={14} aria-hidden="true" /> Replay letter</button>}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
