import Image from "next/image";
import { Fragment, type CSSProperties, type RefObject } from "react";
import { houseLogoFor, houseThemes } from "@/lib/houses";
import type { RoomParticipant } from "@/lib/common-room/types";
import styles from "./common-room.module.css";

// Per-character ink reveal, like Harry Potter chapter text writing itself in.
function InkText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split("").map((ch, i) => (
        <Fragment key={`${i}-${ch}`}>
          {ch === " " ? (
            " "
          ) : (
            <span
              aria-hidden="true"
              className={styles.inkChar}
              style={{ "--i": i } as CSSProperties}
            >
              {ch}
            </span>
          )}
        </Fragment>
      ))}
    </span>
  );
}

export function RoomEntrance({ participant, progressRef, onSkip }: { participant: RoomParticipant; progressRef: RefObject<HTMLDivElement | null>; onSkip: () => void }) {
  const theme = houseThemes[participant.house];
  return <div ref={progressRef} className={styles.entrance}>
    <div className={styles.welcome}><Image src={houseLogoFor(participant.house)} alt="" width={66} height={66} /><span className={styles.eyebrow} aria-label={`Welcome home, ${participant.displayName}`}><InkText text={`Welcome home, ${participant.displayName}`} /></span><h2><InkText text={theme.name} /></h2><p>{theme.motto}</p></div>
    <div className={styles.entranceFoot}><span role="status">Opening your house doorway</span><div className={styles.entranceTrack} role="progressbar" aria-label="Entering your common room" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}><span /></div><button type="button" onClick={onSkip}>Skip entrance</button></div>
  </div>;
}
