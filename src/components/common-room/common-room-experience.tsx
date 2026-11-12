"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Component, useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Settings2 } from "lucide-react";
import { houseLogoFor, houseThemes } from "@/lib/houses";
import { setLandingPreference } from "@/lib/landing-preference";
import { houseLore, roomObjects } from "@/lib/common-room/content";
import { initialRoomState, roomReducer } from "@/lib/common-room/interaction";
import type { ObjectId, RoomParticipant } from "@/lib/common-room/types";
import { RoomFallback, type FallbackReason, type RoomFailure } from "./room-fallback";
import { RoomLoader } from "./room-loader";
import { RoomEntrance } from "./room-entrance";
import { ObjectGuide } from "./object-guide";
import { RoomSettingsPanel } from "./room-settings";
import { useRoomSettings, type RoomSettings } from "./use-room-settings";
import { useRoomAudio } from "./use-room-audio";
import { MagicalOverlay } from "./panels/magical-overlay";
import { HouseArchivesPanel } from "./panels/house-archives-panel";
import { NoticeBoardPanel } from "./panels/notice-board-panel";
import { MembersPanel } from "./panels/members-panel";
import { ParticipantProfilePanel } from "./panels/participant-profile-panel";
import { SecretRoomPanel } from "./panels/secret-room-panel";
import { useRegistrationArrival } from "../registration-arrival";
import styles from "./common-room.module.css";

const RoomCanvas = dynamic(() => import("./room-canvas"), { ssr: false, loading: () => <RoomLoader stage="Opening the chamber" /> });

class RoomRendererBoundary extends Component<{ children: ReactNode; onFailure: (reason: RoomFailure) => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { this.props.onFailure(/webgl/i.test(error.message) ? "unsupported" : "loading-error"); }
  render() { return this.state.failed ? null : this.props.children; }
}

export function CommonRoomExperience({ participant, accountActions }: { participant: RoomParticipant; accountActions: ReactNode }) {
  const [state, dispatch] = useReducer(roomReducer, initialRoomState);
  const [expired, setExpired] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [fallback, setFallback] = useState<FallbackReason | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState<"open" | "closing" | null>(null);
  const { settings, update, quality, motion } = useRoomSettings();
  const arrival = useRegistrationArrival();
  const { roomReady } = arrival;
  const journeyPhase = arrival.journey?.phase;
  const arrivalPhase = arrival.journey?.participant.id === participant.id && arrival.journey.participant.house === participant.house ? arrival.journey.phase : undefined;
  const { setEnabled, play, unavailable, paused } = useRoomAudio(participant.house);
  const root = useRef<HTMLDivElement>(null); const entranceRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null); const selecting = useRef(false);
  const onFailure = useCallback((reason: RoomFailure) => { setGuideOpen(false); setFallback(reason); }, []);
  const showFallback = fallback !== null || settings.lightweight;
  useEffect(() => { if (showFallback) dispatch({ type: "FALLBACK" }); }, [showFallback]);
  // Landing here is itself a choice: remember the common room as the
  // post-sign-in destination (item 9 of the checklist).
  useEffect(() => { setLandingPreference("common-room"); }, []);
  useEffect(() => {
    if (modelReady || showFallback) return;
    const timeout = setTimeout(() => onFailure("loading-error"), 30_000);
    return () => clearTimeout(timeout);
  }, [modelReady, showFallback, onFailure]);
  const onSettingsExited = useCallback(() => setSettingsOpen(null), []);
  const changeSettings = async (patch: Partial<RoomSettings>) => {
    update(patch);
    if (patch.lightweight === false) {
      // A rejected dynamic import is cached by React.lazy; explicit reload is the honest retry.
      if (fallback === "loading-error") { window.location.reload(); return; }
      setGuideOpen(false); setModelReady(false); setFallback(null); dispatch({ type: "RETRY" });
    }
    if (patch.ambient !== undefined || patch.effects !== undefined) {
      const enabled = await setEnabled(patch.ambient ?? settings.ambient, patch.effects ?? settings.effects);
      if (!enabled && root.current?.isConnected) update({ ambient: false, effects: false });
    }
  };
  const onReady = useCallback(() => { setModelReady(true); dispatch({ type: "READY" }); }, []);
  const ready = showFallback || (modelReady && state.phase !== "loading" && state.phase !== "entering");
  // The arrival gate opens as soon as the room has loaded, so the entrance fly-in plays through it.
  const arrivalReady = showFallback || (modelReady && state.phase !== "loading");
  useEffect(() => { if (arrivalReady && !expired) roomReady(participant); }, [arrivalReady, expired, participant, roomReady]);
  useEffect(() => { if (arrival.journey?.skipped && arrivalPhase && state.phase === "entering") dispatch({ type: "SKIP" }); }, [arrival.journey?.skipped, arrivalPhase, state.phase]);
  const router = useRouter();
  const onSessionExpired = useCallback(() => { void setEnabled(false, false); setExpired(true); router.refresh(); }, [router, setEnabled]);
  const onExited = useCallback(() => { dispatch({ type: "PANEL_EXITED" }); if (showFallback) dispatch({ type: "RESTORED" }); }, [showFallback]);
  const select = useCallback((id: ObjectId) => {
    if (state.phase !== "exploring" || selecting.current) return;
    if (id === "secret") { router.push("/"); return; }
    selecting.current = true; opener.current = document.activeElement as HTMLElement | null;
    play(id === "members" || id === "notices" ? "book" : id === "profile" ? "door" : "magic");
    dispatch({ type: "SELECT", id });
    if (showFallback) dispatch({ type: "FOCUSED" });
  }, [state.phase, showFallback, play, router]);
  useEffect(() => {
    if (state.phase !== "exploring") return;
    selecting.current = false;
    if (opener.current) { const element = opener.current.isConnected ? opener.current : root.current?.querySelector<HTMLElement>("summary, button"); element?.focus({ preventScroll: true }); opener.current = null; }
  }, [state.phase]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key !== "Escape") return; if (state.phase === "entering") dispatch({ type: "SKIP" }); else if (state.phase === "focusing") dispatch({ type: "CLOSE" }); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [state.phase]);
  const { selected } = state;
  const panelVisible = selected && ["panel", "closing", "restoring"].includes(state.phase);
  if (expired) return <p role="status">Verifying your castle key…</p>;
  return <div ref={root} className={`${styles.room} ${!showFallback ? styles.immersive : ""}`} data-testid="common-room" data-house={participant.house} data-theme={participant.house} data-ready={ready} data-phase={state.phase} data-motion={motion} data-quality={quality} data-arrival={arrivalPhase} data-journey-phase={journeyPhase} data-lenis-prevent>
    {!showFallback && <><RoomRendererBoundary onFailure={onFailure}><RoomCanvas participant={participant} quality={quality} motion={motion} state={state} dispatch={dispatch} controlsLocked={guideOpen || settingsOpen !== null || arrival.active} entranceRef={entranceRef} onSelect={select} onReady={onReady} onFailure={onFailure} /></RoomRendererBoundary><div className={styles.vignette} />{!modelReady && <RoomLoader stage="Lighting the chamber" />}{state.phase === "entering" && <RoomEntrance participant={participant} progressRef={entranceRef} onSkip={() => dispatch({ type: "SKIP" })} />}</>}
    <header className={styles.header}><div className={styles.identity}><Image src={houseLogoFor(participant.house)} width={37} height={46} alt={`${houseThemes[participant.house].name} emblem`} /><div><span>{houseThemes[participant.house].name} · Common Room</span><strong>{participant.displayName}</strong></div></div><div className={styles.headerActions}><button type="button" className={styles.settingsButton} aria-label="Room settings" onClick={() => setSettingsOpen("open")} disabled={state.phase !== "exploring" && state.phase !== "loading"}><Settings2 size={17} /></button><Link className={styles.back} href="/" data-no-transition><ArrowLeft size={15} /><span>Leave the room</span></Link></div></header>
    {arrivalPhase === "complete" && <p className={styles.arrivalWelcome} role="status">Welcome home, {participant.displayName}.</p>}
    {showFallback ? <RoomFallback participant={participant} reason={fallback || "chosen"} onSelect={select} onRetry={() => void changeSettings({ lightweight: false })} /> : <>
      <div className={styles.roomTitle}><span className={styles.eyebrow}>{houseLore[participant.house].location}</span><h1>{houseLore[participant.house].title}</h1><p>{houseThemes[participant.house].motto}</p></div>
      <footer className={styles.roomFooter}><span>TECHNIKA ’27 <i /> PROCEDURAL 3D PROTOTYPE</span><div><button type="button" disabled={!ready || state.phase !== "exploring"} onClick={() => void changeSettings({ lightweight: true })}>Reading mode</button><ObjectGuide disabled={!ready} onSelect={select} onOpenChange={setGuideOpen} /></div></footer>
    </>}
    {settingsOpen && <RoomSettingsPanel house={participant.house} settings={{ ...settings, lightweight: showFallback }} motion={motion} open={settingsOpen === "open"} onClose={() => setSettingsOpen("closing")} onExited={onSettingsExited} onChange={changeSettings} audioUnavailable={unavailable} audioPaused={paused} onResume={() => void changeSettings({ ambient: settings.ambient, effects: settings.effects })} />}
    {panelVisible && <MagicalOverlay motion={motion} open={state.phase === "panel"} title={roomObjects.find((object) => object.id === selected)!.label} house={participant.house} onClose={() => dispatch({ type: "CLOSE" })} onExited={onExited}>
      {selected === "archives" && <HouseArchivesPanel house={participant.house} />}
      {selected === "notices" && <NoticeBoardPanel />}
      {selected === "members" && <MembersPanel house={participant.house} onSessionExpired={onSessionExpired} />}
      {selected === "profile" && <ParticipantProfilePanel participant={participant} accountActions={accountActions} />}
      {selected === "secret" && <SecretRoomPanel house={participant.house} />}
    </MagicalOverlay>}
  </div>;
}
