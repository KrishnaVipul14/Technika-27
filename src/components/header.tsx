"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  LayoutDashboard,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { navigation } from "@/lib/festival";
import { houseLogoFor } from "@/lib/houses";
import { useAuth } from "./auth-provider";
import { useHouse } from "./house-provider";
import { useMagic } from "./experience";

/**
 * 3-Book Hamburger icon from Harry Potter:
 * Three ancient tomes stacked horizontally.
 * When open: the top book slides right, tips over, and falls to rest
 * at an incline leaning against the middle book.
 * When closed: the top book smoothly glides back up and re-settles.
 */
function BookBurger({
  isOpen,
  onClick,
}: {
  isOpen: boolean;
  onClick: () => void;
}) {
  const [hasInteracted, setHasInteracted] = useState(false);

  const handleClick = () => {
    setHasInteracted(true);
    onClick();
  };

  const animState = !hasInteracted ? "idle" : isOpen ? "open" : "close";

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isOpen ? "Close navigation" : "Open navigation"}
      aria-expanded={isOpen}
      className="relative w-12 h-10 flex items-center justify-center rounded-xl p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 group cursor-pointer"
    >
      <div className="relative w-8 h-7">
        {/* Book 1 (Bottom): Deep Crimson Leather Tome */}
        <span
          className={`absolute left-0 bottom-0 w-8 h-2 rounded-[2px] shadow-sm transition-transform duration-300 ${
            isOpen ? "animate-book-thud" : ""
          }`}
          style={{
            background:
              "linear-gradient(180deg, #5c181f 0%, #3e1014 60%, #26090c 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,215,0,0.25), inset -2px 0 0 rgba(245,230,190,0.5), 0 2px 4px rgba(0,0,0,0.7)",
          }}
        >
          {/* Spine Ribs */}
          <span className="absolute left-1 top-0 bottom-0 w-[1.5px] bg-amber-400/60" />
          <span className="absolute left-2.5 top-0 bottom-0 w-[1px] bg-amber-400/40" />
        </span>

        {/* Book 2 (Middle): Dark Emerald Tome */}
        <span
          className={`absolute left-0.5 bottom-2 w-[30px] h-2 rounded-[2px] shadow-sm transition-transform duration-300 ${
            isOpen ? "animate-book-thud" : ""
          }`}
          style={{
            background:
              "linear-gradient(180deg, #18422a 0%, #0d281a 60%, #06160e 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,215,0,0.2), inset -2px 0 0 rgba(245,230,190,0.5), 0 2px 4px rgba(0,0,0,0.7)",
          }}
        >
          {/* Spine Ribs */}
          <span className="absolute left-1.5 top-0 bottom-0 w-[1.5px] bg-amber-300/60" />
          <span className="absolute left-3 top-0 bottom-0 w-[1px] bg-amber-300/40" />
        </span>

        {/* Book 3 (Top): Ancient Ochre Spellbook that slides and falls on open */}
        <span
          className={`absolute left-0 bottom-4 w-8 h-2 rounded-[2px] shadow-sm transition-all origin-bottom-left ${
            animState === "open"
              ? "animate-book-fall"
              : animState === "close"
              ? "animate-book-rise"
              : "group-hover:-translate-y-0.5 group-hover:rotate-[-1deg]"
          }`}
          style={{
            background:
              "linear-gradient(180deg, #854d0e 0%, #5e3306 60%, #3a1e02 100%)",
            boxShadow:
              "inset 0 1px 0 rgba(255,235,150,0.35), inset -2px 0 0 rgba(245,230,190,0.6), 0 2px 5px rgba(0,0,0,0.8)",
          }}
        >
          {/* Gold Inscription on Spine */}
          <span className="absolute left-1.5 top-0 bottom-0 w-[2px] bg-amber-300/80" />
          <span className="absolute left-3 top-0 bottom-0 w-[1px] bg-amber-300/50" />
          {/* Red Ribbon Bookmark Bookmark Tail */}
          <span className="absolute -right-1 top-0.5 w-1.5 h-1 bg-red-600/80 rounded-r-xs" />
        </span>
      </div>
    </button>
  );
}

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { user } = useAuth();
  const { house, theme } = useHouse();
  const { ready } = useMagic();

  // Filter central links (dashboard is shown separately in action area if logged in)
  const navItems = navigation.filter((item) => item.href !== "/dashboard");

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleDropdownEnter = (label: string) => {
    if (dropdownTimeout.current) clearTimeout(dropdownTimeout.current);
    setOpenDropdown(label);
  };

  const handleDropdownLeave = () => {
    dropdownTimeout.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 180);
  };

  return (
    <>
      {/* Inline styles for physics-based Harry Potter book hamburger animation */}
      <style>{`
        @keyframes book-fall {
          0% {
            transform: translate(0, 0) rotate(0deg);
          }
          20% {
            transform: translate(-1px, -2px) rotate(-3deg);
          }
          45% {
            transform: translate(10px, 0px) rotate(22deg);
          }
          75% {
            transform: translate(16px, 6px) rotate(76deg);
          }
          100% {
            transform: translate(15px, 5px) rotate(68deg);
          }
        }

        @keyframes book-rise {
          0% {
            transform: translate(15px, 5px) rotate(68deg);
          }
          30% {
            transform: translate(12px, 1px) rotate(40deg);
          }
          65% {
            transform: translate(2px, -2px) rotate(-2deg);
          }
          100% {
            transform: translate(0, 0) rotate(0deg);
          }
        }

        @keyframes book-thud {
          0%, 50% { transform: translateY(0); }
          65% { transform: translateY(1.5px); }
          80% { transform: translateY(-0.5px); }
          100% { transform: translateY(0); }
        }

        .animate-book-fall {
          animation: book-fall 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        .animate-book-rise {
          animation: book-rise 0.55s cubic-bezier(0.25, 1, 0.5, 1) forwards;
        }

        .animate-book-thud {
          animation: book-thud 0.65s ease-out;
        }
      `}</style>

      <header
        className={`fixed inset-x-0 top-3 sm:top-5 z-50 pointer-events-none px-3 sm:px-6 transition-all duration-700 ${
          ready
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4"
        }`}
      >
        <nav
          aria-label="Main Navigation"
          className="pointer-events-auto max-w-7xl mx-auto rounded-2xl sm:rounded-full bg-neutral-950/80 backdrop-blur-2xl border border-amber-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.65)] px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between transition-all duration-300"
        >
          {/* =========================================================
              LOGO ONLY (NO TEXT, NO CIRCLE)
             ========================================================= */}
          <Link
            href="/"
            onClick={() => setOpen(false)}
            aria-label="Home"
            className="group relative flex items-center justify-center p-1 outline-none transition-transform duration-300 hover:scale-105"
          >
            <Image
              src={houseLogoFor(house)}
              width={65}
              height={56}
              alt=""
              priority
              className="h-10 sm:h-12 w-auto object-contain transition-all duration-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] group-hover:drop-shadow-[0_0_14px_rgba(245,158,11,0.55)]"
            />
          </Link>

          {/* =========================================================
              DESKTOP NAVIGATION LINKS (LARGER, GOOD COLORED TEXT)
             ========================================================= */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.children &&
                  item.children.some((child) => pathname === child.href));
              const hasDropdown = Boolean(item.dropdown && item.children);

              return (
                <div
                  key={item.label}
                  className="relative"
                  onMouseEnter={() =>
                    hasDropdown && handleDropdownEnter(item.label)
                  }
                  onMouseLeave={() => hasDropdown && handleDropdownLeave()}
                >
                  <Link
                    href={item.href}
                    className={`relative px-3.5 py-2 text-[15px] font-medium tracking-wide transition-all duration-200 flex items-center gap-1 outline-none ${
                      isActive
                        ? "text-amber-300 font-semibold drop-shadow-[0_0_10px_rgba(245,158,11,0.45)]"
                        : "text-neutral-200 hover:text-amber-300"
                    }`}
                  >
                    <span>{item.label}</span>
                    {hasDropdown && (
                      <ChevronDown
                        size={13}
                        className={`transition-transform duration-200 text-amber-400/80 ${
                          openDropdown === item.label ? "rotate-180" : ""
                        }`}
                      />
                    )}
                    {/* Active Golden Glow Pip */}
                    {isActive && (
                      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_6px_#f59e0b]" />
                    )}
                  </Link>

                  {/* Dropdown Menu */}
                  {hasDropdown && openDropdown === item.label && (
                    <div className="absolute top-full left-0 mt-1 min-w-[210px] rounded-2xl bg-neutral-950/95 backdrop-blur-2xl border border-amber-500/25 shadow-2xl shadow-black/90 p-2 flex flex-col gap-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                      {item.children?.map((child) => {
                        const isChildActive = pathname === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setOpenDropdown(null)}
                            className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-between group ${
                              isChildActive
                                ? "bg-amber-500/15 text-amber-300 font-semibold"
                                : "text-neutral-300 hover:text-amber-200 hover:bg-neutral-900/80"
                            }`}
                          >
                            <span>{child.label}</span>
                            <ArrowUpRight
                              size={14}
                              className="text-amber-400/70 group-hover:text-amber-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                            />
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* =========================================================
              AUTH BUTTONS (DESKTOP)
              - When Signed Out: "Sign In" + "Register"
              - When Signed In: REPLACE "Sign In" WITH "Dashboard" + "Register"
             ========================================================= */}
          <div className="hidden lg:flex items-center gap-3">
            {user ? (
              // Signed In State: Dashboard button + Register button
              <>
                <Link
                  href="/dashboard"
                  className="px-4 py-2 rounded-full text-[14px] font-medium tracking-wide border border-amber-500/30 bg-neutral-900/80 text-amber-200 hover:bg-amber-500/15 hover:border-amber-400 hover:text-amber-100 transition-all duration-300 flex items-center gap-2 shadow-sm"
                >
                  <LayoutDashboard size={15} className="text-amber-400" />
                  <span>Dashboard</span>
                </Link>

                <Link
                  href="/registrations"
                  className="px-5 py-2 rounded-full text-[14px] font-semibold tracking-wide bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-neutral-950 hover:brightness-110 shadow-lg shadow-amber-500/25 transition-all duration-300 flex items-center gap-1.5"
                >
                  <span>Register</span>
                  <ArrowUpRight size={15} />
                </Link>

                {/* Common Room Quick Pill */}
                <Link
                  href="/account"
                  className="p-2 rounded-full border border-amber-500/20 bg-neutral-900/60 hover:border-amber-400/60 hover:bg-neutral-800 text-amber-300 transition-all duration-300 flex items-center justify-center"
                  title="Your Common Room"
                >
                  <ShieldCheck size={16} />
                </Link>
              </>
            ) : (
              // Signed Out State: Sign In button + Register button
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-full text-[14px] font-medium tracking-wide border border-amber-500/30 bg-neutral-900/80 text-amber-200 hover:bg-amber-500/15 hover:border-amber-400 hover:text-amber-100 transition-all duration-300 flex items-center gap-2 shadow-sm"
                >
                  <UserRound size={15} className="text-amber-400" />
                  <span>Sign In</span>
                </Link>

                <Link
                  href="/signup"
                  className="px-5 py-2 rounded-full text-[14px] font-semibold tracking-wide bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-neutral-950 hover:brightness-110 shadow-lg shadow-amber-500/25 transition-all duration-300 flex items-center gap-1.5"
                >
                  <span>Register</span>
                  <ArrowUpRight size={15} />
                </Link>
              </>
            )}
          </div>

          {/* =========================================================
              MOBILE HAMBURGER (3 OLD BOOKS STACKED)
             ========================================================= */}
          <div className="flex lg:hidden items-center gap-2">
            <BookBurger isOpen={open} onClick={() => setOpen(!open)} />
          </div>
        </nav>

        {/* =========================================================
            MOBILE MENU DRAWER (DARK GLASSMORPHISM & CLEAN RESPONSIVE)
           ========================================================= */}
        {open && (
          <div
            ref={menuRef}
            className="pointer-events-auto lg:hidden fixed inset-x-4 top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-3xl bg-neutral-950/95 backdrop-blur-3xl border border-amber-500/25 shadow-2xl shadow-black/95 p-6 flex flex-col gap-5 z-50 animate-in fade-in slide-in-from-top-4 duration-300"
          >
            {/* Header Tag */}
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <span className="text-[11px] font-semibold tracking-[0.2em] text-amber-300 uppercase flex items-center gap-1.5">
                <span>✦</span> THE MARAUDER’S MAP
              </span>
              <span className="text-[10px] text-neutral-400 uppercase tracking-widest">
                {theme.name}
              </span>
            </div>

            {/* Mobile Nav Links */}
            <div className="flex flex-col gap-2">
              {navItems.map((item, idx) => {
                const isActive = pathname === item.href;
                return (
                  <div key={item.label} className="flex flex-col">
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={`py-2.5 px-3 rounded-xl text-base font-medium flex items-center justify-between transition-colors ${
                        isActive
                          ? "bg-amber-500/15 text-amber-300 font-semibold"
                          : "text-neutral-200 hover:text-amber-200 hover:bg-neutral-900/70"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-amber-400/60 font-mono">
                          0{idx + 1}
                        </span>
                        <span>{item.label}</span>
                      </span>
                      <ArrowUpRight size={16} className="text-amber-400/80" />
                    </Link>

                    {/* Submenu links */}
                    {item.children && (
                      <div className="ml-8 pl-3 border-l border-amber-500/20 flex flex-col gap-1 my-1">
                        {item.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            onClick={() => setOpen(false)}
                            className="py-1.5 text-sm text-neutral-400 hover:text-amber-200 transition-colors flex items-center justify-between"
                          >
                            <span>{child.label}</span>
                            <ArrowUpRight size={13} className="text-neutral-500" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile Action Buttons */}
            <div className="pt-4 border-t border-amber-500/20 flex flex-col gap-2.5">
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="w-full py-3 px-4 rounded-xl text-sm font-medium border border-amber-500/30 bg-neutral-900/80 text-amber-200 hover:bg-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <LayoutDashboard size={16} className="text-amber-400" />
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    href="/registrations"
                    onClick={() => setOpen(false)}
                    className="w-full py-3 px-4 rounded-xl text-sm font-semibold tracking-wider uppercase bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-neutral-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    <span>Register Now</span>
                    <ArrowUpRight size={16} />
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="w-full py-3 px-4 rounded-xl text-sm font-medium border border-amber-500/30 bg-neutral-900/80 text-amber-200 hover:bg-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <UserRound size={16} className="text-amber-400" />
                    <span>Sign In</span>
                  </Link>

                  <Link
                    href="/signup"
                    onClick={() => setOpen(false)}
                    className="w-full py-3 px-4 rounded-xl text-sm font-semibold tracking-wider uppercase bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 text-neutral-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                  >
                    <span>Register</span>
                    <ArrowUpRight size={16} />
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>
    </>
  );
}
