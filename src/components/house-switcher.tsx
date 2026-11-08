"use client";

import { Check, ChevronUp, Palette, Sparkles } from "lucide-react";
import { useState } from "react";
import { selectableHouses, houseThemes, themeAttributeForHouse, type House } from "@/lib/houses";
import { saveHousePreference } from "@/lib/house-preference";
import { useAuth } from "./auth-provider";
import { useHouse } from "./house-provider";

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

  const chooseHouse = async (nextHouse: Exclude<House, "default">) => {
    if (saving || nextHouse === house) {
      setOpen(false);
      return;
    }

    const previousHouse = house;
    setMessage("");
    setHouse(nextHouse);

    if (!user) {
      setMessage("House saved on this device. Sign in to save it to your profile.");
      return;
    }

    setSaving(true);
    const error = await saveHousePreference(user.id, nextHouse);
    setSaving(false);

    if (error) {
      setHouse(previousHouse);
      setMessage("The house changed locally, but could not be saved to your profile.");
      return;
    }

    setMessage(`${houseThemes[nextHouse].name} is now saved to your profile.`);
  };

  return (
    <div className="house-switcher fixed bottom-4 left-4 z-[75] sm:bottom-6 sm:left-6">
      {open && (
        <div
          className="absolute bottom-full left-0 mb-3 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-brand/35 bg-surface/95 p-3 shadow-lg backdrop-blur-2xl"
          role="dialog"
          aria-label="Choose a house"
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
                  className={`group relative flex min-h-20 items-center gap-2 rounded-xl border border-brand-border px-3 py-2 text-left text-fg-brand transition-[border-color,background,transform] hover:-translate-y-0.5 hover:border-brand disabled:cursor-wait disabled:opacity-60 ${selected ? "bg-brand-soft" : "bg-bg/35 hover:bg-brand-soft"}`}
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
        type="button"
        aria-expanded={open}
        aria-label="Change house"
        onClick={() => setOpen((value) => !value)}
        className="group inline-flex items-center gap-2 rounded-full border border-brand/40 bg-surface/90 px-3 py-2.5 text-left shadow-lg backdrop-blur-xl transition-colors hover:border-brand hover:bg-brand-soft focus-visible:ring-2 focus-visible:ring-ring"
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
