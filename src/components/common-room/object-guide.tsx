"use client";

import { useEffect, useRef } from "react";
import { Compass } from "lucide-react";
import { roomObjects } from "@/lib/common-room/content";
import type { ObjectId } from "@/lib/common-room/types";
import styles from "./common-room.module.css";

export function ObjectGuide({ disabled, onSelect, onOpenChange }: { disabled: boolean; onSelect: (id: ObjectId) => void; onOpenChange: (open: boolean) => void }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!document.querySelector("dialog[open]") && ref.current?.open && !ref.current.contains(event.target as Node)) ref.current.open = false; };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !document.querySelector("dialog[open]") && ref.current) ref.current.open = false; };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  return <details ref={ref} className={styles.guide} onToggle={(event) => onOpenChange(event.currentTarget.open)}>
    <summary><Compass size={15} strokeWidth={1.3} />Explore the room</summary>
    <nav aria-label="Room objects">{roomObjects.map((object, index) => <button type="button" key={object.id} disabled={disabled} onClick={() => onSelect(object.id)} aria-label={object.label}><span>0{index + 1}</span>{object.label}</button>)}<p>Tab to an object · Enter to open<br />Escape to return to the room</p></nav>
  </details>;
}
