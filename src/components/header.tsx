"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { ArrowUpRight, ChevronDown, LayoutDashboard, Menu, ShieldCheck, UserRound, X } from "lucide-react";
import { navigation, type NavigationItem } from "@/lib/festival";
import { houseLogoFor } from "@/lib/houses";
import { useAuth } from "./auth-provider";
import { useHouse } from "./house-provider";
import { useMagic } from "./experience";
import { useLenis } from "./smoothScroll";
import styles from "./header.module.css";

const navItems = navigation.filter((item) => item.href !== "/dashboard");
const subscribeHydration = () => () => {};
const hydratedSnapshot = () => true;
const serverSnapshot = () => false;

function routeMatches(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

function BookBurger({ onClick, interactive, expanded }: { onClick: () => void; interactive: boolean; expanded: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={!interactive} aria-label="Open navigation" aria-haspopup="dialog" aria-expanded={expanded} aria-controls={expanded ? "mobile-navigation" : undefined} className={styles.bookButton}>
      <span className={styles.books} aria-hidden="true">
        <span className={styles.crimsonBook} /><span className={styles.emeraldBook} /><span className={styles.ochreBook} />
      </span>
      <Menu size={22} className={styles.contrastMenu} aria-hidden="true" />
    </button>
  );
}

function DesktopItem({ item, pathname, expanded, onExpand, interactive }: {
  item: NavigationItem;
  pathname: string;
  expanded: boolean;
  onExpand: (label: string | null, source?: "pointer") => void;
  interactive: boolean;
}) {
  const groupRef = useRef<HTMLLIElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusOnOpen = useRef<"first" | "last" | null>(null);
  const hasChildren = Boolean(item.dropdown && item.children?.length);
  const active = routeMatches(pathname, item.href) || item.children?.some((child) => routeMatches(pathname, child.href));
  const panelId = `nav-${item.href.slice(1)}-links`;

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  useEffect(() => {
    if (!expanded || !focusOnOpen.current) return;
    const links = groupRef.current?.querySelectorAll<HTMLAnchorElement>(`#${panelId} a`);
    (focusOnOpen.current === "last" ? links?.[links.length - 1] : links?.[0])?.focus();
    focusOnOpen.current = null;
  }, [expanded, panelId]);

  const handleKeys = (event: KeyboardEvent<HTMLLIElement>) => {
    if (!hasChildren) return;
    if (event.key === "Escape" && expanded) {
      event.preventDefault();
      cancelClose();
      onExpand(null);
      toggleRef.current?.focus();
    } else if (event.target === toggleRef.current && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      focusOnOpen.current = event.key === "ArrowUp" ? "last" : "first";
      if (expanded) {
        const links = groupRef.current?.querySelectorAll<HTMLAnchorElement>(`#${panelId} a`);
        (event.key === "ArrowUp" ? links?.[links.length - 1] : links?.[0])?.focus();
        focusOnOpen.current = null;
      } else onExpand(item.label);
    }
  };

  return (
    <li ref={groupRef} className={styles.navItem} data-active={active || undefined} data-expanded={expanded || undefined}
      onKeyDown={handleKeys}
      onFocus={cancelClose}
      onPointerEnter={(event) => { if (hasChildren && event.pointerType === "mouse") { cancelClose(); onExpand(item.label, "pointer"); } }}
      onPointerLeave={() => {
        if (hasChildren && !groupRef.current?.contains(document.activeElement)) {
          cancelClose();
          closeTimer.current = setTimeout(() => {
            closeTimer.current = null;
            if (!groupRef.current?.contains(document.activeElement)) onExpand(null);
          }, 160);
        }
      }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { cancelClose(); onExpand(null); } }}>
      <Link href={item.href} className={styles.navLink} aria-current={routeMatches(pathname, item.href) ? "page" : undefined} onNavigate={() => onExpand(null)}>{item.label}</Link>
      {hasChildren && <button ref={toggleRef} type="button" disabled={!interactive} className={styles.disclosure} aria-label={`Show ${item.label} links`} aria-expanded={expanded} aria-controls={panelId}
        onClick={() => { cancelClose(); onExpand(expanded ? null : item.label); }}>
        <ChevronDown size={13} aria-hidden="true" />
      </button>}
      {hasChildren && <div id={panelId} className={styles.dropdown} hidden={!expanded}>
        {item.children?.map((child) => <Link key={child.href} href={child.href} aria-current={routeMatches(pathname, child.href) ? "page" : undefined} onNavigate={() => onExpand(null)}>
          <span>{child.label}</span><ArrowUpRight size={15} aria-hidden="true" />
        </Link>)}
      </div>}
    </li>
  );
}

function AccountActions({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const { user } = useAuth();
  return <div className={mobile ? styles.sheetActions : styles.accountActions}>
    <Link href={user ? "/dashboard" : "/login"} onNavigate={onNavigate} className={styles.secondaryAction}>
      {user ? <LayoutDashboard size={16} aria-hidden="true" /> : <UserRound size={16} aria-hidden="true" />}<span>{user ? "Dashboard" : "Sign In"}</span>
    </Link>
    <Link href={user ? "/registrations" : "/signup"} onNavigate={onNavigate} className={styles.primaryAction}><span>Register</span><ArrowUpRight size={15} aria-hidden="true" /></Link>
    {user && <Link href="/account" onNavigate={onNavigate} className={styles.roomAction} aria-label="Your Common Room" title="Your Common Room"><ShieldCheck size={18} aria-hidden="true" /></Link>}
  </div>;
}

function MobileNavigation({ pathname, onClose }: { pathname: string; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { theme } = useHouse();
  const { getLenis } = useLenis();
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previous = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const lenis = getLenis();
    const resumeLenis = lenis && !lenis.isStopped;
    document.body.style.overflow = "hidden";
    if (resumeLenis) lenis.stop();
    dialog.showModal();
    return () => {
      dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
      document.body.style.overflow = previous;
      if (resumeLenis) lenis.start();
    };
  }, [getLenis]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1280px)");
    const closeOnDesktop = () => { if (desktop.matches) onClose(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, [onClose]);

  return <dialog ref={dialogRef} id="mobile-navigation" aria-labelledby="navigation-title" className={styles.sheet} data-lenis-prevent
    onCancel={onClose}
    onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)")].filter((control) => control.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}
    onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const rect = event.currentTarget.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose();
    }}>
    <div className={styles.sheetHeading}>
      <div><h2 id="navigation-title">Explore Technika</h2><p>{theme.name}</p></div>
      <button type="button" aria-label="Close navigation" onClick={onClose} className={styles.closeButton}><X size={21} aria-hidden="true" /></button>
    </div>
    <nav aria-label="Mobile navigation" className={styles.sheetLinks}>
      <ul>{navItems.map((item) => {
        const active = routeMatches(pathname, item.href) || item.children?.some((child) => routeMatches(pathname, child.href));
        const panelId = `mobile-${item.href.slice(1)}-links`;
        const isExpanded = expanded === item.label;
        return <li key={item.href} data-active={active || undefined}>
          <div className={styles.sheetRow}>
            <Link href={item.href} onNavigate={onClose} aria-current={routeMatches(pathname, item.href) ? "page" : undefined}>{item.label}{!item.children && <ArrowUpRight size={16} aria-hidden="true" />}</Link>
            {item.children && <button type="button" aria-label={`Show ${item.label} links`} aria-expanded={isExpanded} aria-controls={panelId} onClick={() => setExpanded(isExpanded ? null : item.label)}><ChevronDown size={17} aria-hidden="true" /></button>}
          </div>
          {item.children && <div id={panelId} className={styles.sheetSublinks} hidden={!isExpanded}>{item.children.map((child) => <Link key={child.href} href={child.href} onNavigate={onClose} aria-current={routeMatches(pathname, child.href) ? "page" : undefined}>{child.label}<ArrowUpRight size={14} aria-hidden="true" /></Link>)}</div>}
        </li>;
      })}</ul>
    </nav>
    <AccountActions mobile onNavigate={onClose} />
  </dialog>;
}

function NavigationHeader({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const { user } = useAuth();
  const { house } = useHouse();
  const { ready } = useMagic();
  const interactive = useSyncExternalStore(subscribeHydration, hydratedSnapshot, serverSnapshot);

  const changeDropdown = (owner: string, next: string | null, source?: "pointer") => {
    // Delayed pointer/blur events belong to one menu, not whichever opened next.
    if (next === null) {
      setDropdown((current) => current === owner ? null : current);
      return;
    }
    // Hover must not hide a submenu that still owns keyboard focus.
    if (source === "pointer" && navRef.current?.querySelector('[data-expanded="true"]')?.contains(document.activeElement)) return;
    setDropdown(next);
  };

  useEffect(() => {
    if (!dropdown) return;
    const closeOutside = (event: PointerEvent) => { if (!navRef.current?.contains(event.target as Node)) setDropdown(null); };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [dropdown]);

  return <header className={styles.header} data-ready={ready}>
    <nav ref={navRef} aria-label="Main Navigation" aria-busy={!interactive} className={styles.navigation}>
      <Link href="/" aria-label="Home" className={styles.brand}>
        <Image src={houseLogoFor(house)} width={65} height={56} sizes="48px" alt="" priority data-house-logo={house} />
        <span>Technika</span>
      </Link>
      <ul className={styles.desktopLinks}>{navItems.map((item) => <DesktopItem key={item.href} item={item} pathname={pathname} expanded={dropdown === item.label} onExpand={(next, source) => changeDropdown(item.label, next, source)} interactive={interactive} />)}</ul>
      <AccountActions />
      <div className={styles.compactActions}>
        <Link href={user ? "/registrations" : "/signup"} className={styles.primaryAction}>Register<ArrowUpRight size={14} aria-hidden="true" /></Link>
        <BookBurger onClick={() => setOpen(true)} interactive={interactive} expanded={open} />
      </div>
    </nav>
    {open && <MobileNavigation pathname={pathname} onClose={() => setOpen(false)} />}
  </header>;
}

export function Header() {
  const pathname = usePathname();
  // Route changes dismiss disclosures and release the sheet's scroll lock.
  return <NavigationHeader key={pathname} pathname={pathname} />;
}
