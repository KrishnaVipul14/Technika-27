"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { LockKeyhole, ScrollText, X } from "lucide-react";
import { orderMembers } from "@/lib/festival";

const filters = ["Complete chamber", "High Council", "Web Sorcerers", "Grand Aurors", "Faculty Sentinels"];

export function OrderGallery() {
  const [filter, setFilter] = useState(filters[0]);
  const [selected, setSelected] = useState<(typeof orderMembers)[number] | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const gallery = useRef<HTMLDivElement>(null);
  const members = filter === filters[0] ? orderMembers : orderMembers.filter((member) => member.category === filter);

  useEffect(() => {
    const element = gallery.current;
    if (!element) return;
    // Global GSAP setup must not touch Motion's server-rendered transforms
    // until this streamed gallery and its cards have hydrated.
    element.dataset.magicHydrated = "true";
    return () => { delete element.dataset.magicHydrated; };
  }, []);

  useEffect(() => {
    if (!selected || !dialog.current) return;
    const element = dialog.current;
    const focus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = overflow; focus?.focus(); };
  }, [selected]);

  return <div ref={gallery} id="order" className="order-gallery">
    <div className="order-filters" aria-label="Filter the Order by chamber">{filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)} aria-pressed={filter === item}>{item}</button>)}</div>
    <div className="ministry-notice-wall"><div className="notice-wall-plaque"><span>BY ORDER OF THE FESTIVAL MINISTRY</span><h2>Educational Decrees</h2><small>THE ORDER OF TECHNIKA · SESSION ’27</small></div><motion.div layout className="order-grid"><AnimatePresence mode="popLayout">{members.map((member) => <motion.article layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: .95 }} transition={{ duration: .3 }} key={member.title} className="order-card decree-frame">
      <span className="decree-hanger" aria-hidden="true"/><div className="decree-paper"><span className="decree-topline">EDUCATIONAL DECREE</span><div className="decree-serial">N<sup>o</sup> <strong>{String(26 + member.image).padStart(3, "0")}</strong></div><div className="decree-rule"/><span className="decree-department">{member.category}</span><h3>{member.title}</h3><div className="portrait-frame"><Image src={`/images/order-${member.image}.webp`} alt={`Sealed ministry portrait for ${member.role}`} fill sizes="(max-width: 560px) 45vw, (max-width: 900px) 40vw, 22vw"/><div className="portrait-lock"><span><LockKeyhole size={17}/></span><small>Identity under seal</small></div></div><div className="portrait-copy"><p>{member.role}</p><span className="decree-signature">The Festival Ministry</span><small><i/>Roster unveiling soon</small></div><button type="button" className="read-decree" onClick={() => setSelected(member)} aria-label={`Read decree for ${member.title}`}><ScrollText size={12}/>Read the decree</button></div>
    </motion.article>)}</AnimatePresence></motion.div><div className="notice-wall-footer">ALL STUDENTS ARE HEREBY INVITED TO MAKE A LITTLE MISCHIEF.</div></div>
    <span className="sr-only" role="status">Showing {members.length} members in {filter}.</span>
    {selected && <dialog ref={dialog} className="decree-dialog" aria-labelledby="decree-dialog-title" onCancel={() => setSelected(null)} onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><div className="parchment-sheet decree-dialog-paper"><button type="button" className="decree-close" onClick={() => setSelected(null)} aria-label="Close decree"><X size={20}/></button><span className="decree-topline">BY ORDER OF THE FESTIVAL MINISTRY</span><span className="decree-serial">N<sup>o</sup> <strong>{26 + selected.image}</strong></span><h2 id="decree-dialog-title">{selected.title}</h2><p>The Ministry hereby recognises the office of <strong>{selected.role}</strong> within the <strong>{selected.category}</strong>.</p><p>The appointed wizard’s name and story remain beneath an enchanted seal. The official organising roster will be unveiled here soon.</p><span className="decree-signature">Signed, The Order of Technika</span><div className="wax-seal"><span>T</span><small>’27</small></div></div></dialog>}
  </div>;
}
