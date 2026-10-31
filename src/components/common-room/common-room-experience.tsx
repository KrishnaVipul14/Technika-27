"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { houseLogoFor, houseThemes } from "@/lib/houses";
import { houseLore, roomObjects } from "@/lib/common-room/content";
import type { ObjectId, RoomParticipant } from "@/lib/common-room/types";
import { RoomFallback, type FallbackReason } from "./room-fallback";
import { RoomLoader } from "./room-loader";
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
  const [selected, setSelected] = useState<ObjectId | null>(null);
  const [closing, setClosing] = useState(false);
  const [expired, setExpired] = useState(false);
  const [ready, setReady] = useState(false);
  const [fallback, setFallback] = useState<FallbackReason | null>(null);
  const reducedMotion = useReducedMotion();
  const onReady = useCallback(() => setReady(true), []);
  const showFallback = fallback !== null || participant.house !== "slytherin";
  const router = useRouter();
  const onSessionExpired = useCallback(() => { setExpired(true); router.refresh(); }, [router]);
  const onExited = useCallback(() => { setSelected(null); setClosing(false); }, []);
  if (expired) return <p role="status">Verifying your castle key…</p>;
  return <div className={`${styles.room} ${!showFallback ? styles.immersive : ""}`} data-testid="common-room" data-house={participant.house} data-theme={participant.house} data-ready={ready || showFallback} data-lenis-prevent>
    {!showFallback && <><RoomCanvas participant={participant} quality="medium" motion={!reducedMotion} onReady={onReady} /><div className={styles.vignette} />{!ready && <RoomLoader stage="Lighting the chamber" />}</>}
    <header className={styles.header}><div className={styles.identity}><Image src={houseLogoFor(participant.house)} width={37} height={46} alt={`${houseThemes[participant.house].name} emblem`} /><div><span>{houseThemes[participant.house].name} · Common Room</span><strong>{participant.displayName}</strong></div></div><Link className={styles.back} href="/" data-no-transition><ArrowLeft size={15} />Leave the room</Link></header>
    {showFallback ? <RoomFallback participant={participant} reason={fallback || "chosen"} onSelect={setSelected} onRetry={participant.house === "slytherin" ? () => { setReady(false); setFallback(null); } : undefined} /> : <>
      <div className={styles.roomTitle}><span className={styles.eyebrow}>{houseLore[participant.house].location}</span><h1>{houseLore[participant.house].title}</h1><p>{houseThemes[participant.house].motto}</p></div>
      <footer className={styles.roomFooter}><span>TECHNIKA ’27 <i /> PROCEDURAL 3D PROTOTYPE</span><div><button type="button" onClick={() => setFallback("chosen")}>Reading mode</button><ObjectGuide disabled={!ready} onSelect={setSelected} /></div></footer>
    </>}
    <MagicalOverlay open={selected !== null && !closing} title={roomObjects.find((object) => object.id === selected)?.label || "Common Room"} house={participant.house} onClose={() => setClosing(true)} onExited={onExited}>
      {selected === "archives" && <HouseArchivesPanel house={participant.house} />}
      {selected === "notices" && <NoticeBoardPanel />}
      {selected === "members" && <MembersPanel house={participant.house} onSessionExpired={onSessionExpired} />}
      {selected === "profile" && <ParticipantProfilePanel participant={participant} accountActions={accountActions} />}
      {selected === "secret" && <SecretRoomPanel house={participant.house} />}
    </MagicalOverlay>
  </div>;
}
