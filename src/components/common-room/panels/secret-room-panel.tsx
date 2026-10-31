"use client";

import { useState } from "react";
import { houseLore } from "@/lib/common-room/content";
import type { AssignedHouse } from "@/lib/common-room/types";
import styles from "../common-room.module.css";

export function SecretRoomPanel({ house }: { house: AssignedHouse }) {
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<"idle" | "try" | "solved">("idle");
  const lore = houseLore[house];
  return <article>
    <span className={styles.noticeLabel}>A small secret, just for the curious</span>
    <p className={styles.riddle}>{lore.riddle}</p>
    {result === "solved" ? <p className={styles.secretMessage} role="status">{lore.secretMessage}</p> : <form className={styles.answer} onSubmit={(event) => { event.preventDefault(); setResult(lore.answers.includes(answer.trim().toLowerCase()) ? "solved" : "try"); }}>
      <label htmlFor="room-riddle-answer">Your answer</label>
      <input id="room-riddle-answer" value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={100} autoComplete="off" />
      <button className={styles.paperButton} type="submit">Whisper the answer</button>
      {result === "try" && <p className={styles.status} role="status">Listen a little closer. The door is patient.</p>}
    </form>}
    <p><small>An original Common Room diversion. Take your time; there is nothing to win and no one to outrun.</small></p>
  </article>;
}
