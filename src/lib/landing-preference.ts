// Where the owl takes the user right after signing in: the Great Hall
// (dashboard) or their house common room. Stored in localStorage so the
// preference survives refreshes and sessions.

export type LandingPreference = "great-hall" | "common-room";

const KEY = "technika:landing:v1";

export const LANDING_ROUTES: Record<LandingPreference, string> = {
  "great-hall": "/dashboard",
  "common-room": "/account",
};

export function getLandingPreference(): LandingPreference | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "great-hall" || v === "common-room" ? v : null;
  } catch {
    return null;
  }
}

export function setLandingPreference(v: LandingPreference): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, v);
  } catch {
    // storage may be unavailable (private mode); the default stands
  }
}

/** Resolves the post-sign-in destination: explicit ?next= wins, then the
 *  saved preference, then the Great Hall dashboard. */
export function resolveLandingPath(): string {
  if (typeof window !== "undefined") {
    const next = new URLSearchParams(window.location.search).get("next");
    if (next && next.startsWith("/") && !next.startsWith("//")) return next;
  }
  const pref = getLandingPreference();
  return pref ? LANDING_ROUTES[pref] : "/dashboard";
}
