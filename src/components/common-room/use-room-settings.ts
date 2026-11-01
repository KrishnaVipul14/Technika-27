"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { Quality } from "@/lib/common-room/config";

export type RoomSettings = { quality: "auto" | Quality; motion: "system" | "on" | "off"; ambient: boolean; effects: boolean; lightweight: boolean };
const key = "technika:common-room:v1";
const defaults: RoomSettings = { quality: "auto", motion: "system", ambient: false, effects: false, lightweight: false };
export function parseRoomSettings(raw: string | null): RoomSettings {
  try {
    const value = JSON.parse(raw || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return defaults;
    return { ...defaults, quality: ["auto", "low", "medium", "high"].includes(value.quality) ? value.quality : "auto", motion: ["system", "on", "off"].includes(value.motion) ? value.motion : "system", lightweight: value.lightweight === true };
  } catch { return defaults; }
}
const stored = () => { try { return localStorage.getItem(key); } catch { return null; } };
const subscribeStorage = (listener: () => void) => { window.addEventListener("storage", listener); return () => window.removeEventListener("storage", listener); };
const media = () => Number(matchMedia("(prefers-reduced-motion: reduce)").matches) + 2 * Number(matchMedia("(pointer: coarse)").matches);
const subscribeMedia = (listener: () => void) => { const queries = [matchMedia("(prefers-reduced-motion: reduce)"), matchMedia("(pointer: coarse)")]; queries.forEach((query) => query.addEventListener("change", listener)); return () => queries.forEach((query) => query.removeEventListener("change", listener)); };
export function useRoomSettings() {
  const raw = useSyncExternalStore(subscribeStorage, stored, () => null);
  const device = useSyncExternalStore(subscribeMedia, media, () => 1);
  const saved = useMemo(() => parseRoomSettings(raw), [raw]);
  const [changes, setChanges] = useState<Partial<RoomSettings>>({});
  const settings = { ...saved, ...changes };
  const update = (patch: Partial<RoomSettings>) => {
    setChanges((current) => ({ ...current, ...patch }));
    const next = { ...settings, ...patch };
    try { localStorage.setItem(key, JSON.stringify({ quality: next.quality, motion: next.motion, lightweight: next.lightweight })); } catch { /* Visual preferences still work for this visit. */ }
  };
  const quality: Quality = settings.quality === "auto" ? device & 2 ? "low" : "medium" : settings.quality;
  return { settings, update, quality, motion: settings.motion === "system" ? !(device & 1) : settings.motion === "on" };
}
