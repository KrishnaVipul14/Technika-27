"use client";

import { useEffect, useRef, useId, type ReactNode } from "react";
import { X } from "lucide-react";
import type { AssignedHouse } from "@/lib/common-room/types";
import styles from "../common-room.module.css";

type Props = { open: boolean; title: string; house: AssignedHouse; onClose: () => void; onExited: () => void; children: ReactNode };
export function MagicalOverlay({ open, title, house, onClose, onExited, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => { const dialog = ref.current; return () => { dialog?.close(); }; }, []);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (open && !dialog.open) dialog.showModal();
    if (!dialog.open) return;
    const animation = dialog.animate(open ? [{ opacity: 0, transform: "translateX(24px)" }, { opacity: 1, transform: "translateX(0)" }] : [{ opacity: 1, transform: "translateX(0)" }, { opacity: 0, transform: "translateX(18px)" }], { duration: reduced ? 0 : open ? 360 : 220, easing: "cubic-bezier(.2,.7,.2,1)", fill: "both" });
    if (!open) void animation.finished.then(onExited).catch(() => {});
    return () => animation.cancel();
  }, [open, onExited]);
  return <dialog ref={ref} className={styles.dialog} data-house={house} data-closing={!open} aria-labelledby={titleId}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === ref.current) { const box = ref.current.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); } }}>
    <header className={styles.panelHeader}><div><span>Technika ’27 · The common room</span><h2 id={titleId}>{title}</h2></div><button type="button" className={styles.close} onClick={onClose} aria-label={`Close ${title}`}><X size={20} strokeWidth={1.3} /></button></header>
    <div className={styles.panelBody} data-lenis-prevent>{children}</div>
  </dialog>;
}
