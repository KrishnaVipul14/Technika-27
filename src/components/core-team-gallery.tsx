"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type Lenis from "lenis";
import {
  ArrowUpRight,
  Coins,
  Crown,
  Feather,
  GraduationCap,
  KeyRound,
  LockKeyhole,
  ScrollText,
  Shield,
  Sparkles,
  X,
} from "lucide-react";
import { orderMembers } from "@/lib/festival";
import { Divider } from "./ornaments";
import styles from "./core-team-gallery.module.css";

const chambers = [
  { label: "High Council", key: "council", icon: Crown },
  { label: "Grand Aurors", key: "aurors", icon: Shield },
  { label: "Faculty Sentinels", key: "faculty", icon: GraduationCap },
] as const;

// The existing Order's council offices are placeholders until the roster is supplied.
const councilMembers = orderMembers
  .filter((member) => chambers.some((chamber) => chamber.label === member.category))
  .map((member, index) => ({ ...member, number: index + 1 }));

type CouncilMember = (typeof councilMembers)[number];

const officeIcons = [Crown, Sparkles, Shield, Coins, KeyRound, Sparkles, Feather, GraduationCap];
const portraitNumbers = ["I", "II", "III", "IV", "V", "VI"];
const filters = ["All portraits", ...chambers.map((chamber) => chamber.label)];

function chamberFor(member: CouncilMember) {
  return chambers.find((chamber) => chamber.label === member.category) ?? chambers[0];
}

function portraitPosition(member: CouncilMember) {
  return member.image === 7 ? "66% center" : member.image === 8 ? "36% center" : "center";
}

function WaxSeal({ member }: { member: CouncilMember }) {
  const Icon = officeIcons[member.image - 1] ?? Crown;
  return (
    <span className={styles.waxSeal} aria-hidden="true">
      <Icon size={21} strokeWidth={1.3} />
      <small>XXVII</small>
    </span>
  );
}

function FrameCorners() {
  return (
    <>
      {[styles.topLeft, styles.topRight, styles.bottomRight, styles.bottomLeft].map((position) => (
        <svg className={`${styles.frameCorner} ${position}`} key={position} viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <path d="M4 35V4h31M10 27V10h17M4 20c10 0 16-6 16-16M10 10l8 8" stroke="currentColor" strokeWidth="1" />
          <path d="m27 4 4-3 4 3-4 3-4-3ZM4 27l3 4-3 4-3-4 3-4Z" fill="currentColor" />
        </svg>
      ))}
    </>
  );
}

function CouncilPortrait({ member, onOpen }: { member: CouncilMember; onOpen: () => void }) {
  const chamber = chamberFor(member);
  return (
    <article
      className={styles.portraitCard}
      data-core-portrait
      data-chamber={chamber.key}
      style={{ animationDelay: `${(member.number - 1) * 65}ms` }}
    >
      <FrameCorners />
      <div className={styles.cardTopline}>
        <span>{member.category}</span>
        <span className={styles.portraitNumber}>{portraitNumbers[member.number - 1]}</span>
      </div>

      <div className={styles.portraitFrame}>
        <Image
          className={styles.portraitImage}
          src={`/images/order-${member.image}.webp`}
          alt={`Enchanted placeholder portrait for ${member.title}`}
          fill
          sizes="(max-width: 620px) calc(100vw - 72px), (max-width: 1000px) calc((100vw - 112px) / 2), 350px"
          style={{ objectPosition: portraitPosition(member) }}
        />
        <div className={styles.portraitVeil} />
        <span className={styles.portraitStar} aria-hidden="true">✦</span>
        <span className={styles.sealedLabel}><LockKeyhole size={11} /> Identity under seal</span>
      </div>

      <div className={styles.nameplate}>
        <WaxSeal member={member} />
        <span className={styles.nameplateKicker}>The Order of Technika</span>
        <h3>{member.title}</h3>
        <p>{member.role}</p>
        <div className={styles.nameplateRule} aria-hidden="true"><span />✦<span /></div>
        <span className={styles.identityNote}>The keeper shall be revealed</span>
        <button
          type="button"
          className={styles.scrollButton}
          onClick={onOpen}
          aria-label={`Read the scroll for ${member.title}`}
          aria-haspopup="dialog"
        >
          <ScrollText size={14} strokeWidth={1.4} />
          Read the scroll
          <ArrowUpRight size={14} />
        </button>
      </div>
    </article>
  );
}

function CouncilScroll({ member, onClose }: { member: CouncilMember; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const chamber = chamberFor(member);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    const lenis = (window as unknown as { lenis?: Lenis }).lenis;
    const wasScrolling = lenis && !lenis.isStopped;

    element.showModal();
    document.body.style.overflow = "hidden";
    lenis?.stop();

    return () => {
      if (element.open) element.close();
      document.body.style.overflow = previousOverflow;
      if (wasScrolling) lenis.start();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className={styles.scrollDialog}
      data-chamber={chamber.key}
      data-lenis-prevent
      aria-labelledby="council-scroll-title"
      aria-describedby="council-scroll-description"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <article className={styles.scrollPaper}>
        <button type="button" className={styles.closeScroll} onClick={onClose} aria-label="Close council scroll"><X size={20} /></button>
        <div className={styles.scrollFolio}>
          <span><ScrollText size={15} /> THE COUNCIL ARCHIVE</span>
          <span>XXVII / {String(member.number).padStart(2, "0")}</span>
        </div>
        <div className={styles.scrollHeading}>
          <div className={styles.scrollPortrait}>
            <Image src={`/images/order-${member.image}.webp`} alt="" fill sizes="150px" style={{ objectPosition: portraitPosition(member) }} />
          </div>
          <div>
            <span className={styles.scrollChamber}>{member.category}</span>
            <h2 id="council-scroll-title">{member.title}</h2>
            <p className={styles.scrollRole}>{member.role}</p>
          </div>
        </div>
        <Divider />
        <p className={styles.scrollSalutation}>A little patience, dear seeker.</p>
        <p id="council-scroll-description">
          This portrait reserves a place for <strong>{member.role}</strong> in the Order of Technika.
          The appointed keeper’s identity remains beneath an enchanted seal.
        </p>
        <p>Their official name, portrait, and story will appear here when the Technika ’27 organising council is unveiled.</p>
        <div className={styles.scrollSignoff}>
          <div><span>Until the next revelation,</span><strong>The Festival Ministry</strong><small>Official council announcement coming soon</small></div>
          <WaxSeal member={member} />
        </div>
      </article>
    </dialog>
  );
}

export function CoreTeamGallery() {
  const [filter, setFilter] = useState(filters[0]);
  const [selected, setSelected] = useState<CouncilMember | null>(null);
  const members = filter === filters[0] ? councilMembers : councilMembers.filter((member) => member.category === filter);

  return (
    <section className={styles.gallery} aria-labelledby="core-gallery-title">
      <div className={styles.galleryHeading}>
        <div><span className={styles.galleryKicker}><Sparkles size={13} /> The enchanted portrait gallery</span><h2 id="core-gallery-title">Meet the <em>keepers.</em></h2></div>
        <p>Different chambers. One shared spell.<br /><span>Open a scroll to explore the council.</span></p>
      </div>

      <div className={styles.galleryToolbar}>
        <div className={styles.filters} role="group" aria-label="Filter council portraits by chamber">
          {filters.map((item, index) => {
            const count = index === 0 ? councilMembers.length : councilMembers.filter((member) => member.category === item).length;
            const Icon = index === 0 ? Sparkles : chambers[index - 1].icon;
            return (
              <button key={item} type="button" onClick={() => setFilter(item)} aria-pressed={filter === item} aria-controls="core-portrait-grid">
                <Icon size={14} strokeWidth={1.4} aria-hidden="true" />{item}<span aria-hidden="true">{count}</span>
              </button>
            );
          })}
        </div>
        <span className={styles.galleryCount}>{String(members.length).padStart(2, "0")} / {String(councilMembers.length).padStart(2, "0")} PORTRAITS</span>
      </div>

      <div id="core-portrait-grid" className={styles.portraitGrid}>
        {members.map((member) => <CouncilPortrait key={member.title} member={member} onOpen={() => setSelected(member)} />)}
      </div>
      <p className={styles.galleryFootnote}><Feather size={14} strokeWidth={1.3} aria-hidden="true" /> The frames are enchanted. The stories are still being written.</p>
      <span className="sr-only" role="status">Showing {members.length} portraits in {filter}.</span>
      {selected && <CouncilScroll member={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
