"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Compass,
  MapPin,
  Sparkles,
  TrainFront,
  Trophy,
  Users,
} from "lucide-react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { houseLogoFor } from "@/lib/houses";
import { useHouse } from "./house-provider";
import { Eyebrow } from "./ornaments";
import { Reveal } from "./reveal";

function useJourneyMotion(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const section = ref.current;
    if (!section) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const context = gsap.context(() => {
      const castle = section.querySelector<HTMLElement>(".journey-castle-layer");
      const ridge = section.querySelector<HTMLElement>(".journey-ridge-layer");
      const station = section.querySelector<HTMLElement>(".journey-station-layer");
      const steam = section.querySelector<HTMLElement>(".journey-steam");
      const castleCopy = section.querySelector<HTMLElement>(".journey-copy-castle");
      const stationCopy = section.querySelector<HTMLElement>(".journey-copy-station");
      const glow = section.querySelector<HTMLElement>(".journey-gold-glow");

      if (!castle || !ridge || !station || !steam || !castleCopy || !stationCopy || !glow) {
        return;
      }

      if (reducedMotion.matches) {
        gsap.set(castle, { opacity: 0.48, scale: 1.04, y: -24 });
        gsap.set(ridge, { opacity: 0.25, y: -12 });
        gsap.set(station, { opacity: 1, scale: 1, y: 0 });
        gsap.set(steam, { opacity: 0.75, y: -20 });
        gsap.set(castleCopy, { opacity: 1, y: 0 });
        gsap.set(stationCopy, { opacity: 1, y: 0 });
        gsap.set(glow, { opacity: 1 });
        return;
      }

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 1.15,
          invalidateOnRefresh: true,
        },
      });

      timeline
        .fromTo(
          castle,
          { opacity: 1, scale: 1, y: 0 },
          { opacity: 0.08, scale: 1.18, y: -78, duration: 1, ease: "none" },
          0,
        )
        .fromTo(
          ridge,
          { opacity: 0.72, y: 0 },
          { opacity: 0.14, y: -48, duration: 1, ease: "none" },
          0,
        )
        .fromTo(
          station,
          { opacity: 0, scale: 1.16, y: 92 },
          { opacity: 1, scale: 1, y: 0, duration: 1, ease: "none" },
          0.22,
        )
        .fromTo(
          steam,
          { opacity: 0, y: 50 },
          { opacity: 0.9, y: -42, duration: 1, ease: "none" },
          0.38,
        )
        .fromTo(
          castleCopy,
          { opacity: 1, y: 0 },
          { opacity: 0, y: -42, duration: 0.36, ease: "none" },
          0.12,
        )
        .fromTo(
          stationCopy,
          { opacity: 0, y: 38 },
          { opacity: 1, y: 0, duration: 0.4, ease: "none" },
          0.38,
        )
        .fromTo(
          glow,
          { opacity: 0.2 },
          { opacity: 1, duration: 1, ease: "none" },
          0.5,
        );

      ScrollTrigger.refresh();
    }, section);

    return () => context.revert();
  }, [ref]);
}

function StationArt() {
  return (
    <div className="station-art" aria-hidden="true">
      <div className="station-arch station-arch-one">
        <span />
      </div>
      <div className="station-arch station-arch-two">
        <span />
      </div>
      <div className="station-sign">
        <small>PLATFORM</small>
        <strong>9¾</strong>
        <span>THE NEXT CHAPTER</span>
      </div>
      <div className="station-lamp station-lamp-one">
        <i />
      </div>
      <div className="station-lamp station-lamp-two">
        <i />
      </div>
      <div className="station-tracks">
        <span />
        <span />
      </div>
      <div className="journey-steam">
        <i />
        <i />
        <i />
        <i />
      </div>
    </div>
  );
}

export function WizardingJourney() {
  const ref = useRef<HTMLElement>(null);
  const { house, theme } = useHouse();
  useJourneyMotion(ref);

  return (
    <section ref={ref} className="journey-section !bg-transparent" aria-labelledby="journey-title" id="journey">
      <div className="journey-sticky !bg-transparent">
        <div className="journey-visual !bg-transparent" aria-hidden="true">
          <div className="journey-sky-layer !bg-transparent" />
          <div className="journey-ridge-layer !opacity-30" />
          <div className="journey-castle-layer !bg-transparent" />
          <div className="journey-station-layer !bg-transparent" />
          <div className="journey-gold-glow" />
          <div className="journey-grain" />
        </div>

        <div className="journey-copy-shell shell">
          <div className="journey-copy journey-copy-castle">
            <span className="journey-index">01 / THE CASTLE</span>
            <h2 id="journey-title">
              One night.<br />
              <em>Infinite possibility.</em>
            </h2>
            <p>
              Follow the lanterns into Technika — a three-day chapter where bold
              makers, dreamers, and problem-solvers gather under one enchanted sky.
            </p>
            <span className="journey-location">
              <MapPin size={13} /> BIT PATNA · INDIA
            </span>
          </div>

          <div className="journey-copy journey-copy-station">
            <span className="journey-index">02 / THE DEPARTURE</span>
            <h2>
              Catch the train<br />
              <em>to what&apos;s next.</em>
            </h2>
            <p>
              At Platform 9¾, ideas leave the station faster than midnight steam.
              Choose your house, board your track, and make something worth remembering.
            </p>
            <div className="journey-signal">
              <Image src={houseLogoFor(house)} width={38} height={38} alt="" />
              <span>
                <b>{theme.name}</b>
                <small>{theme.motto}</small>
              </span>
            </div>
            <Link href="/registrations" className="button button-gold">
              Board the journey <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>

        <div className="journey-scroll-note">
          <span>Scroll to travel</span>
          <ArrowDown size={14} />
        </div>
      </div>
    </section>
  );
}

export function WizardingManifesto() {
  const { house, theme } = useHouse();

  return (
    <section id="about" className="section wizarding-manifesto !bg-transparent">
      <div className="shell">
        <Reveal className="manifesto-grid">
          <div className="manifesto-portrait">
            <Image
              src="/images/hogwarts.jpg"
              fill
              sizes="(max-width: 900px) 100vw, 48vw"
              alt="Hogwarts-inspired castle at night"
            />
            <div className="manifesto-portrait-shade" />
            <div className="manifesto-seal">
              <Image src={houseLogoFor(house)} width={64} height={64} alt="" />
              <span>{theme.initial} · 27</span>
            </div>
            <span className="manifesto-caption">THE TECHNIKA CHRONICLE · VOL. XVI</span>
          </div>

          <div className="manifesto-copy">
            <Eyebrow>Innovation in motion</Eyebrow>
            <h2>
              A festival built<br />
              <em>like a spell.</em>
            </h2>
            <p className="manifesto-lead">
              Technika is where engineering meets imagination — a living common
              room for curious minds, daring experiments, and ideas that refuse to stay small.
            </p>
            <p>
              From code to culture, every event is designed to turn spectators into
              collaborators. Bring your questions, your half-finished prototypes,
              and the nerve to make something that did not exist yesterday.
            </p>
            <div className="manifesto-stats">
              <span>
                <Trophy size={17} />
                <b>30+<small>events</small></b>
              </span>
              <span>
                <Users size={17} />
                <b>1000+<small>participants</small></b>
              </span>
              <span>
                <Compass size={17} />
                <b>01<small>shared world</small></b>
              </span>
            </div>
            <Link href="/events" className="text-link">
              Explore the event registry <ArrowUpRight size={16} />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const dispatches = [
  {
    number: "A",
    title: "The makers' hall",
    copy: "Robotics, code, hardware, and the beautiful chaos of building something from first principles.",
    icon: BookOpen,
  },
  {
    number: "B",
    title: "The night train",
    copy: "Late-night ideas, new collaborators, and a route that keeps moving long after the timetable ends.",
    icon: TrainFront,
  },
  {
    number: "C",
    title: "The great gathering",
    copy: "A shared campus, a generous crowd, and a festival where every house gets a seat at the table.",
    icon: Sparkles,
  },
];

export function WizardingCampus() {
  return (
    <section id="campus" className="section wizarding-campus !bg-transparent">
      <div className="shell">
        <Reveal className="chapter-heading">
          <div>
            <Eyebrow>The BIT Patna chapter</Eyebrow>
            <h2>Every corridor<br /><em>leads somewhere.</em></h2>
          </div>
          <p>
            A campus made for detours, discoveries, and the kind of conversations
            that turn a weekend into a story you keep retelling.
          </p>
        </Reveal>

        <div className="dispatch-grid">
          {dispatches.map(({ number, title, copy, icon: Icon }, index) => (
            <Reveal key={number} delay={index * 0.08} className="dispatch-card">
              <span className="dispatch-number">0{number === "A" ? 1 : number === "B" ? 2 : 3}</span>
              <Icon size={22} strokeWidth={1.2} />
              <h3>{title}</h3>
              <p>{copy}</p>
              <span className="dispatch-rule" />
              <small>BIT PATNA · 800014</small>
            </Reveal>
          ))}
        </div>

        <Reveal className="campus-ticket">
          <div className="ticket-brand">
            <span className="ticket-mark">T</span>
            <span>
              <b>TECHNIKA 2K26</b>
              <small>BIT PATNA CHAPTER</small>
            </span>
          </div>
          <div className="ticket-route">
            <span>BIT PATNA</span>
            <i />
            <TrainFront size={18} />
            <i />
            <span>THE NEXT IDEA</span>
          </div>
          <Link href="/contact" className="button button-glass">
            Send an owl <ArrowUpRight size={15} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

const partners = ["GAIL", "PANIKA", "tiqr event", "ADBARK THREADS", "unique PATNA", "Jio Saavn"];

export function WizardingSponsors() {
  return (
    <section id="sponsors" className="section wizarding-sponsors !bg-transparent">
      <div className="shell">
        <Reveal className="sponsors-heading">
          <div>
            <Eyebrow>The coalition</Eyebrow>
            <h2>Great things are<br /><em>never solo magic.</em></h2>
          </div>
          <p>
            The partners, mentors, and believers helping Technika turn a bold idea
            into a room full of possibility.
          </p>
        </Reveal>

        <Reveal className="partner-ledger">
          {partners.map((partner, index) => (
            <span className="partner-ledger-row" key={partner}>
              <small>0{index + 1}</small>
              <b>{partner}</b>
              <i>Official partner</i>
              <ArrowUpRight size={15} />
            </span>
          ))}
        </Reveal>

        <Reveal className="sponsors-cta">
          <div>
            <span className="sponsors-cta-kicker">Build the next chapter</span>
            <h3>Bring your name to the platform.</h3>
            <p>Partnerships, ideas, and a little bit of beautifully organised chaos.</p>
          </div>
          <Link href="/contact" className="button button-gold">
            Become a partner <ArrowRight size={16} />
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export function WizardingInvitation() {
  return (
    <section className="section wizarding-invitation !bg-transparent">
      <Reveal className="invitation-card">
        <div className="invitation-orbit invitation-orbit-one" />
        <div className="invitation-orbit invitation-orbit-two" />
        <Sparkles className="invitation-spark invitation-spark-one" size={18} />
        <Sparkles className="invitation-spark invitation-spark-two" size={13} />
        <span className="invitation-mark">✦</span>
        <Eyebrow>The gates are open</Eyebrow>
        <h2>Bring the idea<br /><em>you can&apos;t stop thinking about.</em></h2>
        <p>Three days. One shared world. A thousand ways to begin.</p>
        <div className="invitation-actions">
          <Link href="/registrations" className="button button-gold">
            Register now <ArrowUpRight size={16} />
          </Link>
          <span className="invitation-date"><CalendarDays size={12} /> 16 — 18 JANUARY 2026 · BIT PATNA</span>
        </div>
      </Reveal>
    </section>
  );
}
