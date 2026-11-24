# Colour Contrast Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans inline. Steps use checkbox syntax for tracking.

**Goal:** Improve shared button and navbar colour/contrast, reproduce and fix public-shell bugs.
**Architecture:** House theme semantic action/control tokens are the single shared colour source. Scoped navbar styles consume those tokens. Existing React interactions are retained and repaired only with reproduced failures.
**Tech Stack:** Next.js 16.4.6, React 19, CSS modules, Tailwind 4, Playwright.
**Spec:** `docs/superpowers/specs/2026-11-24-colour-contrast-design.md`

## Constraints
- Existing checkout, no commits/new dependencies; preserve all unrelated uncommitted work.
- Text >=4.5:1, control/focus contrast >=3:1, touch targets >=44px.
- Five house themes; existing type, labels, links, motion/dragon artwork unchanged.
- Native Next CSS/Link guides read; UI/UX search script unavailable in this project, use installed skill's principles.

## Review focus
- Gradient/shimmer overlays can lower otherwise-valid solid text contrast.
- Global CSS can silently hide modal overflow scrollbars.
- Short landscape heights must retain at least one full navigation row and visible account actions.
- Theme chooser dismissal must not remove the keyboard-focused node without restoring focus.
- Local production must not request undeployed provider-only analytics endpoints.

### Task 1: Contrast tests and shared colour system
Files: `tests/colour-contrast.spec.ts`, `tests/helpers/contrast.ts`, `src/app/houseThemes.css`, `src/app/theme-utilities.css`, `src/app/globals.css`.
Interfaces: preserve `.button-gold`/`.button-glass`; introduce `--action-*` and `--control-*` tokens consumed by navbar.
- [x] Write real browser contrast tests for normal/hover/pressed/focus states across all houses and observe failures; native disabled fixture checked.
- [x] Implement safe action pairs, solid secondary surfaces/borders and accessible focus/disabled states; remove duplicate bridge rules and contrast-reducing shimmer.
- [x] Run focused tests; inspect shared controls.

### Task 2: Navbar and reproduced shell bugs
Files: `src/components/header.module.css`, `src/components/house-switcher.tsx`, `src/app/layout.tsx`, focused tests.
Interfaces: existing Header/HouseSwitcher props unchanged; preserve navigation destinations and native modal focus/scroll cleanup.
- [x] Reproduce landscape navigation, theme-chooser keyboard/outside dismissal and local analytics request failures in tests.
- [x] Refine navbar surfaces/active states/controls using shared tokens; restore sheet scrollbars and short-height layout.
- [x] Fix only confirmed interaction/runtime bugs; run focused regressions.

### Task 3: Audit, polish and verification
- [x] Load audit/polish skills, fetch fresh interface guidelines, review changed UI, inspect all five themes at mobile/tablet/desktop sizes.
- [x] Run one independent read-only review and address substantive findings with regression tests.
- [x] Implement one stretch improvement after acceptance checks.
- [x] Run TypeScript/lint/build and focused plus applicable existing browser regressions, audit public routes, record exact results and remaining limitations.

### Task 4: User-requested glassmorphism steering
Files: `src/app/houseThemes.css`, `src/components/header.module.css`, `src/components/house-switcher.module.css`, `tests/colour-contrast.spec.ts`, `tests/helpers/contrast.ts`.
Interfaces: retain `--action-*`/`--control-*` colour pairs and existing component props; add shared `--glass-*` material tokens. No new JS/dependencies or page layout changes.
- [x] Add browser checks that navbar/shared controls/chooser use real translucent fills and backdrop filters; observe matte controls failing. Verify AA text even over black/white backings, including reflection stops.
- [x] Apply smoked house glass, static reflections, inset edges and brief shadow hover feedback. Provide opaque fallbacks for unsupported filters/reduced transparency and native forced colours.
- [x] Run the contrast/navigation/public regression suites; inspect mobile/tablet/desktop and all houses; finish Task 3 audit, review, stretch and final checks against the new material.
Run: `PLAYWRIGHT_PORT=3102 npx playwright test tests/colour-contrast.spec.ts --grep 'frosted glass|glass controls' --project=desktop --output=test-results/glass-material`.
Expected: initial glass-material check FAIL (opaque fill/missing blur), then PASS with text >=4.5 and translucent alpha strictly between 0 and 1.

## Execution ledger
Ruling: run in-place to include the user's current uncommitted navbar/theme integrations; creating a clean worktree would omit them. No git integration or asset edits.
Ruling: use this plan as the ledger rather than commit-oriented scratch scripts; the requested deliverable remains uncommitted.
Pre-flight: Task 2 consumes Task 1's semantic action/control tokens; all names are CSS-only, no TypeScript interface changes.
Task 1 evidence: three dark-house gradients failed at 2.69–2.72:1; initial border test failed on the secondary button. Shared primary/forced-colors checks then passed 4/4 on desktop/mobile; combined colour/shell checks passed 14/14 after Task 2.
Task 2 evidence: landscape rows collapsed, Escape/outside dismissal failed, and non-Vercel analytics returned a 404. Corrected outside-dismissal test initially hit a development overlay; rerunning against production reproduced the actual chooser failure. Task 2 complete: 14/14 focused production browser checks, build 34/34 pages.
Task 3: Ruling: include reproduced public-shell hydration/reduced-motion bugs in the audit — both affect the shell the user asked to audit, not page content/design; cost is touching two existing animation components. Dev test reproduced React hydration errors naming `.owl-moon` and `.delegate-emblem`; reduced-motion test reproduced parallax transforms. Moved parallax into each hydrated Reveal and used GSAP media-context cleanup. Dev regressions passed 2/2.
Task 3 evidence: homepage CTA global-link cascade reduced gold label contrast to 1.12:1; corrected test selector then reproduced it. Shared action classes removed the override/overlay; home gold now measures 14.19:1. Production contrast/navigation suite passed 50 checks with 2 device-specific skips; applicable public suite passed 20 with 2 device-specific skips. Lint/build/typecheck and diff whitespace check passed. Old recovery test used obsolete button/help copy; corrected to current recovery UI and email field validation, no authentication implementation changes.
Task 4: Ruling: the user's glassmorphism request supersedes opaque-enamel material, not the contrast or bug-fix requirements — use tinted smoked glass on the requested controls and disclosures, preserving content cards and behaviour — cost is another CSS/contrast/browser validation pass. UI/UX bundled search script is unavailable; installed skill principles and incumbent theme tokens remain authority.
Task 4 evidence: `test-results/glass-material-red` records the opaque-fill/missing-blur failure before material implementation. Shared glass now uses translucent fills, backdrop filters, static reflections and inset edge lighting. The final material suite includes normal/hover/pressed text checks over black and white backings in all five themes, plus reduced-transparency and forced-colours checks. Local parchment actions retain their own matched text/fill pairs, including the opaque fallback.
Task 3 review: an independent read-only review raised parchment action-pair specificity, background-dismissal focus loss and very-short signed-in navigation. Reproductions are retained in `test-results/colour-review-red` and `test-results/colour-auth-red`. Local matched action tokens, deferred conditional focus restoration and compact sheet sizing fix those findings; the final production and authenticated-fixture suites cover each case.
Task 3 save-state refinement: the delayed authenticated-save regression failed in `test-results/colour-save-pending-red` because disabling the selected option lost chooser focus and hid status feedback. Focus moves to the opener before options disable; the live status announces saving, accurate rollback and a successful retry. The loopback fixture intercepts profile PATCH responses, not real accounts or backend writes.
Task 3 stretch: pointer-event-created GSAP tweens could outlive reduced-motion cleanup. The in-flight card test failed in `test-results/colour-review-red` before context-owned enter/leave tweens and light-state cleanup. The final production suite verifies transforms remain cleared across subsequent animation frames and hero lighting is removed after a live preference change.
Task 3 final hydration fixes: development coverage exposed multi-child SVG `<title>` output and pre-hydration mutation of Motion-owned gallery cards (`test-results/colour-final-runtime-red`, `test-results/colour-expanded-hydration-red`). Titles now render one string; global card attachment waits for the gallery's hydration marker. Final development fixtures exercise contact, delegate, map and members on desktop/mobile without hydration errors.
Task 3 test-readiness findings: the public hover assertion interacted while the hero entrance was still moving the target; the arrival helper now uses the real skip control and waits for the ready header and visible hero parent. The dragon idle assertion occasionally counted one pending startup invalidation (2 of 12 instrumented visits), not continuous idle work. It now waits for canvas readiness, loaded fonts and two layout frames before its unchanged zero-idle-paints assertion. Repeated desktop/mobile idle coverage passed 16/16 in `test-results/colour-dragon-idle-settled-green`; no dragon implementation was changed for this timing finding.
Task 3/4 browser verification: `PLAYWRIGHT_PORT=3105 npx playwright test tests/colour-contrast.spec.ts tests/navigation-refinement.spec.ts --reporter=dot --output=test-results/colour-glass-complete` → 64 passed, 4 device-specific skips, 0 failed (2.8m). Applicable public checks (`recovery flow|callback|house crest|every themed|mobile navigation|Map searches|chamber filters|save the date|scroll snake|cards and buttons|public routes`) → 20 passed, 2 device-specific skips, 0 failed (51.3s), output `test-results/colour-public-complete`. `TMPDIR=/private/var/folders/m9/3b2r3yks19z21qfndhlff_yc0000gn/T/opencode npx playwright test --config=playwright.colour-auth.config.ts --reporter=dot --output=test-results/colour-auth-complete` → 6 passed (28.8s); development Fast Refresh warnings only.
Task 3/4 rendered audit: all five themes captured at 1440×900, 768×1024 and 390×844 with measured document widths matching each viewport. Post-intro homepage captures at all three sizes, mobile navigation/chooser/focus, 844×240 landscape, forced colours and reduced-transparency fallback were inspected. Capture run reported no console/runtime errors. Screenshots are retained in the approved temporary directory as `glass-final-*`; contact navigation also fits 320/390/768/1024/1280/1440px, and authenticated sheets retain one complete row plus 44px account actions down to 320×180px. Fresh interface guidelines and the final source diff were reviewed; changes remain scoped to requested controls and reproduced shell bugs.
Final: minor (deferred): detector's existing category accent at `src/app/marauders-map.css:292` is intentional event classification, not a new generic card treatment; preserve the unrelated map-card design.
Final: unresolved factual discrepancy: `src/components/hero.tsx:519` and `src/lib/festival.ts:3-4` use 16–18 January 2026, while `src/components/coming-soon.tsx:37` downloads tentative 8–10 January 2027 dates. No authoritative schedule was supplied, so factual copy/calendar dates were not invented or silently changed.
Verification limits: Chromium desktop/mobile emulation, not physical devices or Safari/Firefox; unsupported-blur CSS was reviewed, not exercised in a legacy browser. Contrast checks cover computed solid/gradient/reflection composition and conservative control text backings, not photograph/filter/sibling-overlay pixels; this is not a whole-site WCAG certification. Authenticated profile persistence is fixture-verified only. Unchanged broader `experience.tsx` motion policy and obsolete loader/snitch-specific public tests were not certified. `tests/verify-dragon.spec.ts` was deliberately excluded because it hard-codes localhost:3000 and overwrites screenshots. Unrelated dirty configuration, model/assets, deleted components and installer files are preserved.
Final completion evidence: `npm test` ran ESLint and a fresh Next.js 16.4.6 production build successfully (34/34 pages). `npm run typecheck` completed with no errors; `git diff --check` reported no whitespace errors. The owned production preview was restarted at `http://127.0.0.1:3105`; homepage request returned HTTP 200. A post-rebuild desktop smoke run of genuine frosted glass and reduced-transparency fallback checks passed 2/2 (`test-results/colour-rebuilt-preview`). Task 3 and Task 4 complete; no commits, merges, pushes, dependencies or unrelated asset edits were made.
