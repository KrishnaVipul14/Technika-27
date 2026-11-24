"use client";

import { Check, ChevronUp, Palette, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { selectableHouses, houseThemes, themeAttributeForHouse, type House } from "@/lib/houses";
import { saveHousePreference } from "@/lib/house-preference";
import { useAuth } from "./auth-provider";
import { useHouse } from "./house-provider";
import styles from "./house-switcher.module.css";

const symbols = {
  gryffindor: "G",
  slytherin: "S",
  ravenclaw: "R",
  hufflepuff: "H",
} as const;

export function HouseSwitcher() {
  const { user } = useAuth();
  const { house, theme: houseTheme, setHouse } = useHouse();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dismissalFrame = useRef<number | null>(null);
  const panelId = useId();

  useEffect(() => () => {
    if (dismissalFrame.current !== null) cancelAnimationFrame(dismissalFrame.current);
  }, []);

  useEffect(() => {
    if (!open) return;
    // Non-modal chooser: keyboard focus can leave normally, without a trap.
    const initial = panelRef.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"]') ?? panelRef.current?.querySelector<HTMLButtonElement>("button");
    initial?.focus({ preventScroll: true });
    const dismissOutside = (event: PointerEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      const ownedFocus = panelRef.current?.contains(document.activeElement);
      setOpen(false);
      const target = event.target instanceof Element ? event.target : null;
      const outsideControl = target?.closest('a[href], button, input, select, textarea, summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"])');
      if (!ownedFocus || outsideControl) return;
      // Let the pointer's native focus transfer finish. Restore only if the
      // removed option left focus on the document, never over another control.
      if (dismissalFrame.current !== null) cancelAnimationFrame(dismissalFrame.current);
      dismissalFrame.current = requestAnimationFrame(() => {
        dismissalFrame.current = null;
        // Browsers may focus a programmatic-only ancestor (our skip-link main)
        // when its non-focusable heading is clicked. That is background focus,
        // not an intentional transfer to another interactive control.
        if (document.activeElement === document.body || document.activeElement === document.documentElement || document.activeElement === target?.closest('[tabindex="-1"]')) openerRef.current?.focus({ preventScroll: true });
      });
    };
    document.addEventListener("pointerdown", dismissOutside);
    return () => document.removeEventListener("pointerdown", dismissOutside);
  }, [open]);

  const chooseHouse = async (nextHouse: Exclude<House, "default">) => {
    if (saving || nextHouse === house) {
      setOpen(false);
      openerRef.current?.focus({ preventScroll: true });
      return;
    }

    const previousHouse = house;
    setMessage("");
    setHouse(nextHouse);

    if (!user) {
      setMessage("House saved on this device. Sign in to save it to your profile.");
      return;
    }

    // Disabling a focused option blurs it to BODY and would dismiss the panel.
    // Keep focus within this non-modal chooser while the request is pending.
    openerRef.current?.focus({ preventScroll: true });
    setSaving(true);
    setMessage("Saving your house…");
    const error = await saveHousePreference(user.id, nextHouse);
    setSaving(false);

    if (error) {
      setHouse(previousHouse);
      setMessage("House could not be saved. Your previous house was restored. Try again.");
      return;
    }

    setMessage(`${houseThemes[nextHouse].name} is now saved to your profile.`);
  };

  return (
    <div ref={rootRef} className={styles.root}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          openerRef.current?.focus({ preventScroll: true });
        }
      }}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
      {open && (
        <div
          ref={panelRef}
          id={panelId}
          className={styles.panel}
          role="dialog"
          aria-label="Choose a house"
          aria-busy={saving}
          data-lenis-prevent
        >
          <div className="mb-3 flex items-start justify-between gap-3 px-1">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-fg-brand">
                Choose your house
              </p>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                {user ? "Your choice is saved to Supabase." : "Your choice is saved on this device."}
              </p>
            </div>
            <Sparkles size={15} className="mt-0.5 shrink-0 text-fg-brand" aria-hidden="true" />
          </div>

          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Houses">
            {selectableHouses.map((key) => {
              const option = houseThemes[key];
              const selected = house === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  disabled={saving}
                  onClick={() => void chooseHouse(key)}
                  data-theme={themeAttributeForHouse(key)}
                  className={styles.option}
                >
                  <span
                    className="grid h-9 w-8 shrink-0 place-items-center rounded-md border border-brand-border bg-brand-soft text-sm font-semibold text-fg-brand"
                    aria-hidden="true"
                  >
                    {symbols[key]}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-fg-strong">{option.name}</span>
                    <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.1em] text-fg-subtle">{option.quality.split(" · ")[0]}</span>
                  </span>
                  {selected && <Check size={14} className="absolute right-2 top-2 text-fg-brand" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          {message && (
            <p className="mt-3 border-t border-line-subtle px-1 pt-3 text-[11px] leading-relaxed text-fg-muted" role="status">
              {message}
            </p>
          )}
        </div>
      )}

      <button
        ref={openerRef}
        type="button"
        aria-expanded={open}
        aria-label="Change house"
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen((value) => !value)}
        className={styles.opener}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-soft text-fg-brand" aria-hidden="true">
          <Palette size={15} />
        </span>
        <span className="hidden sm:block">
          <span className="block text-[9px] font-semibold uppercase tracking-[0.16em] text-fg-brand">Change house</span>
          <span className="mt-0.5 block max-w-28 truncate text-[11px] text-fg-muted">{houseTheme.name}</span>
        </span>
        <ChevronUp size={14} className={`text-fg-subtle transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
    </div>
  );
}
