import { ArrowUpRight } from "lucide-react";
import { houseLore, roomObjects } from "@/lib/common-room/content";
import type { ObjectId, RoomParticipant } from "@/lib/common-room/types";
import styles from "./common-room.module.css";

export type FallbackReason = "chosen" | "unsupported" | "loading-error" | "context-lost";
export function RoomFallback({ participant, reason, onSelect, onRetry }: { participant: RoomParticipant; reason: FallbackReason; onSelect: (id: ObjectId) => void; onRetry?: () => void }) {
  const lore = houseLore[participant.house];
  return <section className={styles.fallback}>
    <span className={styles.eyebrow}>The Common Room · Reading mode</span><h1>{lore.title}</h1><p>{lore.description}</p>
    <div className={styles.fallbackNote}>{reason === "chosen" ? "A quieter way to explore. The same house stories and account information, without WebGL." : "The 3D room could not be displayed on this device. Your account information is still available below."}
      {onRetry && <p><button type="button" className={styles.paperButton} onClick={onRetry}>Try the 3D room</button></p>}</div>
    <nav className={styles.objectList} aria-label="Room objects">{roomObjects.map((object, index) => <button type="button" key={object.id} onClick={() => onSelect(object.id)} aria-label={object.label}><span>0{index + 1}</span><span><strong>{object.label}</strong><small>{object.hint}</small></span><ArrowUpRight size={17} strokeWidth={1.2} /></button>)}</nav>
  </section>;
}
