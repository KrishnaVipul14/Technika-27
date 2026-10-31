"use client";

import { useRef } from "react";
import { Compass } from "lucide-react";
import { roomObjects } from "@/lib/common-room/content";
import type { ObjectId } from "@/lib/common-room/types";
import styles from "./common-room.module.css";

export function ObjectGuide({ disabled, onSelect }: { disabled: boolean; onSelect: (id: ObjectId) => void }) {
  const ref = useRef<HTMLDetailsElement>(null);
  return <details ref={ref} className={styles.guide}>
    <summary><Compass size={15} strokeWidth={1.3} />Explore the room</summary>
    <nav aria-label="Room objects">{roomObjects.map((object, index) => <button type="button" key={object.id} disabled={disabled} onClick={() => onSelect(object.id)} aria-label={object.label}><span>0{index + 1}</span>{object.label}</button>)}<p>Tab to an object · Enter to open<br />Escape to return to the room</p></nav>
  </details>;
}
