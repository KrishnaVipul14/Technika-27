// Tracks whether the initial home intro animation has completed.
// This in-memory state resets on browser refresh (F5 / hard reload) at the home page,
// but persists across client-side navigations (Link, <a> tags, router redirects).

let homeIntroCompleted = false;

// If initial page load wasn't the home page (e.g. user entered directly on /events),
// mark as completed so subsequent link navigation to "/" will not trigger the intro.
if (typeof window !== "undefined" && window.location.pathname !== "/") {
  homeIntroCompleted = true;
}

export function isHomeIntroCompleted(): boolean {
  return homeIntroCompleted;
}

export function setHomeIntroCompleted(completed: boolean = true): void {
  homeIntroCompleted = completed;
}
