# TECHNIKA ’27 Common Room

An authenticated, procedural 3D prototype at **`/account`**. The existing `/dashboard`, registration, login, password recovery and database schema are not replaced by this feature.

## What is implemented

- **Slytherin:** underwater Gothic vault, arched lake windows, serpents and emerald seating.
- **Gryffindor:** tall timber hall, raised hearth, burgundy tapestries, crossed swords and candle chandelier.
- **Ravenclaw:** circular book-lined observatory, celestial dome, moon oculus, telescope, armillary and floating books.
- **Hufflepuff:** low planted burrow, round daylight opening, curved ribs, woven chairs, tea table and butterflies.

These are four independent compositions, not palette swaps. Shared materials and primitives live in `src/components/common-room/scenes/scene-primitives.tsx`; placement/framing lives in `src/lib/common-room/config.ts`.

Shared wizarding set dressing lives in `scenes/wizard-props.tsx`: floating candles, gilded portraits (reusing existing `public/images` artwork), swallow-tailed house banners, Persian rugs, candelabra, spellbook/quill/inkwell table dressing, wall sconces, plus a cauldron (Slytherin) and broom/Golden Snitch (Gryffindor). Stone uses world-space (triplanar) ashlar with derived mortar relief; sofas are tufted Chesterfields; metals reflect a locally generated `Environment` (no HDR download). Generated canvases are cached per page because `RoomMaterials` sits inside Suspense and would otherwise regenerate them on every suspend/retry. Decorative props are not interactive and do not change interaction IDs or placements.

| Physical object | Accessible panel |
| --- | --- |
| Fireplace | House Archives |
| Notice board | Notice Board |
| Bookshelf | House Community |
| Chest | Your Belongings, including the existing sign-out |
| Secret door | Hidden Passage and an original, non-reward riddle |

Real mesh raycasts and the keyboard/touch guide use the same interaction coordinator. The approximately four-second entrance is skippable; parallax is bounded and damped. Closing restores the camera and opener focus. Reduced motion removes spatial/continuous movement. Native parchment dialogs scroll independently. Reading mode uses the same data and panels without WebGL.

Exactly `/account` suppresses competing site chrome, cursor effects, Lenis and page-transition doors. Providers stay mounted; ordinary chrome returns on exit.

## Data and security boundary

`src/lib/common-room/server.ts` verifies `auth.getUser()` before reading the authenticated participant's `profiles` row. **Only the saved profile house chooses the room.** Local preferences, theme previews, query parameters, signup's random fallback and browser-editable metadata cannot choose it.

Missing/invalid assignment, unavailable profile service and signed-out access remain distinct. An account change clears the previous participant and pending directory. The own-account email is confined to Your Belongings.

`GET /api/common-room/members?page=0` re-verifies identity and house, permits pages 0–1000, returns at most 24 names/house values and uses private/no-store responses. It neither accepts a house override nor returns member emails, phones or IDs. It selects only `full_name,house`; stable ordering additionally uses ID without projecting it. Pending reads are cancelled/discarded on close or session change.

No service-role client, credentials, schema, RLS or RPC changes were added. No House Cup, points, rankings, wallets, Gallions, transactions, rewards or redemption were added.

**Existing risk, not fixed here:** `supabase/migrations/202610250002_profiles.sql` has a public `profiles` SELECT policy using `true`, exposing entire rows, including phone numbers. Narrow feature queries do not repair that database policy. Review grants/RLS separately before deployment.

Announcements, a verified ’27 schedule, workshops, participant registration history, avatars, prefects and achievements have no connected source. Panels explicitly report unavailable integrations; they do not invent records. Existing `festival.ts` ’26 dates are not used as a confirmed ’27 schedule. Signup's `ensure_my_profile`/`handle_new_user` deployment remains unverified.

## Assets, settings and lifecycle

Architecture/props and surface maps are generated locally; existing repository crests/fonts are reused. They are **prototype art**, not licensed AAA environment models or scanned PBR materials. Optional ambience/cues are **synthetic Web Audio studies**, not recorded house soundscapes.

Audio is off every visit. Ambient and object sound require explicit opt-in, use one conservative-gain AudioContext, suspend when hidden, require explicit resume and close on navigation. Native audio acknowledgements cannot lock controls or overwrite newer visual settings.

Only validated quality, motion and reading-mode preferences persist under `technika:common-room:v1`; audio does not. Automatic quality is low on coarse pointers, medium otherwise. DPR caps are 1 / 1.25 / 1.75, with adaptive reduction to .65. There is at most one real-time shadow light; low quality disables it. Static scenes render on demand. Hidden tabs stop rendering.

Unsupported/lost WebGL falls back without discarding an open panel. Retry creates a fresh renderer. A failed lazy import requires an explicitly labelled reload because React caches rejected lazy imports. Loading has a 30-second watchdog.

To replace prototype art: substitute local scene/prop modules with licensed, compressed GLBs and appropriately sized textures; prefer baked static lighting, preserve interaction IDs/placements and record licence/provenance. No nonexistent model/compression pipeline is claimed.

## Verification

Run from the repository root:

```sh
npm run test:e2e:room
npm run typecheck
npm run lint
npm test
npm run build
PLAYWRIGHT_PORT=3510 npm run test:e2e
```

The Common Room harness starts a temporary watched Next project and a loopback Supabase HTTP fixture, exercising the real SDK without live credentials, emails or database writes. It never copies `.env*` and blocks external browser traffic. Tests use current headless Chromium on desktop and an iPhone-sized Chromium viewport, **not physical iOS/Safari**.

Verified checkpoints:

- Final complete Common Room gate passed **92/92** (8.6 minutes); the earlier 88-case checkpoint also passed.
- Final-review cases passed 4/4: in-flight account switching and the delayed successful audio-acknowledgement regression on both viewports. The audio regression was observed failing before its fix. A subsequent traced resource/recovery run passed **10/10** and retained renderer-budget JSON.
- Typecheck and scoped feature/test ESLint passed.
- Production `npm run build` passed. `next-env.d.ts` was compared byte-for-byte with its pre-build contents after restoring Next's generated import changes.
- Full `npm run lint` and `npm test` fail on the existing `experience.tsx` synchronous `setReady(true)` effect; `contact/page.tsx` also retains its unused `ContactForm` warning. `npm test` stops at lint, so the production build was run separately.
- Existing-site production suite: **18 passed, 16 failed, 2 skipped**. These failures were reported, not hidden by editing unrelated pages or weakening those tests.

### Existing-site failures

Both desktop and mobile fail these existing `tests/festival.spec.ts` cases:

1. `login exposes the Supabase password recovery flow`
2. `house crest logo and website icons follow the equipped house`
3. `snitch is autonomous, and motion can be paused`
4. `firework dragon is visible and grows down the page`
5. `reduced motion and narrow phone screens remain usable`
6. `the loading sequence reaches 100 before revealing the website`
7. `explicit motion controls can override a reduced-motion system preference`

Additionally: desktop `cards and buttons have visible hover microinteractions`; mobile `mobile navigation supports opening, escape, and route changes`.

Several assertions expect old controls/copy or loader behavior absent from the current site. This is not a claim that the whole website passes, nor a claim that every existing-suite failure was independently reproduced on a pre-feature checkout.

### Resource evidence and limits

Production lazy-manifest sizes (raw / gzip estimate, excluding shared initial app bundles and images):

| Module group | Raw bytes | Gzip bytes |
| --- | ---: | ---: |
| Canvas and shared 3D chunks (7 files) | 1,044,626 | 290,059 |
| Gryffindor scene | 5,665 | 1,997 |
| Hufflepuff scene | 7,847 | 2,566 |
| Ravenclaw scene | 7,582 | 2,359 |
| Slytherin scene | 5,945 | 2,194 |

Only the assigned architecture is lazy-loaded. Scene tests persist actual renderer/draw/triangle/DPR measurements as `render-budget.json` and capture screenshots under `test-results/common-room/`. Recovery tests check live contexts, hidden-tab draws and fresh-renderer re-entry. Responsive parchment checks cover 320×740, 390×844, 844×390 and 768×1024, including paragraph contrast ≥4.5:1 and primary 44×44 controls.

The traced final samples on Intel UHD/D3D11 observed **231–527 draw calls / 43,735–120,098 triangles** on desktop (1440×900, DPR .65–1), and **221–271 draw calls / 37,084–70,010 triangles** on mobile emulation (390×664, DPR 1, shadows off). Shadow-enabled counts include shadow passes. JavaScript draw submission was 1–8ms; frame-pressure diagnostics were 31–52ms. These are individual instrumented samples, **not sustained FPS benchmarks** or acceptable-performance certification.

The legacy headless shell used SwiftShader and produced 1.5–2.2-second frames and unreliable navigation on this host. Switching the harness to current Chromium exposed the available Intel UHD D3D11 renderer. This does **not** establish acceptable performance on software renderers or every physical device; reading mode remains essential. Headless timings are observations, not an FPS guarantee.

Development diagnostics include upstream Three Clock/CJS deprecations and occasional Drei HTML-root unmount warnings during teardown. Real context-loss/chunk-abort tests deliberately produce renderer/chunk errors. The 92-case gate also logged one transient development-layout chunk parse/load error that recovered; the subsequent 10-case traced run did not reproduce it. Its cause is not established, and it is not silently classified as an intentional test error. The checked dependency audit reports 18 advisories (16 moderate, 2 high), with high-severity chains through existing sharp/zod dependencies; no broad audit upgrade was applied.

## Review and remaining checks

The final pass is **author self-review; no independent reviewer tool is available**. Camera/state, all four compositions, server queries, scoped shell changes, real picks, session switching, recovery and sound lifecycle were reviewed. A delayed-success audio race found in that pass received a failing regression and fix.

Before production: audition the synthetic audio at conservative volume; test physical phones/Safari and target GPUs; verify deployed Supabase policies/triggers/RPCs; connect approved data sources; commission/license production art/audio. No push or merge is part of this work.

## Recorded implementation decisions

- Execute in the approved `latest-update` checkout, preserving the existing generated-file modification. Cost: less branch isolation; mitigated with explicit-path commits.
- Copy/watch source in the isolated fixture, rather than junctioning it. Cost: recompilation can briefly lag edits; source junctions stalled Next route discovery.
- Share the HTML panel host across 3D and reading modes and provide an account-actions slot. Cost: one host owns lifecycle coordination, rather than duplicate data implementations.
- Keep one yielding demand-render loop with measured DPR/shadow adaptation. Cost: this local policy needs maintenance; software-renderer limitations remain.
- Use a room-local clock for camera sequences, excluding hidden time. Cost: separate clock lifecycle, covered by entrance/visibility checks; no global GSAP ticker changes.
- Keep native dialogs modal through restoration, then return focus; reconcile changed viewport framing afterward. Cost: closing waits for camera completion.
- Reuse existing lore titles/locations and original editorial riddles; keep unsupported records unavailable. Cost: no live schedule/community roles beyond the connected fields.
- Make audio enables return a result, sequence-guard late acknowledgements and persist visuals only. Cost: rejected audio requires a new explicit user gesture.
- Retry lost contexts with a new canvas, but reload rejected lazy chunks. Cost: chunk recovery resets local view/audio, not authentication or saved profile data.
- Use current headless Chromium and loopback-only fixture traffic. Cost: legacy SwiftShader remains an explicitly unverified slow path.
- Match DOM camera projections within .05 CSS pixels after the guide lock settles; retain exact numeric pose tests. Cost: subpixel projection rounding is intentionally not treated as visible camera drift.
- Give cold compilation/navigation/reload checks their existing 25–30-second loading budget rather than the 12-second interaction budget. Cost: a stalled load takes longer to fail; the production watchdog and direct interaction deadlines are unchanged.
- Human listening, finished art and an independent review are not available through this harness. Cost: subjective audio/art quality and independent approval remain manual.
