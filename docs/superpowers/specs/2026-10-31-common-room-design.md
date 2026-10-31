# TECHNIKA ’27 — Four-House Common Room Design

Date: 2026-10-31
Status: Approved by the user on 2026-11-01, including the scoped design and procedural-3D-first approach for all four houses.

## 1. Outcome and scope

Replace the existing `/account` Common Room presentation with an authenticated, full-screen, interactive 3D environment. The room itself is the navigation surface. Each participant enters the house saved in their existing Supabase profile.

All four houses are in scope. Slytherin is the first vertical slice, not the only delivered house. Gryffindor, Ravenclaw and Hufflepuff must have independent architecture, furniture arrangements, lighting, decorations and environmental motion; a shared room with four palettes is not acceptable.

Preserve the existing project, routes, authentication, account sign-out, house-assignment process and unrelated pages. No House Cup, points, rankings, Gallions, wallet, transactions, rewards, redemption or reward-based challenges. Do not add speculative infrastructure for those features.

## 2. Inspected project and constraints

- Project root: `Technika-27/`; branch at inspection: `latest-update`.
- Next.js 16.4.3 App Router, React, TypeScript and Tailwind 4.
- GSAP, Motion, Lucide, Supabase SSR and Playwright are already installed.
- `src/app/account/page.tsx` calls `getServerSupabase()` and verifies the user with `auth.getUser()` before rendering `AccountRoom`.
- Existing navigation, the dashboard and authentication flows already link to `/account`. Keep that URL.
- `src/lib/houses.ts` provides house normalization, names, mottos and crest paths. Reuse it.
- Local Garamond and Outfit fonts and four house crest images are available. Reuse the existing typography and house tokens for HTML interfaces, with room-local overrides where parchment contrast requires them.
- `profiles` contains `id`, `full_name`, `college`, `phone`, `house`, `created_at` and `updated_at` in the checked-in migration. No announcement, event-registration, avatar, prefect or achievement source is defined in the repository.
- No GLB/GLTF environments, HDR lighting assets, KTX2 textures or standalone ambient audio assets are present.
- The signup implementation references `ensure_my_profile` and `handle_new_user`, which are not defined in the checked-in migrations. Their deployed state is not verified. The Common Room must not call or replace them.
- The existing global experience forces motion on, renders a house switcher and cursor effects, and wraps navigation in an animated door. Isolate those behaviours from `/account` rather than changing them throughout the site.
- The existing `next-env.d.ts` modification belongs to the pre-existing working tree and must remain untouched.

Baseline checks: `npm run typecheck` passes. `npm run lint` reports an existing `react-hooks/set-state-in-effect` error in `src/components/experience.tsx:144` and an unused `ContactForm` import warning in `src/app/contact/page.tsx`. These are not Common Room completion claims.

## 3. Architecture and change boundary

Keep the authenticated server page at `src/app/account/page.tsx`. Replace its current presentation with a small client host that loads the WebGL experience dynamically with SSR disabled at the client boundary, following the installed Next.js documentation.

Primary additions belong under:

- `src/components/common-room/`: experience host, canvas, camera, entrance, interaction objects, four scene modules, panels, audio/settings and a scoped CSS module.
- `src/lib/common-room/`: typed room configuration, static house lore and the server-only data boundary.
- `tests/`: Common Room behaviour and browser checks, with test-only fixtures kept outside application routes.
- `docs/`: feature and asset documentation.

Modify the existing account component/page, dependency manifests and the minimum shared-shell integration needed to suppress conflicting chrome on `/account` only. Keep authentication and house providers mounted. Do not introduce a second authentication system, a public house-preview route, arbitrary account impersonation or a production test bypass.

Use Three.js, React Three Fiber and Drei for WebGL, raycasting and loading helpers; reuse GSAP for the entrance. Do not add a state-management, audio or post-processing dependency when React, CSS and native Web Audio cover the requirements.

Shared geometry/material helpers and interactive-object components are appropriate. The four architectural scene compositions remain separate. House-specific object placement, camera framing, lighting and colour values belong in typed configuration.

## 4. Identity and data safety

### Participant and assigned house

Authenticate on the server before reading participant data. Fetch the current user's profile using the verified user ID, normalize `profiles.house` with the existing helper, and accept only the four canonical houses.

Do not select the room from localStorage, a theme-provider override, query parameters, browser-editable auth metadata or the signup implementation's random fallback. Missing/invalid house assignment and failed profile retrieval are separate states with explanatory copy and recovery navigation. Neither state silently assigns a house or starts a default room.

Use the profile name, falling back to the authenticated user's display-name metadata and then a neutral greeting. Show the verified user's own email only in the personal panel. Preserve existing sign-out and return-to-festival navigation.

### House directory

Read only safe member fields, filtered to the authenticated participant's house. Return a bounded, paginated list with loading, empty, error and retry states. Do not fetch other participants' phone numbers, email addresses, private account metadata or registration records. Render participant-controlled strings as text, never HTML.

Names and house identity are the available directory content. Use neutral initials when pictures are unavailable. Do not invent member photos, prefect roles, achievements or biographies. Any member detail view must remain limited to the same safe fields.

### Missing sources

Provide explicit typed availability states for announcements, official schedule, workshops, registration status, participation history, prefects and achievements. An unavailable integration is not an empty live query result.

Do not create guessed tables or present static examples as live data. Production panels explain which information has not been connected. Development/test fixtures, if needed, must be explicitly labelled and excluded from production entry paths.

The existing festival schedule has inconsistent year/date content relative to this feature. Do not import it as a confirmed Technika ’27 schedule or edit the unrelated festival source.

### Existing database risk

The checked-in `profiles` SELECT policy permits public reads of entire rows, including phone numbers. Narrow Common Room queries prevent this feature from fetching those fields but do not fix that existing database exposure. Do not claim the underlying database is secured by a frontend projection. A policy/grant migration requires separate approval and is outside this scoped implementation.

No schema, RLS, RPC, credentials or authentication-flow changes are approved by this design.

## 5. Four distinct environments

Use a consistent world scale and deliberately composed perspective views. Every room must be readable before interaction, with a focal architectural feature, visible spatial depth and five discoverable objects.

### Slytherin — The Serpent’s Den

A low, vaulted Gothic chamber beneath the lake. Tall, deep-set underwater windows dominate the far wall. Stone ribs, dark marble floor geometry, silver metalwork and serpent ornaments frame emerald leather seating. The hearth occupies a distinct masonry alcove rather than replacing the underwater focal point.

Motion: slow caustic-like light movement, distant creature silhouettes beyond the glass, suspended particles and restrained serpent ornament movement. Lighting stays dark emerald and silver, not fluorescent green.

### Gryffindor — The Lion’s Hearth

A taller, timber-and-stone hall centred on a large working fireplace. Oak beams, a raised hearth, burgundy seating, tapestries, a sword display and a substantial wooden table create a warm, layered composition. The room must not reuse Slytherin's window wall or vault layout.

Motion: layered fire, floating embers, warm candle flicker and slight textile movement. Antique gold accents and red upholstery remain legible in the warm light.

### Ravenclaw — The Celestial Observatory

A circular tower room with radial shelving, arched openings and a celestial ceiling. An astronomical globe, brass telescope, elevated books and a circular floor motif establish an observatory rather than a rectangular sitting room. A compact hearth remains physically present as the archive interaction.

Motion: slowly rotating celestial instruments, floating books, star twinkle and sparse dust. Blue, silver and bronze light/material contrast replaces the other houses' compositions.

### Hufflepuff — The Hearth Garden

A low, rounded underground room with a circular wooden entrance, curved timber ribs, planted alcoves, terracotta vessels and a garden-facing light well. Rounded wooden furniture and warm lanterns establish a different silhouette from the other houses.

Motion: restrained leaf and plant movement, butterflies and lantern flicker. Warm daylight, yellow textiles and earthy materials support a welcoming atmosphere.

## 6. Asset honesty and production path

The initial environments use real procedural 3D geometry, not background photographs or a flat image with hotspots. Geometry, materials, lighting and animated props must exist in the scene graph.

These are functional, art-directed prototype assets, not finished AAA models. Document that distinction in the feature/asset notes and expose a discreet prototype-asset note in settings, rather than claiming production-ready architectural assets.

Reuse geometries/materials and instance repeated books, masonry, candles, leaves or particles where practical. Prefer restrained material roughness, procedural surface variation and coherent lighting over excessive bloom or expensive screen effects.

Keep asset substitutions local to scene/prop modules. When finished licensed models become available, use compressed GLBs, baked static lighting and appropriately sized textures, recording provenance and licence. Do not ship dead asset URLs, unlicensed downloads or claims that Draco/KTX2 compression was applied to nonexistent assets.

## 7. Entry, camera and interaction state

After the route and scene are ready, run an approximately four-second entrance: closed house entrance, door opening, controlled camera move into the room, then a welcome overlay. Include the emblem, house name, participant name and existing motto. A visible keyboard-accessible skip control immediately resolves to the same usable end state.

Use real loading stages or asset progress when available; do not fabricate a percentage or extend loading artificially. The welcome overlay fades away without permanently obstructing the room.

One coordinator owns entrance, exploration, object focus, panel display and restoration. Avoid multiple animations competing for the same camera.

During exploration:

- Smooth pointer parallax with approximately 2–4 degrees maximum rotation and small translation.
- Damped interpolation, no orbit/free-fly controls and no uncontrolled camera movement.
- Reduced amplitude on coarse pointers; mobile does not depend on hover or motion-sensor permissions.
- Subtle hover focus, material highlighting and a small anchored label.

On selection, snapshot the current camera position, quaternion, focus target and relevant projection state before moving. Lock conflicting object interactions, play the object's animation and focus the camera. Closing the panel animates away, restores that saved pose, restores keyboard focus to the opener and only then re-enables exploration. Do not jump immediately to a different pointer-derived view on close.

Reduced motion skips spatial entrance/focus animation and disables parallax and continuous environmental movement while preserving all object actions and readable state changes.

## 8. Five physical navigation objects

1. **Grand fireplace — House Archives**
   - Hover brightens flames and reveals the label.
   - Opens house emblem, name, motto, values, description and clearly editorial fictional lore/history. Prefect data appears only when an actual source exists.
2. **Magical notice board — Notices**
   - Parchment highlights on hover; opening reveals the notice interface with restrained paper/letter motion.
   - Separates announcement, schedule and workshop availability. No invented published dates or server-synced unread state.
3. **Enchanted bookshelf — House Community**
   - Books shift subtly on hover and a selected volume slides out.
   - Opens the safe, same-house directory and public detail content described above.
4. **Personal belongings chest — Your Belongings**
   - Hover feedback and an opening lid on selection.
   - Opens the verified participant's profile, assigned house and honest registration/history integration states. No wallet or currency.
5. **Secret door — Hidden Passage**
   - Restrained rune illumination, unlocking motion and a door that reveals a physically modelled passage/alcove.
   - Camera reveals the secret area and opens a house-specific original riddle or magical message. No reward, points, ranking or invented official fest secrets.

All five are actual raycastable scene objects. Provide a compact, optional keyboard/touch object guide as an accessible alternative, not a permanent card dashboard. The guide invokes the same interaction coordinator as the 3D objects.

## 9. Interface and accessibility

The full-screen canvas remains visually dominant. Minimal chrome contains the house emblem/identity, exit control, sound control, settings and unobtrusive exploration guidance. Keep logout available without removing existing account functionality.

Use Garamond for headings and Outfit for readable body copy. Panels use textured parchment treatment, house accents, decorative borders and restrained shadows. Panel content must scroll independently of the room and the site's Lenis scrolling.

Use accessible modal semantics for panels/settings, Escape to close, trapped focus, an explicit close button and focus restoration. Ensure touch targets, text contrast, screen-reader names, long-name wrapping and viewport-safe layouts. The WebGL canvas is not the only way to reach participant information.

Settings cover visual quality, motion preference and sound. Defaults respect reduced motion; any user override is explicit. Do not make changes to unrelated site-wide motion controls.

## 10. Sound and performance

Audio defaults to off. Begin/resume only after an explicit user gesture. Provide separate ambient and interaction controls if practical, conservative gain levels, fade-in/out, and clean suspension/disposal on hidden tabs or navigation.

With no licensed sound files present, native Web Audio may supply clearly documented synthetic prototype ambience and soft interaction cues. Do not describe these as recorded fireplace or garden audio.

Performance requirements:

- Lazy-load the WebGL bundle and only the assigned architectural scene.
- Adaptive pixel ratio; low/medium/high quality settings with conservative mobile defaults.
- Shared resources and instancing for repeated props.
- At most one primary real-time shadow source in the initial implementation; disable/reduce shadows on low quality.
- No heavy post-processing dependency in the prototype.
- Pause rendering and audio while the tab is hidden; resume without large animation-delta jumps.
- Dispose resources and event listeners on unmount.
- Handle module/scene loading failures and WebGL/context loss with an accessible lightweight mode containing the same available information and actions.
- Offer lightweight mode voluntarily as well as on unsupported devices.

## 11. Incremental delivery and verification

1. Establish the server identity/data boundary and account-only presentation isolation.
2. Build the Slytherin vertical slice with real geometry, entrance and all five physical objects.
3. Complete parallax, highlighting, keyboard/touch interaction, modal focus and exact camera restoration.
4. Complete the five panels, safe directory access and explicit missing-source states.
5. Add distinct Gryffindor, Ravenclaw and Hufflepuff architecture and props.
6. Finish house-specific environmental motion, synthetic opt-in audio and cinematic polish.
7. Verify adaptive quality, reduced motion, loading/context-loss fallback and mobile layouts.
8. Run Common Room checks plus existing repository lint/build/browser checks. Report pre-existing failures separately rather than changing unrelated features to make the suite appear green.

Tests must cover: unauthenticated access; absent, invalid and mismatched local/profile houses; all four scene selections; all five object/panel mappings; hover and tap; skip entrance; double selection and interaction locking; Escape/focus restoration; camera restoration; safe directory projections; unavailable/error/empty data states; reduced motion; default-muted audio; tab visibility; unsupported WebGL; long names; narrow/landscape screens; navigation away and cleanup.

Use test-only fixtures or an isolated mock Supabase service for automated authenticated cases, not real account creation, real email delivery, live database writes or a production authentication bypass. Distinguish actual 3D picking tests from tests that use the accessible object guide. Browser tests collect console errors and screenshots for each house.

## 12. Completion criteria

Functional prototype completion requires all four distinct 3D environments, five working physical interactions per house, correctly restored camera/focus state, preserved authentication, profile-authoritative house selection, safe available participant data, mobile/keyboard access, honest unavailable states, loading/fallback support and no newly introduced major console errors or excluded gamification features.

Finished production environment art remains a separate asset-quality milestone. Do not claim the prototype is a delivered AAA environment or that unavailable backend systems are connected.
