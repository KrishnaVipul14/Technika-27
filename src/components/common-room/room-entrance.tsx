import Image from "next/image";
import type { RefObject } from "react";
import { houseLogoFor, houseThemes } from "@/lib/houses";
import type { RoomParticipant } from "@/lib/common-room/types";
import styles from "./common-room.module.css";

export function RoomEntrance({ participant, progressRef, onSkip }: { participant: RoomParticipant; progressRef: RefObject<HTMLDivElement | null>; onSkip: () => void }) {
  return <div ref={progressRef} className={styles.entrance}>
    <div className={styles.welcome}><Image src={houseLogoFor(participant.house)} alt="" width={66} height={66} /><span className={styles.eyebrow}>Welcome home, {participant.displayName}</span><h2>{houseThemes[participant.house].name}</h2><p>{houseThemes[participant.house].motto}</p></div>
    <div className={styles.entranceFoot}><span role="status">Opening your house doorway</span><div className={styles.entranceTrack} role="progressbar" aria-label="Entering your common room" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}><span /></div><button type="button" onClick={onSkip}>Skip entrance</button></div>
  </div>;
}
