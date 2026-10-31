"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { houseLogoFor, houseThemes } from "@/lib/houses";
import { houseLore, roomObjects } from "@/lib/common-room/content";
import { initialRoomState, roomReducer } from "@/lib/common-room/interaction";
import type { ObjectId, RoomParticipant } from "@/lib/common-room/types";
import { RoomFallback, type FallbackReason } from "./room-fallback";
import { RoomLoader } from "./room-loader";
import { RoomEntrance } from "./room-entrance";
import { ObjectGuide } from "./object-guide";
import { MagicalOverlay } from "./panels/magical-overlay";
import { HouseArchivesPanel } from "./panels/house-archives-panel";
import { NoticeBoardPanel } from "./panels/notice-board-panel";
import { MembersPanel } from "./panels/members-panel";
import { ParticipantProfilePanel } from "./panels/participant-profile-panel";
import { SecretRoomPanel } from "./panels/secret-room-panel";
import styles from "./common-room.module.css";

const RoomCanvas = dynamic(() => import("./room-canvas"), { ssr: false, loading: () => <RoomLoader stage="Opening the chamber" /> });

export function CommonRoomExperience({ participant, accountActions }: { participant: RoomParticipant; accountActions: ReactNode }) {
  const hasScene = ["slytherin", "gryffindor"].includes(participant.house);
  const [state, dispatch] = useReducer(roomReducer, hasScene ? initialRoomState : { ...initialRoomState, phase: "exploring" });
  const [expired, setExpired] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [fallback, setFallback] = useState<FallbackReason | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const root = useRef<HTMLDivElement>(null); const entranceRef = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null); const selecting = useRef(false);
  const showFallback = fallback !== null || !hasScene;
  const onReady = useCallback(() => { setModelReady(true); dispatch({ type: "READY" }); }, []);
  const ready = showFallback || (modelReady && state.phase !== "loading" && state.phase !== "entering");
  const router = useRouter();
  const onSessionExpired = useCallback(() => { setExpired(true); router.refresh(); }, [router]);
  const onExited = useCallback(() => { dispatch({ type: "PANEL_EXITED" }); if (showFallback) dispatch({ type: "RESTORED" }); }, [showFallback]);
  const select = useCallback((id: ObjectId) => {
    if (state.phase !== "exploring" || selecting.current) return;
    selecting.current = true; opener.current = document.activeElement as HTMLElement | null;
    dispatch({ type: "SELECT", id });
    if (showFallback) dispatch({ type: "FOCUSED" });
  }, [state.phase, showFallback]);
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
  return <div ref={root} className={`${styles.room} ${!showFallback ? styles.immersive : ""}`} data-testid="common-room" data-house={participant.house} data-theme={participant.house} data-ready={ready} data-phase={state.phase} data-lenis-prevent>
    {!showFallback && <><RoomCanvas participant={participant} quality="medium" motion={!reducedMotion} state={state} dispatch={dispatch} controlsLocked={guideOpen} entranceRef={entranceRef} onSelect={select} onReady={onReady} /><div className={styles.vignette} />{!modelReady && <RoomLoader stage="Lighting the chamber" />}{state.phase === "entering" && <RoomEntrance participant={participant} progressRef={entranceRef} onSkip={() => dispatch({ type: "SKIP" })} />}</>}
    <header className={styles.header}><div className={styles.identity}><Image src={houseLogoFor(participant.house)} width={37} height={46} alt={`${houseThemes[participant.house].name} emblem`} /><div><span>{houseThemes[participant.house].name} · Common Room</span><strong>{participant.displayName}</strong></div></div><Link className={styles.back} href="/" data-no-transition><ArrowLeft size={15} />Leave the room</Link></header>
    {showFallback ? <RoomFallback participant={participant} reason={fallback || "chosen"} onSelect={select} onRetry={hasScene ? () => { setModelReady(false); setFallback(null); } : undefined} /> : <>
      <div className={styles.roomTitle}><span className={styles.eyebrow}>{houseLore[participant.house].location}</span><h1>{houseLore[participant.house].title}</h1><p>{houseThemes[participant.house].motto}</p></div>
      <footer className={styles.roomFooter}><span>TECHNIKA ’27 <i /> PROCEDURAL 3D PROTOTYPE</span><div><button type="button" disabled={!ready || state.phase !== "exploring"} onClick={() => setFallback("chosen")}>Reading mode</button><ObjectGuide disabled={!ready} onSelect={select} onOpenChange={setGuideOpen} /></div></footer>
    </>}
    {panelVisible && <MagicalOverlay open={state.phase === "panel"} title={roomObjects.find((object) => object.id === selected)!.label} house={participant.house} onClose={() => dispatch({ type: "CLOSE" })} onExited={onExited}>
      {selected === "archives" && <HouseArchivesPanel house={participant.house} />}
      {selected === "notices" && <NoticeBoardPanel />}
      {selected === "members" && <MembersPanel house={participant.house} onSessionExpired={onSessionExpired} />}
      {selected === "profile" && <ParticipantProfilePanel participant={participant} accountActions={accountActions} />}
      {selected === "secret" && <SecretRoomPanel house={participant.house} />}
    </MagicalOverlay>}
  </div>;
}
