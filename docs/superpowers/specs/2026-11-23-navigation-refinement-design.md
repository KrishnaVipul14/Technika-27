# Technika navigation refinement

## Intent and boundary
Improve the navbar and scroll snake for festival visitors finding pages and moving through the site. Preserve the wizarding identity, equipped-house tokens, navigation destinations, account states, book toggle and existing canvas dragon artwork. No hero, content, authentication or model-asset redesign; no new dependencies.

## Approaches
- Cosmetic-only: lowest change surface, but leaves inaccessible hover menus and an intrusive phone drag strip.
- Enchanted brass refinement (selected by the implementer): house-tinted floating glass, engraved active tabs, compact disclosures and a restrained dragon rail. Preserves the established world while fixing interaction problems.
- Full navigation/3D replacement: unnecessary scope and conflicts with ongoing uncommitted dragon work.

## Design system
Mode: Operate, supporting the site's Experience. Keep Outfit for controls and existing Garamond for the Technika wordmark. Reuse `--bg-sunken`, `--surface-1`, `--fg`, `--fg-strong`, `--fg-brand`, `--primary-300`, `--secondary-300` and `--ring`; no new global palette. Default observed palette is near-black glass, parchment foreground and warm brass; houses change the same semantic tokens. The design-system search's generic neon gaming palette was rejected as inconsistent with the incumbent identity.

Desktop: crest/wordmark, central links with separate submenu buttons, account actions. Full links start at 1280px to avoid crowded intermediate widths. Phone/tablet: crest/wordmark, register, book toggle; a protected-focus navigation sheet with compact expandable sublinks and visible account actions. Keep existing link labels and destinations.

Dragon: preserve the serpentine drawing and sparks, start the rail below the navbar, add quiet endpoint marks and a legible progress tooltip. Desktop drag, Arrow/Page/Home/End keys and screen-reader progress work together. Below 768px or on coarse pointers, shrink to a passive right-edge ornament and leave page gestures untouched. Native scrollbar is restored if canvas rendering fails or hiding is disabled.

Final refinement: the dragon settles after a short entrance and resumes briefly after scrolling, rather than looping indefinitely. Forced-colors mode uses the native scrollbar and system-colored menu controls; signed-in account actions wrap at narrow phone widths without shrinking Common Room's 44px target.

## Acceptance and risks
1. Clear current-page state and distinct account action; readable in all five themes.
2. Mouse, keyboard and touch navigation; Escape/outside dismissal and restored focus.
3. No overflow at 320, 390, 768, 1024, 1280 and 1440px, including open menus.
4. Scroll rail does not overlap the navbar, obscure form interaction or consume phone swipes; endpoints map to 0/100% and progress updates after resize/content changes.
5. Reduced motion removes autonomous dragon animation, flame and sparks while preserving instant progress updates; hidden tabs stop rendering.

## Verification
Playwright regression tests against real routes; desktop/mobile browser captures including home and alternate houses; lint, TypeScript and production build. Existing uncommitted changes remain in place. Work runs inline in the existing checkout because the active dragon implementation is uncommitted there; do not commit, stash, reset or relocate that user work.
