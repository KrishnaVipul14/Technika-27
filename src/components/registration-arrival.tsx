"use client";

import { Component, createContext, lazy, Suspense, useCallback, useContext, useEffect, useReducer, useRef, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { ArrowRight, SkipForward } from "lucide-react";
import type { ArrivalParticipant } from "@/lib/common-room/types";
import { useAuth } from "./auth-provider";
import styles from "./registration-arrival.module.css";

const AcceptanceLetter = lazy(() => import("./acceptance-letter"));
export type ArrivalJourney = { token: number; from: string; participant: ArrivalParticipant; phase: "letter" | "travelling" | "revealing" | "complete"; skipped: boolean; atDestination: boolean };
type Action =
  | { type: "START"; journey: ArrivalJourney }
  | { type: "TRAVEL"; token: number; skip: boolean }
  | { type: "READY"; participant: ArrivalParticipant }
  | { type: "FINISH"; token: number }
  | { type: "SYNC"; pathname: string; userId?: string; loading: boolean }
  | { type: "CANCEL" };

function reducer(state: ArrivalJourney | null, action: Action): ArrivalJourney | null {
  if (action.type === "START") return state && state.phase !== "complete" ? state : action.journey;
  if (!state || action.type === "CANCEL") return null;
  if (action.type === "SYNC") {
    if ((action.userId && action.userId !== state.participant.id) || (!action.loading && !action.userId)) return null;
    if (action.pathname !== state.from && action.pathname !== "/account") return null;
    if (state.atDestination && action.pathname !== "/account") return null;
    if (action.pathname === "/account") return state.phase === "letter" ? null : state.atDestination ? state : { ...state, atDestination: true };
    return state;
  }
  if (action.type === "READY") {
    if (state.phase !== "travelling") return state;
    if (action.participant.id !== state.participant.id || action.participant.house !== state.participant.house) return null;
    return { ...state, participant: action.participant, phase: "revealing" };
  }
  if (action.token !== state.token) return state;
  if (action.type === "FINISH") return state.phase === "revealing" ? { ...state, phase: "complete" } : state;
  if (state.phase === "complete") return state;
  if (state.phase === "revealing") return action.skip ? { ...state, phase: "complete" } : state;
  return { ...state, phase: "travelling", skipped: state.skipped || action.skip };
}

type ArrivalContextValue = { journey: ArrivalJourney | null; active: boolean; begin: (participant: ArrivalParticipant) => void; roomReady: (participant: ArrivalParticipant) => void; cancel: () => void };
const ArrivalContext = createContext<ArrivalContextValue>({ journey: null, active: false, begin: () => {}, roomReady: () => {}, cancel: () => {} });
export const useRegistrationArrival = () => useContext(ArrivalContext);

class LetterBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className={styles.loading}><p>The animation could not be loaded.</p><p>Your registration is safe. Use “Skip animation” to enter your room.</p></div> : this.props.children; }
}

/** An in-memory visual handoff, never an authentication or assignment authority. */
export function RegistrationArrivalProvider({ children }: { children: ReactNode }) {
  const [journey, dispatch] = useReducer(reducer, null);
  const pathname = usePathname(), router = useRouter();
  const { user, loading } = useAuth();
  const reduced = useReducedMotion() !== false;
  const sequence = useRef(0), dialog = useRef<HTMLDialogElement>(null);
  const phase = journey?.phase, token = journey?.token, skipped = journey?.skipped;
  const identityChanged = Boolean(journey && ((user && user.id !== journey.participant.id) || (!loading && !user)));
  const validRoute = !journey || ((pathname === journey.from || pathname === "/account") && (!journey.atDestination || pathname === "/account") && !(phase === "letter" && pathname === "/account"));
  const active = Boolean(journey && phase !== "complete" && !identityChanged && validRoute);
  const begin = useCallback((participant: ArrivalParticipant) => {
    dispatch({ type: "START", journey: { token: ++sequence.current, from: pathname, participant, phase: "letter", skipped: false, atDestination: false } });
    router.prefetch("/account");
    // Preload code and the assigned crest, not a second WebGL canvas or another house.
    void import("./common-room/room-assets").then((assets) => assets.preloadRoom(participant.house)).catch(() => {});
  }, [pathname, router]);
  const roomReady = useCallback(({ id, displayName, house }: ArrivalParticipant) => dispatch({ type: "READY", participant: { id, displayName, house } }), []);
  const cancel = useCallback(() => dispatch({ type: "CANCEL" }), []);
  const finish = useCallback((token: number) => dispatch({ type: "FINISH", token }), []);
  const travel = (skip: boolean) => { if (journey) dispatch({ type: "TRAVEL", token: journey.token, skip }); };

  useEffect(() => { dispatch({ type: "SYNC", pathname, userId: user?.id, loading }); }, [pathname, user?.id, loading]);
  useEffect(() => {
    if (phase !== "travelling") return;
    router.replace("/account"); router.refresh();
  }, [phase, token, router]);
  useEffect(() => { if (phase === "revealing" && (reduced || skipped) && token !== undefined) finish(token); }, [phase, token, reduced, skipped, finish]);
  useEffect(() => {
    if (!active) return;
    const element = dialog.current!;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    element.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    return () => { element.close(); document.body.style.overflow = overflow; };
  }, [active]);
  useEffect(() => { if (phase === "complete") document.getElementById("main-content")?.focus({ preventScroll: true }); }, [phase]);

  return <ArrivalContext.Provider value={{ journey, active, begin, roomReady, cancel }}>
    {children}
    {active && journey && <dialog ref={dialog} className={styles.stage} aria-label="Your acceptance letter" data-testid="registration-arrival" data-house={journey.participant.house} data-phase={phase} data-motion={!reduced} data-lenis-prevent onCancel={(event) => { event.preventDefault(); travel(true); }}>
      <LetterBoundary key={journey.token}><Suspense fallback={<div className={styles.loading}><p>Preparing your acceptance letter…</p></div>}>
        <AcceptanceLetter journey={journey} reduced={reduced} onRevealed={finish} onEnter={() => travel(reduced)} />
      </Suspense></LetterBoundary>
      <header className={styles.controls}><span>THE OWLERY <i /> TECHNIKA ’27</span><button type="button" onClick={() => travel(true)}><SkipForward size={15} /> Skip animation</button></header>
      <footer className={styles.continue}>
        {/* During the letter, its own CTA leads on; the status stays announced for screen readers. */}
        <p role="status" className={phase === "letter" ? styles.srOnly : undefined}>{phase === "letter" ? "Registration confirmed. Read at your own pace." : phase === "travelling" ? "Your registration is safe. Opening your verified Common Room…" : `Welcome home, ${journey.participant.displayName}.`}</p>
        {phase === "letter" ? null : <Link href="/account" data-no-transition>Taking too long? Open your room directly <ArrowRight size={15} /></Link>}
      </footer>
    </dialog>}
  </ArrivalContext.Provider>;
}
