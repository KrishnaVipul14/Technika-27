"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { houseLogoFor, houseThemes } from "@/lib/houses";
import { roomObjects } from "@/lib/common-room/content";
import type { ObjectId, RoomParticipant } from "@/lib/common-room/types";
import { RoomFallback } from "./room-fallback";
import { MagicalOverlay } from "./panels/magical-overlay";
import { HouseArchivesPanel } from "./panels/house-archives-panel";
import { NoticeBoardPanel } from "./panels/notice-board-panel";
import { MembersPanel } from "./panels/members-panel";
import { ParticipantProfilePanel } from "./panels/participant-profile-panel";
import { SecretRoomPanel } from "./panels/secret-room-panel";
import styles from "./common-room.module.css";

export function CommonRoomExperience({ participant, accountActions }: { participant: RoomParticipant; accountActions: ReactNode }) {
  const [selected, setSelected] = useState<ObjectId | null>(null);
  const [closing, setClosing] = useState(false);
  const [expired, setExpired] = useState(false);
  const router = useRouter();
  const onSessionExpired = useCallback(() => { setExpired(true); router.refresh(); }, [router]);
  const onExited = useCallback(() => { setSelected(null); setClosing(false); }, []);
  if (expired) return <p role="status">Verifying your castle key…</p>;
  return <div className={styles.room} data-testid="common-room" data-house={participant.house} data-theme={participant.house} data-lenis-prevent>
    <header className={styles.header}><div className={styles.identity}><Image src={houseLogoFor(participant.house)} width={37} height={46} alt={`${houseThemes[participant.house].name} emblem`} /><div><span>{houseThemes[participant.house].name} · Common Room</span><strong>{participant.displayName}</strong></div></div><Link className={styles.back} href="/" data-no-transition><ArrowLeft size={15} />Leave the room</Link></header>
    <RoomFallback participant={participant} reason="chosen" onSelect={setSelected} />
    <MagicalOverlay open={selected !== null && !closing} title={roomObjects.find((object) => object.id === selected)?.label || "Common Room"} house={participant.house} onClose={() => setClosing(true)} onExited={onExited}>
      {selected === "archives" && <HouseArchivesPanel house={participant.house} />}
      {selected === "notices" && <NoticeBoardPanel />}
      {selected === "members" && <MembersPanel house={participant.house} onSessionExpired={onSessionExpired} />}
      {selected === "profile" && <ParticipantProfilePanel participant={participant} accountActions={accountActions} />}
      {selected === "secret" && <SecretRoomPanel house={participant.house} />}
    </MagicalOverlay>
  </div>;
}
