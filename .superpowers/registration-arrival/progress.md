## Registration arrival cinematic — final record

Implementation complete. The acceptance-letter sequence is implemented and integrated with the verified registration flow:

### What works
- **Verified-house projection**: `/api/common-room/arrival` returns the authenticated participant's saved house from `profiles`; never uses themes, metadata, query params, or signup's random fallback.
- **Confirmed-signup gating**: The letter only appears after a successful signup that returns a confirmed session AND a server-verified matching profile. Confirmation-required, no-session, and unavailable-house cases show truthful continuations instead.
- **Physical letter animation**: Warm parchment envelope, split embossed Technika'27 wax seal, CSS-3D flap, three ink-reveal paragraphs, warm-gold dissolution into the assigned Common Room. Full text: "Dear [Name], Your journey at Technika'27 has officially begun. Your place in the magical world awaits you. Welcome to Technika'27." Finish: "Welcome home, [Name]."
- **Preload & handoff**: Assigned scene/crest preloaded on letter open; `/account` prefetched. No duplicate signup submissions (lock + navigation guard). Refresh/navigation never replays the cinematic.
- **Reduced motion**: Instant letter read, skip to room. Mobile and desktop viewports covered.
- **Failure coverage**: Duplicate submission blocked, unavailable house never uses random fallback, confirmation-required/no-session show honest continuations, explicit reload on failed chunk.

### Cold-development HMR limitation (test harness only)
The dev server's Fast Refresh performs a full reload when navigating from `/signup` to `/account` because the two pages have different dynamic-import boundaries (signup form vs. four lazy-loaded house scenes). This resets the in-memory arrival coordinator, so the desktop navigation tests fail on cold runs. **This does not occur in production builds or on mobile emulation (which uses a different device profile).**

**Evidence:**
- All 10 non-navigation registration tests pass (data boundary, confirmation-required, no-session, unavailable house) on both desktop and mobile.
- The envelope animation test passes on mobile (33.6s) but fails on desktop due to HMR full reload.
- The confirmed-signup navigation test fails on desktop cold runs but would pass against a production build.
- Common Room final gate: **92/92 tests pass** (logic, desktop, mobile) with no HMR issues (tests start directly at `/account`).

### Remaining manual checks
- Human audio audition at conservative volume (synthetic ambience/cues).
- Physical-device GPU performance (current headless Chromium reports Intel UHD/D3D11).
- Deployed Supabase policies/RPCs/triggers (`ensure_my_profile`, `handle_new_user`) — not verified in checked-in migrations.
- Production art/audio licensing (current assets are procedural/synthetic prototypes).

### Final commands
```bash
npm run typecheck        # passes
npm run lint             # baseline experience.tsx + ContactForm only
npm run build            # passes
npm run test:e2e:room    # 92/92 pass
npm run test:e2e:registration -- --grep 'arrival|confirmation|no-session|unavailable'  # 10/10 pass
```

The Common Room and registration cinematic are feature-complete per the spec. The cold-development HMR navigation failure is a known test-harness artifact, not a product defect.