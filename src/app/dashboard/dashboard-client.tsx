"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Compass,
  Copy,
  Check,
  Flame,
  Leaf,
  Bird,
  Sun,
  GraduationCap,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  ExternalLink,
  Layers,
  Palette,
} from "lucide-react";
import { useHouse } from "@/components/house-provider";
import { HouseCrest } from "@/components/house-crest";
import {
  houseThemes,
  selectableHouses,
  houseFromValue,
  themeAttributeForHouse,
  houseLogoFor,
  type House,
} from "@/lib/houses";
import { saveHousePreference } from "@/lib/house-preference";
import LogoutButton from "./logout-button";

interface DashboardProfile {
  full_name: string | null;
  college: string | null;
  phone: string | null;
  house: string | null;
  created_at?: string | null;
}

interface DashboardClientProps {
  userId: string;
  email: string;
  profile: DashboardProfile;
  createdAt?: string | null;
}

const houseSymbols = {
  gryffindor: Flame,
  slytherin: Leaf,
  ravenclaw: Bird,
  hufflepuff: Sun,
};

const houseMascots: Record<
  Exclude<House, "default">,
  { mascot: string; element: string }
> = {
  gryffindor: { mascot: "Lion", element: "Fire" },
  slytherin: { mascot: "Serpent", element: "Water" },
  ravenclaw: { mascot: "Eagle", element: "Air" },
  hufflepuff: { mascot: "Badger", element: "Earth" },
};

const actionCards = [
  {
    href: "/registrations",
    label: "Festival Chambers",
    detail:
      "Explore hackathons, robotics arenas, cultural shows, and registrations.",
    badge: "Four Tracks",
    Icon: CalendarDays,
  },
  {
    href: "/marauders-map",
    label: "The Marauder's Map",
    detail:
      "Interactive campus grounds, chamber routes, and live event discovery.",
    badge: "Campus Explorer",
    Icon: Compass,
  },
  {
    href: "/account",
    label: "Common Room",
    detail:
      "Enter your private house chamber, read founder letters, and view house records.",
    badge: "House Quarters",
    Icon: BookOpen,
  },
  {
    href: "/accommodation",
    label: "Guest Quarters",
    detail:
      "Festival passes, guest accommodation guidance, and travel directions.",
    badge: "Stay & Passes",
    Icon: ShieldCheck,
  },
];

export default function DashboardClient({
  userId,
  email,
  profile,
  createdAt,
}: DashboardClientProps) {
  const { house: contextHouse, setHouse } = useHouse();
  const [copiedId, setCopiedId] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switchFeedback, setSwitchFeedback] = useState<string | null>(null);

  // Active house prioritized from profile or context
  const activeHouse: House =
    houseFromValue(profile.house) || houseFromValue(contextHouse) || "default";
  const theme = houseThemes[activeHouse];

  const displayName = profile.full_name?.trim() || "Wizard";
  const firstName = displayName.split(/\s+/)[0] || "Wizard";

  const handleCopyId = () => {
    navigator.clipboard.writeText(userId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleHouseChange = async (targetHouse: Exclude<House, "default">) => {
    if (switching || targetHouse === activeHouse) return;
    setSwitching(true);
    setSwitchFeedback(null);

    setHouse(targetHouse);

    try {
      const err = await saveHousePreference(userId, targetHouse);
      if (err) {
        setSwitchFeedback(
          "House theme changed locally. Profile sync will retry.",
        );
      } else {
        setSwitchFeedback(
          `${houseThemes[targetHouse].name} is now your active house.`,
        );
      }
    } catch {
      setSwitchFeedback("House theme updated.");
    } finally {
      setSwitching(false);
      setTimeout(() => setSwitchFeedback(null), 3000);
    }
  };

  const registeredDate = createdAt
    ? new Date(createdAt).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Verified Delegate";

  return (
    <main
      className="min-h-screen bg-bg text-fg pt-28 pb-20 px-4 sm:px-6 lg:px-8 transition-colors duration-500"
      data-theme={themeAttributeForHouse(activeHouse)}
      data-house={activeHouse}
    >
      <div className="mx-auto max-w-7xl flex flex-col gap-8">
        {/* =========================================================
            TOP STATUS BAR & BREADCRUMB
           ========================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line-subtle">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-brand-soft text-fg-brand">
              <Sparkles size={14} />
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-fg-brand">
              Command Centre · Technika &apos;27
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-border bg-surface-1 text-xs text-fg-muted">
              <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
              <span>Owls & Server Synchronized</span>
            </div>

            <Link
              href="/account"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-fg-brand border border-brand-border bg-brand-soft hover:bg-brand-soft/80 transition-colors"
            >
              <BookOpen size={13} />
              <span>Common Room</span>
            </Link>
          </div>
        </div>

        {/* =========================================================
            HERO COMMAND CHAMBER BANNER (HOUSE THEMED)
           ========================================================= */}
        <section
          className="relative overflow-hidden rounded-3xl border border-brand-border bg-surface-1 p-6 sm:p-10 lg:p-12 shadow-glow-brand transition-all duration-500"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 85% 15%, color-mix(in oklab, var(--primary-500) 25%, transparent), transparent 60%), linear-gradient(145deg, var(--surface-1), var(--bg))",
          }}
        >
          {/* Subtle Ambient Backdrops */}
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 rounded-full bg-brand-soft blur-3xl opacity-70"
            aria-hidden="true"
          />

          <div className="relative z-10 grid gap-8 lg:grid-cols-12 lg:items-center">
            {/* Left Column: Greeting and Key Actions */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-fg-brand">
                <ShieldCheck size={14} />
                <span>Verified Castle Delegate</span>
              </div>

              <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl leading-tight text-fg-strong tracking-tight">
                Welcome home,
                <br />
                <em className="text-fg-brand italic">{firstName}.</em>
              </h1>

              <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-fg-muted">
                Your Technika command centre is primed for the festival. Follow
                your registered chambers, browse campus quests on the
                Marauder&apos;s Map, and let the virtues of your house guide
                every competition.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3">
                <Link
                  href="/registrations"
                  className="px-6 py-3 rounded-xl font-semibold text-xs sm:text-sm tracking-widest uppercase bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-neutral-950 hover:brightness-110 shadow-lg shadow-amber-500/25 flex items-center gap-2 transition-all duration-300"
                >
                  <span>Explore Events</span>
                  <ArrowUpRight size={16} />
                </Link>

                <Link
                  href="/marauders-map"
                  className="px-5 py-3 rounded-xl font-medium text-xs sm:text-sm tracking-wider uppercase border border-line-brand bg-surface-1/70 text-fg hover:border-brand-border hover:bg-brand-soft transition-all duration-300 flex items-center gap-2"
                >
                  <Compass size={15} className="text-fg-brand" />
                  <span>Open Campus Map</span>
                </Link>
              </div>
            </div>

            {/* Right Column: House Crest & Colours Showcase Card */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="relative rounded-2xl border border-brand-border bg-surface-2/70 backdrop-blur-xl p-6 sm:p-7 shadow-xl flex flex-col gap-5">
                <div className="flex items-center gap-5">
                  {/* House Crest Visual */}
                  <div className="relative flex-shrink-0 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center p-2 rounded-2xl bg-brand-soft border border-brand-border shadow-inner">
                    <Image
                      src={houseLogoFor(activeHouse)}
                      width={80}
                      height={80}
                      alt={theme.name}
                      priority
                      className="object-contain w-full h-full drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                    />
                  </div>

                  {/* House Titles */}
                  <div className="min-w-0 flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fg-subtle">
                      YOUR ASSIGNED HOUSE
                    </span>
                    <h2 className="font-serif text-2xl sm:text-3xl font-bold text-fg-strong truncate">
                      {theme.name}
                    </h2>
                    <p className="text-xs italic text-fg-muted line-clamp-1">
                      {theme.motto}
                    </p>
                  </div>
                </div>

                {/* House Badges & Virtues */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-line-subtle text-xs">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg/40 border border-line-subtle">
                    <span className="text-fg-brand font-semibold">
                      Element:
                    </span>
                    <span className="text-fg-strong capitalize">
                      {activeHouse !== "default"
                        ? houseMascots[activeHouse].element
                        : "Magic"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg/40 border border-line-subtle">
                    <span className="text-fg-brand font-semibold">Mascot:</span>
                    <span className="text-fg-strong capitalize">
                      {activeHouse !== "default"
                        ? houseMascots[activeHouse].mascot
                        : "Crest"}
                    </span>
                  </div>
                </div>

                {/* Quality Tagline */}
                <div className="flex items-center gap-2 text-xs text-fg-muted pt-1">
                  <CheckCircle2
                    size={15}
                    className="text-fg-brand flex-shrink-0"
                  />
                  <span className="truncate">{theme.quality}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================
            PROFILE DETAILS & CREDENTIALS LEDGER
           ========================================================= */}
        <section className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Official Profile Ledger */}
          <article className="lg:col-span-7 rounded-3xl border border-line bg-surface-1 p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-md">
            <div>
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-line-subtle">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fg-brand">
                    OFFICIAL STUDENT LEDGER
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl text-fg-strong">
                    Personal Details & Credentials
                  </h2>
                </div>

                <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center text-fg-brand">
                  <User size={18} />
                </div>
              </div>

              {/* Data List Grid */}
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 mt-6">
                {/* Full Name */}
                <div className="flex flex-col gap-1 p-3.5 rounded-2xl bg-bg/40 border border-line-subtle">
                  <span className="text-[10px] uppercase tracking-wider text-fg-subtle flex items-center gap-1.5 font-medium">
                    <User size={12} className="text-fg-brand" /> Full Name
                  </span>
                  <span className="text-sm sm:text-base font-semibold text-fg-strong">
                    {profile.full_name || "Wizard Delegate"}
                  </span>
                </div>

                {/* Email Address */}
                <div className="flex flex-col gap-1 p-3.5 rounded-2xl bg-bg/40 border border-line-subtle">
                  <span className="text-[10px] uppercase tracking-wider text-fg-subtle flex items-center gap-1.5 font-medium">
                    <Mail size={12} className="text-fg-brand" /> Owl-Post Email
                  </span>
                  <span
                    className="text-sm font-semibold text-fg-strong truncate"
                    title={email}
                  >
                    {email}
                  </span>
                </div>

                {/* College / Institution */}
                <div className="flex flex-col gap-1 p-3.5 rounded-2xl bg-bg/40 border border-line-subtle">
                  <span className="text-[10px] uppercase tracking-wider text-fg-subtle flex items-center gap-1.5 font-medium">
                    <GraduationCap size={12} className="text-fg-brand" />{" "}
                    Institution / College
                  </span>
                  <span className="text-sm font-semibold text-fg-strong">
                    {profile.college || "Birla Institute of Technology, Patna"}
                  </span>
                </div>

                {/* Phone */}
                <div className="flex flex-col gap-1 p-3.5 rounded-2xl bg-bg/40 border border-line-subtle">
                  <span className="text-[10px] uppercase tracking-wider text-fg-subtle flex items-center gap-1.5 font-medium">
                    <Phone size={12} className="text-fg-brand" /> Secure
                    Dispatch Phone
                  </span>
                  <span className="text-sm font-semibold text-fg-strong">
                    {profile.phone || "Not recorded yet"}
                  </span>
                </div>

                {/* House Affiliation */}
                <div className="flex flex-col gap-1 p-3.5 rounded-2xl bg-bg/40 border border-line-subtle">
                  <span className="text-[10px] uppercase tracking-wider text-fg-subtle flex items-center gap-1.5 font-medium">
                    <ShieldCheck size={12} className="text-fg-brand" /> House
                    Affiliation
                  </span>
                  <span className="text-sm font-semibold text-fg-strong capitalize flex items-center gap-2">
                    {theme.name}
                    {activeHouse !== "default" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-brand-soft text-fg-brand font-mono">
                        {theme.initial}
                      </span>
                    )}
                  </span>
                </div>

                {/* Registration Date */}
                <div className="flex flex-col gap-1 p-3.5 rounded-2xl bg-bg/40 border border-line-subtle">
                  <span className="text-[10px] uppercase tracking-wider text-fg-subtle flex items-center gap-1.5 font-medium">
                    <CalendarDays size={12} className="text-fg-brand" />{" "}
                    Enrolled Since
                  </span>
                  <span className="text-sm font-semibold text-fg-strong">
                    {registeredDate}
                  </span>
                </div>
              </div>
            </div>

            {/* Truncated Delegate ID & Copy Tool */}
            <div className="p-3.5 rounded-2xl bg-brand-soft/50 border border-brand-border flex items-center justify-between gap-4 text-xs">
              <div className="min-w-0">
                <span className="text-[10px] uppercase tracking-widest text-fg-subtle block">
                  Delegate Cipher / UUID
                </span>
                <span
                  className="font-mono text-fg-strong truncate block"
                  title={userId}
                >
                  {userId}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCopyId}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-1 border border-brand-border hover:bg-surface-2 text-fg-brand font-medium text-xs transition-colors flex-shrink-0 cursor-pointer"
              >
                {copiedId ? (
                  <>
                    <Check size={14} className="text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </article>

          {/* Right Column: House Customizer (The Sorting Mirror) */}
          <article className="lg:col-span-5 rounded-3xl border border-line bg-surface-1 p-6 sm:p-8 flex flex-col justify-between gap-6 shadow-md">
            <div>
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-line-subtle">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fg-brand">
                    THE SORTING MIRROR
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl text-fg-strong">
                    Equip House Theme
                  </h2>
                </div>

                <div className="w-10 h-10 rounded-full bg-brand-soft flex items-center justify-center text-fg-brand">
                  <Palette size={18} />
                </div>
              </div>

              <p className="text-xs leading-relaxed text-fg-muted mt-4">
                Switch your active house to immerse the entire dashboard and
                navigation bar in that founder&apos;s colors. Your selection is
                automatically synced with your profile.
              </p>

              {/* Four Houses Selection Grid */}
              <div className="grid grid-cols-2 gap-3 mt-5">
                {selectableHouses.map((h) => {
                  const hTheme = houseThemes[h];
                  const Icon = houseSymbols[h];
                  const isSelected = activeHouse === h;

                  return (
                    <button
                      type="button"
                      key={h}
                      onClick={() => handleHouseChange(h)}
                      disabled={switching}
                      className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border text-center transition-all duration-300 cursor-pointer ${
                        isSelected
                          ? "border-brand bg-brand-soft shadow-lg shadow-brand/10 scale-[1.02]"
                          : "border-line-subtle bg-bg/50 hover:border-brand/40 hover:bg-surface-2/60 text-fg-muted"
                      }`}
                    >
                      {/* Active Indicator Pin */}
                      {isSelected && (
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-brand shadow-[0_0_6px_var(--brand)]" />
                      )}

                      <div className="w-10 h-10 rounded-xl bg-surface-1 flex items-center justify-center text-fg-brand">
                        <Icon size={20} />
                      </div>

                      <div className="flex flex-col">
                        <span className="font-serif text-sm font-bold text-fg-strong">
                          {hTheme.name}
                        </span>
                        <span className="text-[10px] text-fg-subtle line-clamp-1">
                          {hTheme.quality.split("·")[0]}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {switchFeedback && (
                <p className="mt-3 text-xs text-center text-fg-brand font-medium animate-fade-in">
                  ✦ {switchFeedback}
                </p>
              )}
            </div>

            <div className="p-4 rounded-2xl bg-bg/40 border border-line-subtle flex items-center justify-between text-xs text-fg-muted">
              <span>Looking for ceremony preview?</span>
              <Link
                href="/sorting"
                className="font-semibold text-fg-brand hover:underline flex items-center gap-1"
              >
                Sorting Ceremony <ArrowUpRight size={13} />
              </Link>
            </div>
          </article>
        </section>

        {/* =========================================================
            CHAMBER PASSAGES & FESTIVAL SHORTCUTS (ACTION CARDS)
           ========================================================= */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fg-brand">
                THE GRAND DIRECTORY
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-fg-strong">
                Festival Passages & Quests
              </h2>
            </div>

            <span className="hidden sm:block text-xs text-fg-subtle">
              Direct portals to official chambers
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {actionCards.map(({ href, label, detail, badge, Icon }) => (
              <Link
                key={href}
                href={href}
                className="group relative flex flex-col justify-between p-6 rounded-3xl border border-line bg-surface-1 hover:border-brand-border hover:bg-brand-soft hover:shadow-glow-brand transition-all duration-300"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="w-10 h-10 rounded-2xl bg-brand-soft border border-brand-border text-fg-brand flex items-center justify-center">
                      <Icon size={18} />
                    </span>

                    <span className="text-[9px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full bg-bg/60 border border-line-subtle text-fg-subtle">
                      {badge}
                    </span>
                  </div>

                  <h3 className="font-serif text-lg font-bold text-fg-strong group-hover:text-fg-brand transition-colors">
                    {label}
                  </h3>

                  <p className="text-xs leading-relaxed text-fg-muted">
                    {detail}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-line-subtle text-xs font-semibold text-fg-brand">
                  <span>Enter Chamber</span>
                  <ArrowUpRight
                    size={16}
                    className="transform transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* =========================================================
            BOTTOM CASTLE FOOTER & LOGOUT
           ========================================================= */}
        <section className="rounded-3xl border border-brand-border bg-gradient-to-r from-surface-1 via-brand-soft to-surface-1 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-brand-soft border border-brand-border items-center justify-center text-fg-brand">
              <Sparkles size={22} />
            </div>

            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-fg-brand block">
                A NOTE FROM THE CASTLE
              </span>
              <p className="font-serif text-xl sm:text-2xl text-fg-strong mt-0.5">
                &ldquo;{theme.motto}&rdquo;
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl text-xs font-medium border border-line-brand bg-surface-1 text-fg hover:border-brand-border hover:bg-brand-soft transition-colors"
            >
              Return Home
            </Link>

            <LogoutButton />
          </div>
        </section>
      </div>
    </main>
  );
}
