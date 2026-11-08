# Four-House Common Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver four distinct, authenticated, interactive procedural 3D Common Rooms at the existing `/account` route without changing unrelated website functionality.

**Architecture:** The server verifies the participant and loads their profile-authoritative house, then passes a minimal DTO to an account-only client experience. A lazy WebGL canvas shares camera/interaction primitives and five physical navigation objects, while four independent scene modules supply architecture and atmosphere. Accessible HTML panels consume safe existing data or explicit unavailable-source states.

**Tech Stack:** Existing Next.js 16.4.3, React, TypeScript, Tailwind/CSS Modules, GSAP, Motion, Supabase SSR, Playwright; add Three.js, React Three Fiber and Drei; native Web Audio for optional synthetic ambience.

**Spec:** `docs/superpowers/specs/2026-10-31-common-room-design.md` — approved by the user on 2026-11-01.

## Global Constraints

- All four houses are in scope. Slytherin is the first vertical slice, not the only delivered house.
- Preserve the existing project, routes, authentication, account sign-out, house-assignment process and unrelated pages.
- No House Cup, points, rankings, Gallions, wallet, transactions, rewards, redemption or reward-based challenges.
- No schema, RLS, RPC, credentials or authentication-flow changes are approved by this design.
- Do not select the room from localStorage, a theme-provider override, query parameters, browser-editable auth metadata or the signup implementation's random fallback.
- Do not create guessed tables or present static examples as live data.
- These are functional, art-directed prototype assets, not finished AAA models.
- Audio defaults to off. Begin/resume only after an explicit user gesture.
- At most one primary real-time shadow source in the initial implementation; disable/reduce shadows on low quality.
- The existing `next-env.d.ts` modification belongs to the pre-existing working tree and must remain untouched.

All paths below are relative to `Technika-27/`. Read `AGENTS.md` and the relevant installed Next.js guides before implementation. Preserve existing uncommitted work. Stage only explicit task paths; do not use `git add .`.

## Review Focus

1. A valid session with an absent, malformed or legacy-format house must never enter an invented house; contradictory local and metadata preferences must not override the profile. Test in Task 1.
2. Session revocation or an account change while a directory request is pending must not leave another participant's information onscreen. Test in Tasks 1–2.
3. Skip, rapid repeated selection and close during a transition must not strand the camera or leave interactions locked. Test in Task 4.
4. Rotation/resizing or WebGL loss while a panel is open must retain readable content, a usable close control and a correctly framed restored view. Test in Tasks 4 and 9.
5. Hidden-tab/resume and navigation away/back must not create duplicate render/audio loops or alter the rest of the site's chrome. Test in Tasks 3, 8 and 9.

## File Map

| Area | Files and responsibilities |
| --- | --- |
| Server entry | Modify `src/app/account/page.tsx`; keep verification/redirects and private metadata, render the new access states. |
| Client boundary | Modify `src/components/account-room.tsx`; authenticated access UI, stale-session protection and client-only lazy experience loading. |
| Data | Create `src/lib/common-room/types.ts`, `server.ts`, `content.ts`; DTOs, verified profile/directory reads, static lore and unavailable-source messages. |
| Directory API | Create `src/app/api/common-room/members/route.ts`; authenticated, bounded, same-house GET only. |
| Experience | Create `src/components/common-room/common-room-experience.tsx`, `room-canvas.tsx`, `room-loader.tsx`, `room-fallback.tsx`, `room-settings.tsx`, `common-room.module.css`. |
| Interaction | Create `src/lib/common-room/interaction.ts`, `camera.ts`, `config.ts`; create `src/components/common-room/camera-controller.tsx`, `room-entrance.tsx`, `interactive-object.tsx`, `room-objects.tsx`, `object-tooltip.tsx`, `object-guide.tsx`. |
| Panels | Create `src/components/common-room/panels/magical-overlay.tsx`, `house-archives-panel.tsx`, `notice-board-panel.tsx`, `members-panel.tsx`, `participant-profile-panel.tsx`, `secret-room-panel.tsx`. |
| Architecture | Create `src/components/common-room/scenes/scene-primitives.tsx`, `slytherin-scene.tsx`, `gryffindor-scene.tsx`, `ravenclaw-scene.tsx`, `hufflepuff-scene.tsx`. |
| Lifecycle | Create `src/components/common-room/use-room-settings.ts`, `use-room-audio.ts`, `render-lifecycle.tsx`. |
| Scoped shell | Minimal changes to `src/app/layout.tsx`, `src/components/experience.tsx`, `page-transition.tsx`, `smoothScroll.tsx`; only `/account` suppresses conflicting chrome/effects/scrolling. |
| Dependencies | Modify only `package.json` and its lockfile for the 3D dependencies and the Common Room test command. |
| Tests | Create `playwright.common-room.config.ts` and `tests/common-room/` helpers and `*.room.ts` suites. Existing Playwright discovery stays unchanged. |
| Notes | Create `docs/common-room.md` with asset limitations, data boundaries, commands and verification results. |

Do not split additional wrappers or introduce generalized managers unless a working implementation actually needs them. Keep shared helpers local to this feature.

## Task 1: Profile-authoritative account boundary

**Files:** Data `types.ts`/`server.ts`, account page/component, test configuration, `tests/common-room/server.mjs`, `fixtures.ts`, `access.room.ts`; add the test script to `package.json`.

**Interfaces:**

```ts
type AssignedHouse = Exclude<House, "default">; // House comes from existing lib/houses.
type RoomParticipant = { id: string; displayName: string; email: string; college: string | null; house: AssignedHouse };
type RoomAccess =
  | { status: "ready"; participant: RoomParticipant }
  | { status: "signed-out" }
  | { status: "unassigned"; displayName: string }
  | { status: "unavailable" };
// server.ts, marked server-only:
loadRoomAccount(client: SupabaseClient | null): Promise<RoomAccess>;
// Existing client component receives only the authenticated branches:
AccountRoom({ access }: { access: Exclude<RoomAccess, { status: "signed-out" }> });
```

- [ ] **Create the isolated test fixture and failing access tests.** Add `"test:e2e:room": "playwright test --config=playwright.common-room.config.ts"`. The new configuration discovers only `tests/common-room/*.room.ts`, uses one worker to avoid shared-fixture races, and defines logic, desktop (1440×900) and mobile (390×844 with touch) projects. Only the logic project selects `logic.room.ts`; the browser projects exclude it. Use the existing Playwright package and Node HTTP/crypto/process/filesystem libraries. `server.mjs` starts a loopback-only Supabase fixture and a Next development server in a temporary project root. Link `src`, `public` and `node_modules` (directory junctions on Windows); copy the non-secret package/Next/TypeScript/PostCSS configuration files. Do not copy `.env*`; set fixture URL/key only in the child environment. Generated Next files stay in the temporary root, not the user's working tree. Close child processes and remove temporary resources on exit. Fixtures implement the auth/profile HTTP boundaries exercised by the real Supabase SDK, including valid test sessions; they never bypass application authentication.
- [ ] **Define test helpers in `fixtures.ts`.** `signInFixture(page, scenario)` authenticates through the local fixture using the real Supabase SDK and correctly encoded SSR cookies. Scenarios cover each canonical house, mixed-case/whitespace house values, absent/invalid profiles, profile failure, contradictory metadata and revoked sessions. `fixtureRequests()` exposes captured HTTP method/path/query data for boundary assertions; `setFixtureScenario()` changes only the isolated fixture's responses. Unknown or mutating profile/RPC requests fail the fixture test.
- [ ] **Write and run `access.room.ts` against the unchanged page.** Name the breaks: trusting the theme provider, treating a query error as unassigned, and leaking a previous account's DTO. Assert the following independent outcomes:
  ```ts
  expect(unsignedResponse.status()).toBe(307);
  expect(unsignedResponse.headers().location).toMatch(/\/login$/);
  await expect(page.getByTestId("common-room")).toHaveAttribute("data-house", "slytherin"); // Profile says Slytherin; local/metadata say Gryffindor.
  await expect(page.getByRole("heading", { name: /house assignment pending/i })).toBeVisible(); // No valid profile house.
  await expect(page.getByRole("button", { name: /retry profile/i })).toBeVisible(); // Profile read failed.
  await expect(page.getByTestId("common-room").locator("canvas")).toHaveCount(0); // No room canvas in either non-ready state; unrelated global canvases are not under this gate.
  ```
  Run `npm run test:e2e:room -- --project=desktop --grep "account access"`; confirm failures concern missing account states, not fixture/network errors.
- [ ] **Implement `loadRoomAccount` and wire `/account`.** Reuse `getServerSupabase`, `getUser`, `houseFromValue` and `createPrivateMetadata`. Select only `full_name,college,house` for the verified ID. A query error becomes `unavailable`; missing/invalid/default house becomes `unassigned`. The page redirects `signed-out` to the existing login. Update this page's metadata to Technika ’27; do not change other pages' date copy. Reuse the existing sign-out implementation. Use `useAuth` in the client host to hide stale content on confirmed sign-out/account change and refresh the server entry, without restarting the room for a same-user token refresh.
- [ ] **Verify and checkpoint.** Re-run the access command and `npm run typecheck`; expect the new access tests and typecheck to pass. Capture any fixture portability issue before building scenes. Commit only Task 1 paths with `feat: anchor common room to verified profile`.

## Task 2: Five useful panels, safe directory and lightweight access

**Files:** `content.ts`, the directory API, six panel files, `room-fallback.tsx`, `common-room.module.css`, `tests/common-room/panels.room.ts`; extend `server.ts`/`types.ts` and the account host.

**Interfaces:**

```ts
type ObjectId = "archives" | "notices" | "members" | "profile" | "secret";
type RoomMember = { name: string; house: AssignedHouse };
type MembersResult =
  | { status: "ready"; house: AssignedHouse; members: RoomMember[]; nextPage: number | null }
  | { status: "unavailable"; message: string };
loadRoomMembers(client: SupabaseClient, house: AssignedHouse, page: number): Promise<MembersResult>;
// GET /api/common-room/members?page=0 re-verifies the session AND profile house.
// The client cannot choose a house or user ID through this endpoint.
MagicalOverlay({ open, title, onClose, onExited, children });
HouseArchivesPanel({ house }); NoticeBoardPanel(); MembersPanel({ house, onSessionExpired });
ParticipantProfilePanel({ participant }); SecretRoomPanel({ house });
RoomFallback({ participant, reason }); // Uses the same panels, not a second data implementation.
```

Give these React props explicit TypeScript types: booleans/strings as named, `children: ReactNode`, `onClose`/`onExited`/`onSessionExpired: () => void`, house and participant from Task 1, and `reason: "chosen" | "unsupported" | "loading-error" | "context-lost"`. `content.ts` exports `houseLore: Record<AssignedHouse, { description: string; history: string; riddle: string; answers: string[]; secretMessage: string }>` and `unavailableSources`, keyed by announcements, schedule, workshops, registrations, history, prefects and achievements. Each unavailable source has `{ status: "unavailable"; message: string }`; do not invent backend record types or tables.

- [ ] **Write failing panel/data tests.** Assert all five named panels open and close with Escape; the opener regains focus; Tab stays inside the modal; notices report unavailable rather than zero live announcements; own email appears only in the personal panel; member entries contain neither fixture phone nor email. Authenticate the real API request and inspect its emitted Supabase query projection/filter. Check an unauthenticated API request is 401, invalid page is 400, missing valid house is 403, and a successful page returns at most 24 members plus `nextPage` without any other-house records.
  ```ts
  expect(JSON.stringify(await directoryResponse.json())).not.toContain("PRIVATE_PHONE_FIXTURE");
  expect(JSON.stringify(await directoryResponse.json())).not.toContain("private-member@example.invalid");
  await expect(page.getByRole("dialog")).toHaveCount(0); // After Escape.
  await expect(opener).toBeFocused();
  ```
  Also test empty/error/retry responses, long names, harmless rendering of HTML-like names, valid/invalid riddle answers, and revocation during an in-flight directory request.
- [ ] **Run the red check.** `npm run test:e2e:room -- --project=desktop --grep "panels|directory"`; observe missing behaviours.
- [ ] **Implement the authenticated directory GET and loader.** Accept only decimal integer page values from 0 through 1000, return private/no-store responses, and request 25 rows to render 24 with a next-page indicator. Select `full_name,house` only, sort consistently by name then ID without returning the ID, and filter by the verified house. For legacy formats, use a canonical-house-derived case-insensitive filter and normalize/filter returned houses again before returning DTOs. Mark the wildcard legacy-query ceiling with a `ponytail:` comment: normalized/indexed house data requires a separately approved migration if scale demands it. Do not cache results across users. Abort/discard stale requests; 401 or an unexpected returned house clears the directory and refreshes the account gate.
- [ ] **Implement the panels and lightweight view.** Use a native modal dialog, CSS opening/closing treatment, explicit close button and controlled focus restoration. Apply `data-lenis-prevent` to panel scrollers. Reuse fonts, crests and mottos. Mark newly written house history as fictional lore; omit unsupported roles/photos/achievements. Riddles normalize trimmed, lower-case answers and reveal messages without rewards. The initial accessible view provides useful account access while WebGL is built in the following tasks.
- [ ] **Verify and checkpoint.** Re-run panel/directory tests plus access tests and typecheck; commit the listed files with `feat: add safe common room information panels`.

## Task 3: Scoped immersive shell and Slytherin architecture

**Files:** Dependency manifests; `config.ts`; experience/canvas/loader; scene primitives and Slytherin scene; physical object modules; scoped CSS; the four shared-shell files; `tests/common-room/scenes.room.ts`.

**Interfaces:**

```ts
type Vec3 = [number, number, number];
type Quality = "low" | "medium" | "high";
type ObjectPlacement = { position: Vec3; rotationY: number; focusPosition: Vec3; focusTarget: Vec3 };
type HouseRoomConfig = {
  title: string;
  camera: { position: Vec3; target: Vec3; fov: number; entrancePosition: Vec3 };
  objects: Record<ObjectId, ObjectPlacement>;
  palette: { stone: string; wood: string; metal: string; fabric: string; light: string; fog: string };
};
// config.ts exports roomConfigs: Record<AssignedHouse, HouseRoomConfig>.
type SceneProps = { house: AssignedHouse; quality: Quality; motion: boolean };
SlytherinScene(props: SceneProps); // Architecture/decorations; interaction props are handled by RoomObjects.
RoomObjects({ house, hovered, selected, disabled, onHover, onSelect });
// hovered/selected: ObjectId|null; disabled:boolean; onHover:(ObjectId|null)=>void; onSelect:(ObjectId)=>void.
CommonRoomExperience({ participant }: { participant: RoomParticipant });
RoomCanvas({ participant, quality, motion, onReady, onFailure }); // Initial Task 3 contract; expanded explicitly in Task 4.
RoomLoader({ stage }: { stage: string });
```

For this initial canvas contract, participant/quality use the types above, `motion: boolean`, `onReady: () => void`, and `onFailure: (reason: "loading-error" | "context-lost" | "unsupported") => void`.

- [ ] **Write failing scene/scope tests.** After authenticated Slytherin entry, require a visible WebGL canvas and the Slytherin room title, with no site header/footer, house switcher or global wand overlay in the room. Navigate back to the festival and require the existing chrome to return. Collect `pageerror` messages and a scene screenshot; a canvas alone does not prove correct art. Test that other authenticated houses retain truthful lightweight access until their scene modules are implemented, never a Slytherin room labelled as another house.
- [ ] **Run the red check.** `npm run test:e2e:room -- --project=desktop --grep "Slytherin architecture|room shell"`.
- [ ] **Install the compatible 3D dependencies.** Registry compatibility checked at planning: `three@0.187.0`, `@react-three/fiber@9.8.2`, `@react-three/drei@10.7.9`, dev `@types/three@0.187.0`. Fibre's React peer range includes the installed React 19.3.0. Recheck before installing if the runtime has changed; do not upgrade React or Next. Keep the exact lockfile results. No post-processing/audio/state dependency.
- [ ] **Implement the account-only shell.** Give `Experience` typed `header` and `footer` ReactNode slots from the root layout and omit those slots/global decorative effects only for `/account`. Keep auth/house providers. Gate `PageTransition` for links into and navigation within/from `/account` so its SVG door does not compete with the 3D entrance. Make SmoothScroll skip its Lenis instance on `/account` and restore normal behaviour on exit. Keep hooks unconditional and effect cleanup explicit; do not alter behaviour on other routes.
- [ ] **Implement the lazy client canvas and actual Slytherin geometry.** Use a static dynamic import in a client module, local CSS and the existing crest/fonts. Place the underwater window wall, Gothic ribs, marble floor, seating, serpents and hearth alcove with controlled depth and a composed camera. Add restrained underwater light movement, creature silhouettes beyond the windows, particles and serpent motion that all obey `motion`. `RoomObjects` supplies a real fireplace, notice board, bookshelf, chest and secret door using configured positions. Reuse geometries/materials and instance repetition. Do not load placeholder GLB URLs, photographic room backgrounds or remote textures. Unimplemented houses temporarily use Task 2's lightweight mode.
- [ ] **Verify and checkpoint.** Run the scene/scope tests, inspect the screenshot at 1440×900, and run typecheck. Make the room legible and coherent before adding more effects. Commit with `feat: build Slytherin common room geometry` using the Task 3 path list.

## Task 4: Entrance, actual 3D picking and reversible camera interactions

**Files:** `interaction.ts`, `camera.ts`, camera/entrance/interactive-object/tooltip/guide modules; wire canvas/experience/objects/panels; `tests/common-room/logic.room.ts`, `interaction.room.ts`.

**Interfaces:**

```ts
type RoomPhase = "loading" | "entering" | "exploring" | "focusing" | "panel" | "closing" | "restoring";
type RoomState = { phase: RoomPhase; hovered: ObjectId | null; selected: ObjectId | null };
type RoomAction =
  | { type: "READY" | "SKIP" | "ENTERED" | "FOCUSED" | "CLOSE" | "PANEL_EXITED" | "RESTORED" }
  | { type: "HOVER"; id: ObjectId | null }
  | { type: "SELECT"; id: ObjectId };
roomReducer(state: RoomState, action: RoomAction): RoomState;
type CameraPose = { position: Vec3; quaternion: [number, number, number, number]; target: Vec3; fov: number; zoom: number };
captureCameraPose(camera: PerspectiveCamera, target: Vector3): CameraPose;
restoreCameraPose(camera: PerspectiveCamera, target: Vector3, pose: CameraPose): void;
CameraController({ house, state, dispatch, motion, controlsLocked });
RoomEntrance({ house, progress }); // progress is the shared entrance animation's 0–1 value, not fake load progress.
ObjectTooltip({ id, label, visible }); ObjectGuide({ disabled, onSelect });
```

Use `Dispatch<RoomAction>` for dispatch and the existing house/boolean types for other props; tooltip `id: ObjectId`, `label: string`, `visible: boolean`; guide `onSelect: (id: ObjectId) => void`. Expand Task 3's `RoomCanvas` props to include `state: RoomState`, `dispatch: Dispatch<RoomAction>` and `controlsLocked: boolean`; preserve its other props. The state machine, not the component tree, controls when an action is accepted. The camera snapshots numeric copies, not live vector references; viewport aspect remains current after resizing.

- [ ] **Write failing logic and browser tests.** Pin rejected conflicting selections, ignored stale completion callbacks, skip reaching exploration and a completed close returning to exploration. With a real Three PerspectiveCamera, capture a pose, mutate the camera/target, restore and assert literal position/quaternion/fov/zoom values; assert the snapshot did not mutate and a newly resized aspect is not overwritten.
  ```ts
  expect(roomReducer({ phase: "panel", hovered: null, selected: "archives" }, { type: "SELECT", id: "profile" }).selected).toBe("archives");
  expect(roomReducer({ phase: "entering", hovered: null, selected: null }, { type: "SKIP" }).phase).toBe("exploring");
  expect(camera.position.toArray()).toEqual([1, 2, 3]); // Explicit fixture pose after restoration.
  ```
  Browser cases cover all five object-to-panel mappings, pointer movement/parallax, hover feedback, Escape, keyboard guide selection, click locking, fast skip/double-click and resize while a panel is open.
- [ ] **Exercise real raycasts in the tests.** Use the real projected tooltip anchors (pointer-events disabled) to locate each object's screen-space target, then issue `page.mouse.click` or touch taps at that point on the canvas. Do not click the accessible guide and call that a raycasting test. Also test the guide separately. Inspect before/focused/after screenshots of static architecture and the reducer/camera checks together; do not expose test-only camera globals in production.
- [ ] **Run the red check.** `npm run test:e2e:room -- --grep "interaction|camera|entrance"`; expect absent interaction/camera behaviours to fail.
- [ ] **Implement the reducer and reversible camera.** Clamp parallax to approximately 3 degrees with small translation and frame-rate-independent damping; reduce amplitude for touch. Freeze input during focus/panels, capture the exact pre-selection pose, transition to configured focus, and restore after the closing panel exits. Resume parallax from the saved view rather than snapping to a changed cursor. Route settings/guide modal locks through `controlsLocked`; neither may start a competing camera animation.
- [ ] **Implement the entrance and object animations.** A four-second GSAP sequence opens the physical entrance and moves the camera inside, followed by a temporary emblem/name/motto welcome. Skip kills the timeline and sets its final state. Model readiness, not an artificial timeout, starts the entrance. Pointer events stop propagation and select only when exploration is enabled. Animate fire intensity, notice paper, book slide, chest lid and secret-door unlocking. The secret camera focus reveals actual passage geometry. Reduced motion resolves entrance/focus/close without spatial motion. Clean up tweens on unmount.
- [ ] **Verify and checkpoint.** Run logic/interaction tests on desktop and mobile, inspect camera composition and restore screenshots, run typecheck and commit with `feat: add physical room interactions and camera transitions`.

## Task 5: Gryffindor — The Lion’s Hearth

**Files:** `scenes/gryffindor-scene.tsx`, its configuration and lazy scene mapping; extend `scenes.room.ts` and the interaction parameter cases.

**Interfaces:** `GryffindorScene(props: SceneProps)`; consumes the Task 3 shared primitives and Task 4 object/camera coordinator without changing their contracts.

- [ ] **Write the failing house test.** Authenticate a Gryffindor fixture; require its own room title/canvas, successful raycast-to-panel mapping for all five objects, a visible large hearth composition and no Slytherin underwater-window composition. Save a house-specific screenshot for visual review rather than testing only `data-house`.
- [ ] **Run red.** `npm run test:e2e:room -- --project=desktop --grep "Gryffindor"`.
- [ ] **Implement independent architecture.** Tall timber-and-stone hall, raised large fireplace, oak beams/table, burgundy upholstered seating, sword display and tapestries. Add warm candle flicker, embers and restrained fabric movement that obey the motion flag. Configure distinct object placements/camera/fog/materials and wire only this scene's lazy import.
- [ ] **Verify and checkpoint.** Re-run Gryffindor desktop/mobile tests, inspect the screenshots against Slytherin for genuinely different silhouette/material/light distribution, run typecheck and commit with `feat: add Gryffindor hearth environment`.

## Task 6: Ravenclaw — The Celestial Observatory

**Files:** `scenes/ravenclaw-scene.tsx`, configuration/lazy mapping and house test cases.

**Interfaces:** `RavenclawScene(props: SceneProps)`; same shared interaction contract, independent composition.

- [ ] **Write the failing house test.** Authenticate Ravenclaw; require its own scene, all five actual picks/panels, observatory composition screenshot and globe/book movement when motion is enabled versus a static view when disabled.
- [ ] **Run red.** `npm run test:e2e:room -- --project=desktop --grep "Ravenclaw"`.
- [ ] **Implement independent architecture.** Circular tower, radial tall shelves, celestial ceiling/night openings, circular floor treatment, brass telescope/globe and a physically present archive hearth. Add floating books, slow instrument rotation, star twinkle and sparse dust; blue/silver/bronze materials rather than another room's palette swap.
- [ ] **Verify and checkpoint.** Run Ravenclaw desktop/mobile tests, inspect static and animated scene composition, run typecheck and commit with `feat: add Ravenclaw observatory environment`.

## Task 7: Hufflepuff — The Hearth Garden

**Files:** `scenes/hufflepuff-scene.tsx`, configuration/lazy mapping and house test cases.

**Interfaces:** `HufflepuffScene(props: SceneProps)`; completes the four-house lazy scene mapping.

- [ ] **Write the failing house test.** Authenticate Hufflepuff; require its own scene, five actual picks/panels, round entrance/garden composition screenshot and plant/butterfly motion obeying reduced motion.
- [ ] **Run red.** `npm run test:e2e:room -- --project=desktop --grep "Hufflepuff"`.
- [ ] **Implement independent architecture.** Rounded low underground room, circular wooden entrance, curved ribs, daylight well, planted alcoves, terracotta vessels, rounded furniture and lanterns. Add leaves/plants/butterflies with conservative geometry/instance counts. Finish all four entrance treatments and remove the intermediate unimplemented-house fallback branch; retain the real accessibility/error fallback.
- [ ] **Verify and checkpoint.** Run Hufflepuff and all-house mapping tests on desktop/mobile, inspect all four images side by side, run typecheck and commit with `feat: add Hufflepuff garden environment`.

## Task 8: Quality/motion settings and opt-in house ambience

**Files:** Settings and audio hooks/components, shared CSS, scene flag wiring, `tests/common-room/lifecycle.room.ts` and settings test cases.

**Interfaces:**

```ts
type RoomSettings = { quality: "auto" | Quality; motion: "system" | "on" | "off"; ambient: boolean; effects: boolean; lightweight: boolean };
useRoomSettings(): { settings: RoomSettings; update: (patch: Partial<RoomSettings>) => void; quality: Quality; motion: boolean };
useRoomAudio(house: AssignedHouse): {
  setEnabled: (ambient: boolean, effects: boolean) => Promise<void>;
  play: (cue: "door" | "book" | "magic") => void;
  unavailable: boolean;
};
RoomSettingsPanel({ settings, onChange, audioUnavailable });
```

`onChange` has the hook's patch signature. Keep sound disabled at the start of each session even if visual preferences are restored from storage. Audio enabling is awaited directly from a user action; automatic effects must not create/resume a new AudioContext.

- [ ] **Write failing lifecycle/settings tests.** Track the real browser AudioContext constructor in test init instrumentation, not a fake implementation. Assert no context before opt-in, separate ambient/effect toggles, mute stopping output, one context after repeated enabling, suspension while hidden and closure on navigation. Test unsupported audio as a nonfatal state. Verify system reduced motion disables camera/environment motion and explicit motion settings work without changing another route's global preference.
- [ ] **Run red.** `npm run test:e2e:room -- --project=desktop --grep "audio|settings|motion"`.
- [ ] **Implement the settings and native audio.** Persist only validated visual settings under a Common Room-specific key; storage failures must be harmless. Default automatic quality to low on coarse pointers and medium otherwise. Use conservative synthetic noise/tones for house ambience and door/book/magical cues, separate gains and a master gain at or below 0.06, short ramps rather than sudden playback. Suspend on hidden, close on unmount and handle rejected context/resume requests. Show the prototype-asset/synthetic-audio disclosure in settings.
- [ ] **Verify and checkpoint.** Run settings/audio/motion and navigation-cleanup tests, manually listen at a conservative system volume, run typecheck and commit with `feat: add restrained common room ambience and settings`.

## Task 9: Adaptive rendering, responsive overlays and failure recovery

**Files:** `render-lifecycle.tsx`, canvas/loader/fallback/settings/host, responsive CSS and lifecycle/access/interaction tests.

**Interfaces:** `RenderLifecycle({ motion, quality }: { motion: boolean; quality: Quality })` operates inside the R3F canvas. `RoomCanvas({ participant, state, dispatch, quality, motion, controlsLocked, onReady, onFailure })` uses the types already defined; `onReady: () => void`, `onFailure: (reason: "loading-error" | "context-lost" | "unsupported") => void`. The host retains participant and active panel state independently of WebGL so a renderer failure does not discard readable content.

- [ ] **Write failing recovery/responsive tests.** Emulate unavailable WebGL before page load, abort the actual lazy scene chunk request, and trigger real `WEBGL_lose_context` where supported. Require lightweight information/actions and a recover/retry control, not a blank screen or reload loop. Lose the context with a panel open and verify content/close remain available. Test 320×740, 390×844, 844×390 and 768×1024 for overflow, scrolling and usable controls. Check touch targets are at least 44×44 CSS pixels where used for primary controls.
- [ ] **Add visibility/resource tests.** Instrument the real WebGL draw methods in test helpers, dispatch the browser-visibility boundary and assert draw counts stop while hidden and resume only when appropriate. Verify no fast-forward motion jump, no duplicate loop/context after re-entry, and no non-assigned scene chunk requests. Check each quality level remains functional; a static reduced-motion canvas must redraw on interaction or resize without continuous animation.
- [ ] **Run red.** `npm run test:e2e:room -- --grep "fallback|responsive|visibility|quality|cleanup"`.
- [ ] **Implement adaptive lifecycle and recovery.** Cap DPR at 1 / 1.25 / 1.75 for low/medium/high, use Drei's existing performance helpers to lower it within those caps under sustained frame pressure, reduce repeated geometry/particles by quality, disable low-quality real-time shadows and limit other qualities to one shadow light. Use on-demand rendering for static/reduced-motion scenes and pause all rendering on hidden tabs. Clamp per-frame motion delta after resumption. Dispose listeners, procedural textures/materials/geometries and tweens according to ownership. Catch lazy-load/render errors and context loss without exposing private exception details. Keep manual lightweight mode and retry available, using the same panels and auth gate.
- [ ] **Finish responsive framing and modal polish.** Adjust the controlled camera/framing for portrait and landscape without free orbit. Maintain safe-area-aware chrome, readable parchment, independently scrollable panels and keyboard focus. Do not depend on hovering to locate or activate an object. Verify ordinary navigation and scroll behaviour return after leaving `/account`.
- [ ] **Verify and checkpoint.** Run the recovery/responsive/lifecycle suite and all-house interaction tests, inspect screenshots at every listed viewport, run typecheck and commit with `perf: harden common room rendering and recovery`.

## Task 10: Whole-feature review, regression checks and honest handoff

**Files:** `docs/common-room.md`, feature tests as needed and only implementation files with verified Common Room defects.

**Interfaces:** No new runtime interfaces. Produce a verification record tied to commands/screenshots and a clear list of unavailable data/production-art dependencies.

- [ ] **Review the actual diff against the spec.** Trace all five interactions in all four scenes, including true raycasts. Verify server-only queries, participant-switch cleanup, no service-role usage, no schema writes, no placeholder live records and no excluded gamification actions. Review shader/material output and camera framing visually, not just through DOM assertions. Confirm changes to shared components are `/account`-scoped.
- [ ] **Run the complete Common Room suite.** `npm run test:e2e:room`; expect all logic, desktop and mobile cases to pass with no unexplained major page errors. Save house/viewport screenshots and inspect them. If hardware/WebGL prevents a case, report it as unverified, not passed.
- [ ] **Run repository checks separately so a failure does not skip subsequent evidence.** `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, then `npm run test:e2e` against the actual configured application. `npm test` includes lint/build; the standalone build still runs if baseline lint blocks that script. Preserve the exact pre-existing `next-env.d.ts` content across Next's generated-file updates; do not use `git restore` or overwrite concurrent user changes. Existing browser tests contain expectations for removed motion controls and older content: report each observed failing test by name rather than editing unrelated product behaviour or weakening assertions. Do not send real signup/recovery emails or modify live profiles to make tests pass.
- [ ] **Check resource budgets and final working tree.** Inspect real draw-call counts, active contexts, DPR/shadow choices and mobile screenshots; report measured values instead of promising native-game performance. Run `git diff --check` and `git status --short`; verify the pre-existing `next-env.d.ts` content is unchanged and no test credentials, generated assets or fixture routes were staged.
- [ ] **Write `docs/common-room.md`.** Record route/modules, exact test commands, asset provenance/status, procedural/synthetic limitations, known data-source gaps, the existing permissive profile policy, and how licensed compressed GLBs can replace local scene/prop modules. Include checked results and remaining unverified deployment/device items. Do not claim unavailable systems or AAA art are complete.
- [ ] **Final checkpoint.** Commit only the verified feature/docs/test changes with `test: verify four-house common room experience`. Do not push or merge without instruction. The final response summarizes what runs, which tests passed/failed, what remains unavailable and that unrelated pages/auth/schema were preserved.

## Plan Self-Review

- Scope: covers all four environments, five physical objects, panels/data, entrance/camera, audio, accessibility, performance and fallback; no separate backend system or production asset acquisition is implied.
- Interfaces: `AssignedHouse`, `RoomParticipant`, `ObjectId`, `Quality`, `SceneProps`, `RoomState` and `RoomAction` have one owner and consistent consumers. Numeric camera snapshots preserve viewport aspect on resize.
- Review focus: access/session tests belong to Tasks 1–2; transition races to Task 4; viewport/context loss to Tasks 4/9; lifecycle/re-entry to Tasks 3/8/9.
- Isolation: test auth is an HTTP fixture around the real SDK in a temporary Next root; no production preview/bypass route, `.env` edit or generated-file overwrite is needed.
- Evidence: screenshot review, actual canvas picking and runtime/resource tests supplement DOM checks. Existing lint/browser failures remain visible in the handoff.

## Execution Handoff

Proposed method: native implementation in the current session, one task at a time with its red/green checks and scoped checkpoint. The scene tasks share tightly coupled camera/object contracts, so keeping implementation context together is useful. No subagent tool is currently exposed; a separate independent review requires additional tooling or another reviewer/session. Do not describe self-review as independent review.

This plan requires user review and execution-method confirmation before product code or dependencies are changed.
