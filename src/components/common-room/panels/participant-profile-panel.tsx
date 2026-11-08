import type { ReactNode } from "react";
import { houseThemes } from "@/lib/houses";
import { unavailableSources } from "@/lib/common-room/content";
import type { RoomParticipant } from "@/lib/common-room/types";
import styles from "../common-room.module.css";

export function ParticipantProfilePanel({ participant, accountActions }: { participant: RoomParticipant; accountActions: ReactNode }) {
  return <article>
    <p>Your own account details, kept here in your travelling chest.</p>
    <dl className={styles.profile}>{[["Display name", participant.displayName], ["Your email", participant.email || "Not available"], ["Assigned house", houseThemes[participant.house].name], ["College", participant.college || "Not provided"]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    <section className={styles.notice}><h4>Registered events</h4><p>{unavailableSources.registrations.message}</p></section>
    <section className={styles.notice}><h4>Participation history</h4><p>{unavailableSources.history.message}</p></section>
    <div className={styles.profileActions}>{accountActions}</div>
  </article>;
}
