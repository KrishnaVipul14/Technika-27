"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { ArrowDown, ArrowLeft, ArrowUpRight, BookOpen, Check, Feather, LockKeyhole, LogOut, Pause, Play, RotateCcw, ScrollText, ShieldCheck, X } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { getSupabase } from "@/lib/supabase/client";
import { alumniIntegrations, readAlumniProfile, type AlumniDraft, type AlumniProfileResult } from "@/lib/alumni-registry";
import { useAuth } from "./auth-provider";
import { useMagic } from "./experience";
import { Countdown, SoonBadge } from "./coming-soon";
import { AmbientParticles, Divider } from "./ornaments";
import styles from "./alumni-registry.module.css";

function WaxSeal({ small = false }: { small?: boolean }) {
  return <span className={`wax-seal ${styles.seal} ${small ? styles.smallSeal : ""}`} aria-hidden="true"><span>T</span><small>XXVII</small></span>;
}

function Candle({ className = "" }: { className?: string }) {
  return <div className={`${styles.candle} ${className}`} aria-hidden="true"><i className={styles.flame} data-flame /><span className={styles.wick} /><span className={styles.wax} /><span className={styles.candleBase} /></div>;
}

function LetterPreview({ name, onClose }: { name: string | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    if (name === null || !dialog.current) return;
    const node = dialog.current;
    if (!node.open) node.showModal();
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(node.querySelector("[data-letter-paper]"), { y: 24, rotationX: -9, opacity: 0 }, { y: 0, rotationX: 0, opacity: 1, duration: .8, ease: "power3.out" });
    });
    return () => { media.revert(); if (node.open) node.close(); };
  }, [name]);

  // TODO(alumni): a verified acceptance letter requires a real registry confirmation.
  // This preview must never become a receipt merely because the account is signed in.
  return <dialog ref={dialog} className={styles.preview} aria-label="Acceptance letter preview" aria-describedby="alumni-letter-disclaimer" onClose={onClose} data-lenis-prevent>
    <button type="button" className={styles.closeLetter} aria-label="Close letter preview" onClick={() => dialog.current?.close()}><X size={20} /></button>
    <article className={`parchment-sheet ${styles.acceptancePaper}`} data-letter-paper>
      <div className={styles.acceptanceHead}><Image src="/images/crest.webp" width={72} height={72} alt="" /><span>TECHNIKA ’27</span><small>ALUMNI AFFAIRS · BIT PATNA</small></div>
      <Divider />
      <p className={styles.letterKicker}>An invitation to return</p>
      <h2>Your next chapter<br /><em>awaits.</em></h2>
      <p className={styles.salutation}>Dear {name || "old friend"},</p>
      <p>Some doors never truly close. Beyond them live the friendships, discoveries, and little moments of magic that made these halls yours.</p>
      <p>We look forward to welcoming you back to Technika ’27. Your story belongs among the stories that brought us here.</p>
      <div className={styles.previewStamp}>PREVIEW · NOT VERIFIED</div>
      <p id="alumni-letter-disclaimer" className={styles.letterDisclaimer}>This is a visual preview, not a registration confirmation or payment receipt. The official registry and payment verification are not connected.</p>
      <div className={styles.signoff}><div><span>Until we meet again,</span><strong>Technika ’27</strong><small>The alumni chapter</small></div><WaxSeal /></div>
    </article>
  </dialog>;
}

function RegistrationParchment({ user, authLoading }: { user: User | null; authLoading: boolean }) {
  const [profile, setProfile] = useState<AlumniProfileResult | { status: "loading" | "guest" }>(() => ({ status: user ? "loading" : "guest" }));
  const [attempt, setAttempt] = useState(0);
  const [draft, setDraft] = useState<AlumniDraft>({ name: "", yearOfPassing: "", phone: "", email: "", size: "" });
  const [previewName, setPreviewName] = useState<string | null>(null);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    void readAlumniProfile(userId, controller.signal).then((result) => {
      if (!controller.signal.aborted) setProfile(result);
    });
    return () => controller.abort();
  }, [userId, attempt]);

  const savedName = profile.status === "ready" ? profile.profile.full_name || "" : "";
  const savedPhone = profile.status === "ready" ? profile.profile.phone || "" : "";
  const savedEmail = user?.email || "";
  const loading = authLoading || profile.status === "loading";
  const update = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.currentTarget;
    setDraft((current) => ({ ...current, [name]: value }));
  };
  const retry = () => { setProfile({ status: "loading" }); setAttempt((current) => current + 1); };

  return <>
    <div className={styles.registrationScroll}>
      <span className={`${styles.scrollRod} ${styles.rodTop}`} data-scroll-rod="top" aria-hidden="true" />
      <section className={`parchment-sheet ${styles.registrationPaper}`} data-parchment aria-labelledby="alumni-desk-title">
        <div className={styles.paperContent} data-parchment-content>
          <div className={styles.folio}><span><Feather size={13} /> THE REGISTRATION PARCHMENT</span><span>II / XXVII</span></div>
          <div className={styles.formHeading}><div><p className={styles.letterKicker}>Write the next chapter</p><h2 id="alumni-desk-title">Leave your <em>mark.</em></h2></div><ScrollText size={32} strokeWidth={1} aria-hidden="true" /></div>
          <p id="alumni-preview-description" className={styles.formIntro}>A place for familiar names and new memories. Preview your details below; this parchment is not yet open for submissions.</p>
          <div className={styles.profileMessage} role="status">
            {loading ? <><ShieldCheck size={15} /><span>Reading your account’s profile ledger…</span></> : profile.status === "ready" ? <><Check size={15} /><span>Saved name and contact details are read-only. Signing in does not confirm alumni registration.</span></> : profile.status === "unavailable" ? <><BookOpen size={15} /><span>Your saved profile could not be read. Your account has not been changed.</span><button type="button" onClick={retry}><RotateCcw size={13} />Retry profile</button></> : profile.status === "missing" ? <><BookOpen size={15} /><span>No saved profile was found. Any details entered here remain an unsaved preview.</span></> : <><LockKeyhole size={15} /><span>Sign in to read your saved profile, or explore the unsaved preview.</span></>}
          </div>
          <form aria-label="Alumni registration preview" aria-describedby="alumni-preview-description alumni-integration-notice" aria-busy={loading} onSubmit={(event) => event.preventDefault()}>
            <div className={styles.fields}>
              <div className={`${styles.field} ${styles.fullField}`}>
                <div className={styles.fieldLabel}><label htmlFor="alumni-name">Full Name</label>{savedName && <small><LockKeyhole size={10} />Profile record</small>}</div>
                <input id="alumni-name" name="name" autoComplete="name" placeholder="As you would sign a letter" value={savedName || draft.name} onChange={update} readOnly={Boolean(savedName)} disabled={loading} required />
              </div>
              <div className={styles.field}>
                <div className={styles.fieldLabel}><label htmlFor="alumni-year">Year of Graduation</label></div>
                <input id="alumni-year" name="yearOfPassing" type="text" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="off" placeholder="Your graduating year" title="Enter a four-digit year" value={draft.yearOfPassing} onChange={update} disabled={loading} required />
              </div>
              <div className={styles.field}>
                <div className={styles.fieldLabel}><label htmlFor="alumni-phone">Contact Number</label>{savedPhone && <small><LockKeyhole size={10} />Profile</small>}</div>
                <input id="alumni-phone" name="phone" type="tel" autoComplete="tel" placeholder="Your contact number" value={savedPhone || draft.phone} onChange={update} readOnly={Boolean(savedPhone)} disabled={loading} required />
              </div>
              <div className={`${styles.field} ${styles.fullField}`}>
                <div className={styles.fieldLabel}><label htmlFor="alumni-email">Email Address</label>{savedEmail && <small><LockKeyhole size={10} />Account record</small>}</div>
                <input id="alumni-email" name="email" type="email" autoComplete="email" placeholder="For future owl post" value={savedEmail || draft.email} onChange={update} readOnly={Boolean(savedEmail)} disabled={loading} required />
              </div>
              <div className={`${styles.field} ${styles.fullField}`}>
                <div className={styles.fieldLabel}><label htmlFor="alumni-size">Merchandise Size</label></div>
                <select id="alumni-size" name="size" value={draft.size} onChange={update} disabled={loading} aria-describedby="alumni-size-note">
                  <option value="">Choose your size</option>
                  {alumniIntegrations.merchandise.sizes.map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
                <p id="alumni-size-note" className={styles.fieldHint}>{alumniIntegrations.merchandise.message}</p>
              </div>
            </div>
            <button className={styles.waxButton} type="submit" disabled aria-describedby="alumni-integration-notice"><WaxSeal small /><span>SEAL MY REGISTRATION</span><LockKeyhole size={15} aria-hidden="true" /></button>
          </form>
          <div id="alumni-integration-notice" className={styles.integrationNotice}><LockKeyhole size={14} aria-hidden="true" /><div><p>{alumniIntegrations.registration.message}</p><p>{alumniIntegrations.payment.message}</p></div></div>
          <button type="button" className={styles.previewButton} onClick={() => setPreviewName(savedName || draft.name.trim() || "old friend")} disabled={loading}><ScrollText size={15} />Preview acceptance letter<ArrowUpRight size={14} /></button>
          <p className={styles.privacyNote}>A preview only. No details are stored in your browser or sent to a registry.</p>
        </div>
      </section>
      <span className={`${styles.scrollRod} ${styles.rodBottom}`} data-scroll-rod="bottom" aria-hidden="true" />
    </div>
    <LetterPreview name={previewName} onClose={() => setPreviewName(null)} />
  </>;
}

export function AlumniRegistry() {
  const { user, loading } = useAuth();
  const { enabled, ready } = useMagic();
  const router = useRouter();
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [authFeedback, setAuthFeedback] = useState("");

  useLayoutEffect(() => {
    if (!root.current || !ready) return;
    const node = root.current;
    let entrance: gsap.core.Timeline | undefined;
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      media.add({ motion: "(prefers-reduced-motion: no-preference)", reduced: "(prefers-reduced-motion: reduce)" }, (match) => {
        if (!match.conditions?.motion || !enabled) { node.dataset.stage = "still"; return; }
        node.dataset.stage = "unfolding";
        entrance = gsap.timeline({ defaults: { ease: "power3.out" }, onComplete: () => { node.dataset.stage = "open"; } });
        entrance.fromTo(node.querySelectorAll("[data-intro]"), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .8, stagger: .1 }, 0)
          .fromTo(node.querySelectorAll("[data-parchment]"), { scaleY: .12, rotationX: 14, opacity: .35 }, { scaleY: 1, rotationX: 0, opacity: 1, duration: 1.7, stagger: .2, clearProps: "transform" }, .3)
          .fromTo(node.querySelectorAll("[data-parchment-content]"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: .8, stagger: .15, clearProps: "transform" }, 1.5);
        node.querySelectorAll<HTMLElement>("[data-scroll-rod]").forEach((rod) => {
          const distance = (rod.parentElement?.offsetHeight || 0) / 2 - 14;
          entrance?.fromTo(rod, { y: rod.dataset.scrollRod === "top" ? distance : -distance }, { y: 0, duration: 1.9, clearProps: "transform" }, .3);
        });
        return () => { entrance?.kill(); node.dataset.stage = "still"; };
      });
    }, node);
    const visibility = () => {
      node.dataset.hidden = String(document.hidden);
      if (document.hidden) entrance?.pause(); else entrance?.resume();
    };
    // Keyboard/pointer interaction immediately completes the decorative entrance.
    const skipEntrance = () => { if (entrance?.isActive()) entrance.progress(1); };
    visibility();
    document.addEventListener("visibilitychange", visibility);
    node.addEventListener("focusin", skipEntrance);
    node.addEventListener("pointerdown", skipEntrance);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      node.removeEventListener("focusin", skipEntrance);
      node.removeEventListener("pointerdown", skipEntrance);
      media.revert(); context.revert();
    };
  }, [enabled, ready]);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true); setAuthFeedback("");
    try {
      const client = getSupabase();
      if (!client) throw new Error("The account service is unavailable. Please try again.");
      const { error } = await client.auth.signOut();
      if (error) throw error;
      router.refresh();
    } catch (error) {
      setAuthFeedback(error instanceof Error ? error.message : "Could not sign out. Please try again.");
    } finally { setSigningOut(false); }
  };

  return <div ref={root} className={styles.chamber} data-testid="alumni-registry" data-stage="still" data-paused={paused}>
    <div className={styles.backdrop} aria-hidden="true"><Image src="/images/great-hall-1.webp" fill sizes="100vw" alt="" priority /><div className={styles.archLines} /><AmbientParticles count={16} /><Candle className={styles.wallCandleLeft} /><Candle className={styles.wallCandleRight} /></div>
    <div className="shell">
      <header className={`inner-hero ${styles.hero}`}>
        <div className={styles.heroCrest} data-intro><Image src="/images/crest.webp" width={78} height={78} alt="" priority /></div>
        <p className={styles.heroKicker} data-intro>TECHNIKA ’27 · BIT PATNA · ALUMNI AFFAIRS</p>
        <h1 data-intro><span>The Alumni</span> <em>Registry</em></h1>
        <p className={styles.heroCopy} data-intro>Some chapters end. The magic never does.<br />Welcome back to the halls that remember you.</p>
        <div className={styles.heroStatus} data-intro><SoonBadge>Alumni registry preview — connect official registry when available</SoonBadge><button type="button" className={styles.ambienceControl} aria-label={paused ? "Resume chamber ambience" : "Pause chamber ambience"} aria-pressed={paused} onClick={() => setPaused((value) => !value)}>{paused ? <Play size={12} /> : <Pause size={12} />}{paused ? "Resume ambience" : "Pause ambience"}</button></div>
      </header>
      <div className={styles.toolbar}>
        <Link href="/" className={styles.returnLink}><ArrowLeft size={13} />Return to the castle</Link>
        <span className={styles.volume}>THE HALL OF LEGACIES <i>✦</i> VOLUME XXVII</span>
        <div className={styles.accountActions}>{loading ? <span role="status">Reading your castle key…</span> : user ? <><span className={styles.signedIn}><ShieldCheck size={13} />Signed in</span><button type="button" onClick={signOut} disabled={signingOut}><LogOut size={13} />{signingOut ? "Signing out…" : "Sign out"}</button></> : <Link href="/login"><LockKeyhole size={13} />Sign in</Link>}</div>
      </div>
      {authFeedback && <p className={styles.authFeedback} role="status">{authFeedback}</p>}
      <div className={styles.desk}>
        <div className={styles.deskGrid}>
          <div className={styles.welcomeStack}>
            <div className={styles.welcomeFrame}>
              <article className={`parchment-sheet ${styles.welcomePaper}`} data-parchment>
                <div className={styles.paperContent} data-parchment-content>
                  <div className={styles.folio}><span>BY OWL POST · FOR OLD FRIENDS</span><span>I / XXVII</span></div>
                  <span className={styles.letterStar} aria-hidden="true">✧</span>
                  <p className={styles.letterKicker}>A letter from your alma mater</p>
                  <h2>A place in these halls.<br /><em>Always yours.</em></h2>
                  <p className={styles.salutation}>Dear old friend,</p>
                  <p>These halls remember. The late nights, the first spark of an idea, the people who turned a place into a home. A little of your magic never left.</p>
                  <p>As Technika ’27 opens a new chapter, we invite you to return to the story. Reconnect with familiar faces. Bring your memories. Make a few more.</p>
                  <blockquote><span>“Once part of the story.</span><em>Always part of the magic.”</em></blockquote>
                  <div className={styles.signoff}><div><span>With fond memories,</span><strong>Technika ’27</strong><small>The alumni chapter · BIT Patna</small></div><WaxSeal /></div>
                  <Divider />
                  <Link href="#memories" className={styles.pensieveLink}><BookOpen size={15} />Open the Pensieve<ArrowDown size={14} /></Link>
                  <span className="coffee-ring" aria-hidden="true" />
                </div>
              </article>
              <Candle className={styles.deskCandle} />
            </div>
            <div className={styles.calendarNote}><p>Until our paths cross again</p><Countdown compact /></div>
          </div>
          {/* Keying the whole private draft/letter scope clears it on sign-out or account change. */}
          <RegistrationParchment key={user?.id || "guest"} user={user} authLoading={loading} />
        </div>
        <p className={styles.deskFootnote}><Feather size={12} />No spell can hurry a good reunion. The official details will be published here.</p>
      </div>
    </div>
  </div>;
}
