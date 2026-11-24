# Navigation Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine Technika's navbar and canvas dragon scrollbar without changing page content or existing model assets.

**Architecture:** Isolated CSS modules implement the existing house-token system. Navigation uses semantic links, disclosure buttons and a native mobile dialog; the dragon keeps its existing canvas drawing with an accessible desktop control and passive phone presentation.

**Tech Stack:** Next.js 16.4.6, React 19, TypeScript, CSS modules, existing Lenis, Lucide and Playwright.

**Spec:** `docs/superpowers/specs/2026-11-23-navigation-refinement-design.md`

## Global Constraints
- No new dependencies or model/artwork replacement.
- Preserve existing labels, link destinations and equipped-house tokens.
- Full desktop navigation starts at 1280px; touch/coarse or sub-768px dragon is passive.
- Preserve unrelated uncommitted work; execute in place without commits.

## Review Focus
- Pointer and keyboard dismissal must restore sensible focus, not trap visitors.
- Resizing with the phone sheet open must not leave document scrolling locked.
- Keyboard rail endpoints and pointer capture cancellation must not throw or overshoot.
- Reduced-motion changes during a session must clear particles and stop autonomous painting.
- Canvas failure and a page that no longer scrolls must not leave an invisible interactive strip.

### Task 1: Navbar
**Files:** modify `src/components/header.tsx`; create `src/components/header.module.css`; test `tests/navigation-refinement.spec.ts`.
**Interfaces:** consumes `navigation`, `useAuth()`, `useHouse()`, `useMagic()`, `useLenis()`; produces `Header()` with unchanged external interface.
- [x] Add tests for keyboard disclosures/Escape, current page, mobile focus/dismissal/submenus and breakpoint layout.
- [x] Run Playwright; observe expected missing disclosure/semantics failures before editing product code.
- [x] Implement house-tinted floating navbar, split link/disclosure controls, compact native sheet, accessible book toggle and scoped entrance/micro-interactions.
- [x] Run focused tests and visually inspect desktop/phone before proceeding.

### Task 2: Dragon scrollbar and integration
**Files:** modify `src/components/dragon-scroll.tsx`; create `src/components/dragon-scroll.module.css`; test `tests/navigation-refinement.spec.ts`; document verification here.
**Interfaces:** preserves `DragonScrollProps`, `scroll-snake`/`snake-scroll-canvas` test IDs and progress/length data attributes. Adds `role="scrollbar"` desktop controls without changing the drawing functions.
- [x] Add failing tests for accessible keyboard endpoints, drag progress, navbar clearance, passive touch behavior, reduced-motion static canvas and failed-canvas fallback.
- [x] Observe those failures against the existing implementation.
- [x] Add scoped rail styling, pointer/keyboard control, accessible progress, native fallback and demand-driven reduced-motion/hidden-tab rendering.
- [x] Run all focused tests, existing applicable navigation/dragon regressions, lint, typecheck and production build.
- [x] Audit guidelines and rendered views at supported widths/themes; fix findings and run one stretch pass.
- [x] Record exact verification and preserve unrelated work.

## Execution record
Completed inline, without commits or dependencies. Canvas drawing and existing model work preserved.

### Review and stretch fixes
- Independent read-only review found submenu ownership/focus races, clipped signed-in phone actions, insufficient native-scrollbar fallback, stale canvas readiness after prop changes and uneven frame timing. Fixed each, with browser red/green tests or development-only reproduction probes.
- The signed-in rendering branch was seeded in browser memory, **not** tested with an authenticated session. At 320px Dashboard measured 240px, Register 188px and Common Room 44px; all fit inside the sheet. No protected-route or authentication logic changed.
- Injected failed canvas initialization after a width-prop restart: wrapper readiness `false`, control tab index `-1`, native scrollbar width `auto` and pseudo-element display `block`.
- Stretch: native scrolling and system-colored navigation controls in forced-colors mode. Decorative dragon motion lasts a three-second entrance and 1.6 seconds after scrolling, then rests without a frozen flame; reduced-motion mode paints only on invalidation.
- A dynamic-height regression disables browser scroll anchoring to isolate the ResizeObserver. Without that isolation, the mobile browser correctly follows the footer to the new bottom and remains at 100%.
- Impeccable detector ran once over the four changed UI targets. Its sole advisory was book-toggle bounce easing; replaced with the shared exponential ease-out.

### Final verification (observed)
```sh
npm run typecheck
npm test
PLAYWRIGHT_PORT=3101 npx playwright test tests/navigation-refinement.spec.ts tests/festival.spec.ts --grep 'dragon|navigation|sublinks|submenu|house crest|scroll snake|every themed portal' --output=test-results/navigation-final
git diff --check
```
- TypeScript and ESLint: exit 0.
- Production build: compiled successfully, generated 34/34 static pages, exit 0.
- Production Chromium checks: **35 passed, 3 intentional device-specific skips**, 0 failures. This is the focused navigation/dragon suite plus applicable existing festival regressions, not the entire unrelated festival suite.
- Real renders inspected at 320, 390, 768, 1024, 1280 and 1440px, open/closed menus, homepage, all five house palettes and high-contrast mode. Regression captures are in ignored `test-results`; additional design captures are in the session temporary directory.
- Navbar minimum text contrasts across the five themes: default 12.12:1, Gryffindor 12.11:1, Slytherin 9.26:1, Ravenclaw 9.14:1, Hufflepuff 9.21:1 (computed colors and alpha-composited surfaces).
- No component runtime exceptions. The unchanged global `<Analytics />` in `src/app/layout.tsx` requests `/_vercel/insights/script.js`, which returns 404 on a local non-Vercel production server. This is outside the requested UI scope; no claim of a globally error-free console.
- `tests/verify-dragon.spec.ts` was not run: it hard-codes localhost:3000 and overwrites existing user screenshots. Its growth checks are covered by the preserved existing festival regression and new rail tests.

### Preview
Development server: `http://127.0.0.1:3100/contact` (started with `npm run dev -- --hostname 127.0.0.1 --port 3100`). Production verification server was started and served by Playwright on 3101.
