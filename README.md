# Technika ’27 · BIT Patna

A cinematic, dark Wizarding World–inspired festival website built from the supplied **Arcane Luminary / Stitch** designs. Next.js App Router, TypeScript, Tailwind CSS 4, **GSAP + ScrollTrigger + MotionPathPlugin**, Motion, Lenis, and **Supabase Auth**.

## Run locally

Requires **Node.js 22.20.0**, pinned in [`.nvmrc`](.nvmrc). The installed Supabase SDK requires Node 22+, even though Next.js itself supports Node 20.9+.

```bash
nvm use
npm ci
cp .env.example .env.local
npm run dev
```

Fill in the Supabase URL and publishable key in `.env.local` before starting the server to enable account services. If `.env.local` already exists, keep its configured values rather than copying over it.

Open **http://localhost:3000**. For a production preview:

```bash
npm run build
npm start
```

To run the same production build in Docker:

```bash
docker build -t technika-27 .
docker run --rm --publish 3000:3000 technika-27
```

Open **http://localhost:3000** after either run command.

## Pages

| Route | Design |
| --- | --- |
| `/` | Moonlit Hogwarts hero, autonomous Golden Snitch, house banners, interactive three-day timeline, Goblet of Fire, Deathly Hallows, Technika story, BIT Patna, sponsors, invitation |
| `/registrations` | Great Hall, Sorting Ceremony, four house tracks, festival countdown, FAQs, calendar download |
| `/members` | Ministry notice wall, framed Educational Decrees, sealed portraits, chamber filters, accessible decree dialogs |
| `/delegate` | Triwizard crest, three academy paths, contingent preview |
| `/alumni` | Hall of Legacies, Pensieve memory vials, ancient ledger |
| `/contact` | Owl Post letter, wax seal, celestial owlery, campus directions |
| `/login` | Illustrated Sorting Hat sign-in, saved-house greeting, and password-reset request |
| `/signup` | Full name, college, phone, email, password → same-page Sorting Hat ceremony and reveal |
| `/sorting` | Sign-in-protected compatibility redirect to the ceremony step inside `/signup` |
| `/dashboard` | Server-protected member dashboard with profile details, festival shortcuts, and saved house theme |
| `/account` | Server-protected common room, read-only profile house, and sign-out |
| `/reset-password` | Password change after opening a verified recovery link |
| `/auth/callback` | PKCE email-confirmation/recovery callback with allowlisted redirects |

The five festival portals intentionally announce **coming soon**. Account flows are connected to Supabase when the environment is configured. The custom 404 keeps the same theme.

## Magical details

- Full-screen loading experience with a **0–100 percentage counter**, progress bar, automatic completion, and a photo-driven multi-layer canvas scene using the local `public/images/hogwarts.jpg` artwork. The source image is composited into separate sky, cloud, moon, west/central/east tower, castle-window, water-reflection, mist, forest, and portal-interior layers. Dark foreground foliage parts over 3.4 seconds to reveal the moonlit castle; the same premium scene stays behind the entire `/` route, and scrolling moves the camera through the castle gate into a warm perspective corridor. Pointer depth and reduced-motion support remain available.
- GSAP orchestrates the post-loader castle zoom, staggered 3D title-letter reveal, subtitle, buttons, and supporting details.
- Multi-speed ScrollTrigger parallax for the castle, moonlight, mist, candles, Technika crest, and Great Hall.
- A larger, clearly visible Golden Snitch follows a **GSAP motion path**; it does **not** track the mouse. Its layer changes relative to the title, so the actual opaque letter shapes hide it on the background pass. Flight pauses when the hero is outside the viewport or the browser tab is hidden.
- Scroll-triggered reveals with staggered cards, 3D card tilts, pointer-position gold highlights, button shine, animated navigation underlines, route-transition veils, and a scroll progress indicator.
- Photographic Elder Wand cursor cut from a downloaded replica photo, with a high-resolution overlay, native PNG fallback, subtle spark trail, and click/tap spell bursts. Inputs retain a normal text cursor. Artwork attribution and license are in `public/images/ATTRIBUTION.md`.
- Lenis smooth wheel scrolling synchronised to the GSAP ticker and ScrollTrigger, native touch scrolling, gold scrollbars.
- Responsive floating navigation and keyboard-accessible mobile menu, timeline tabs, filters, and native accordion FAQs.
- Magical effects are always active throughout the experience; there is no pause/enable control, so the canvas, scroll scenes, cursor sparks, and CSS microanimations remain in sync.
- “Save the date” downloads a valid `.ics` calendar file; it does not submit a registration or email signup.

## The Wizarding World components

- **House themes:** Gryffindor scarlet, Slytherin emerald/silver, Ravenclaw blue/bronze, and Hufflepuff yellow/black. The authenticated user’s `profiles.house` value drives the dark theme (with legacy auth metadata as a fallback); the original gold remains the default for unsorted visitors. The bottom-left house switcher updates the active palette immediately and persists authenticated choices back to `profiles.house`. Auth screens display all four original crests without allowing house choice.
- **Sorting Hat frontend:** A cinematic, single-page signup journey: create an account, meet the Hat, and see the reveal within `/signup`. The ceremony requires sign-in, including direct `/sorting` and `/signup?step=ceremony` links; login/signup offer no public preview link. For users without a saved house, reveals are explicitly labelled previews, stored only in sessionStorage, and never written as membership. Strict server-side balancing was deferred in the frontend-only scope. See [`docs/ceremony-frontend.md`](docs/ceremony-frontend.md) for the integration boundary and checks.
- **Goblet of Fire:** a reusable layered tower scene, house-coloured windows/banner, carved bronze chalice, animated blue fire, drifting embers, and scroll parallax (`src/components/goblet-tower.tsx`).
- **Deathly Hallows:** the wand line, stone circle, and cloak triangle illuminate one at a time, with an accompanying original story. Visitors can choose a relic, use arrow keys, or pause the automatic rotation (`src/components/deathly-hallows.tsx`).
- **Ministry notice wall:** the members page uses Umbridge-inspired wooden/gilt Educational Decree frames. Chamber filters still work; each decree opens a keyboard-accessible dialog. The member identities remain placeholders until the actual roster is provided.
- **Aged notebooks:** coffee-toned, stained, deckled-edge parchment with self-hosted Caveat handwriting on the event cards, Technika story, contact letter, alumni ledger, and common-room note.

## Supabase authentication setup

Both `@supabase/supabase-js` and `@supabase/ssr` are dependencies. Configure these variables in **`.env.local`** for development and **Vercel → Project → Settings → Environment Variables** for deployment:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-project-publishable-key
NEXT_PUBLIC_SITE_URL=https://your-production-domain.example
```

The supplied local configuration is stored in ignored `.env.local`. No live keys are committed. Copy the project’s **publishable** key from Supabase; a service-role/secret key is never needed in the frontend. Redeploy after setting `NEXT_PUBLIC_*` values because Next.js embeds them during the build.

If a Vercel deployment shows `Internal Server Error`, verify that both Supabase variables are assigned to the deployment’s **Production** environment (and Preview when testing preview URLs), then redeploy without reusing an older build cache. The auth proxy is limited to authentication/protected routes and safely bypasses session refresh when those variables are unavailable, so missing auth configuration cannot take down public pages or static assets.

### Supabase dashboard settings

1. In **Authentication → URL Configuration**, set **Site URL** to the production origin.
2. Allow the exact local and production callback URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-production-domain.example/auth/callback`
   - If required by your redirect rules, also allow the same callback with `?next=/account` and `?next=/reset-password`.
3. In **Authentication → Sign In / Providers → Email**, enable **Confirm email** to require inbox verification. With confirmation disabled, Supabase can return a session immediately after sign-up. This behaviour is controlled in the dashboard.
4. Configure SMTP/delivery and Supabase Auth rate limits for the expected festival traffic.

### Session and access behaviour

- Supabase handles passwords and account sessions; the app does not put passwords in local storage or run a custom password database.
- Registration/new-password forms require at least 12 characters, a letter, and a number, and matching confirmation. Existing-password login is not restricted by that new-password rule.
- `src/proxy.ts` is the **Next.js 16** equivalent of middleware. It refreshes sessions on account/auth/ceremony routes, uses `getClaims()` to verify signed tokens, redirects unsigned visits to protected ceremony links, preserves refreshed cookies, and uses private/no-store responses. Production cookies are Secure and SameSite=Lax.
- `/account` independently calls server-side `getUser()` before rendering user data. Forged, expired, or missing sessions redirect to `/login`. Public festival pages stay publicly accessible.
- Email confirmation and recovery use a PKCE code exchange. The callback only redirects to `/account` or `/reset-password`; arbitrary external redirect URLs are ignored.
- Password recovery changes require a verified Supabase user. Sign-out uses Supabase and returns to the login page.
- Signup stores `display_name`, `college`, and normalized contact `phone` in user metadata. The frontend reads the user’s house from the authenticated `profiles` row; legacy auth metadata is only a compatibility fallback. User metadata is browser-editable at the provider level and must never grant permissions or serve as an authoritative balanced assignment ledger.
- With no Supabase configuration, account submission reports unavailability; it never displays a simulated successful login. The ceremony stays gated until a session is available.

## Content & assets

The festival dates **8–10 January 2027** and the event programme are illustrative, as requested. Update `src/lib/festival.ts`, the calendar values in `src/components/coming-soon.tsx`, and metadata in `src/app/layout.tsx` when dates are confirmed.

Sponsor names are the **concept lineup from the supplied design**, labelled accordingly; they are not presented as confirmed partnerships. Update `partners` in `src/components/home-sections.tsx` for the final sponsor list. Member portraits and alumni memory cards are themed placeholders.

The original references are preserved in `image refs/`. Optimised versions of the provided castle/crest and hosted images from the exported Stitch HTML are in `public/images/`. All runtime images and fonts are local; no Stitch API key is required.

`npm run assets` regenerates assets from the reference folder (requires `curl` and network access for the hosted images and fonts). `npm run assets -- --fonts-only` only refreshes fonts. EB Garamond and Outfit are provided under the included SIL Open Font Licenses.

`npm run assets:social` regenerates the branded 1200×630 social preview and the Apple touch icon locally. `npm run assets:wizard` regenerates the photographic wand cutouts/cursors and downloads the handwriting font. Font licenses are included under `public/fonts/`.

## SEO & crawl management

- Every public page has a unique title, description, canonical URL, Open Graph card, Twitter preview, server-rendered breadcrumbs, and JSON-LD through `src/lib/seo.ts`.
- `/sitemap.xml` includes the indexable festival, delegate, contact, and privacy pages. `/robots.txt` allows production crawling, blocks private account, authentication, dashboard, and API routes, and advertises the sitemap. Vercel preview environments are marked `noindex` and disallow crawling.
- Login, sign-up, password recovery, and private account pages have `noindex` metadata and are excluded from the public sitemap.
- Server-rendered JSON-LD describes the website, festival organisation, BIT Patna, branded imagery, and page breadcrumbs. Public pages are statically prerendered for fast delivery; authenticated profile and house state synchronize in the browser while protected account/dashboard routes remain dynamic.
- `/manifest.webmanifest` provides installable app identity, theme colours, categories, and icons. Production builds without a valid public origin are automatically marked `noindex` to prevent localhost canonical URLs entering search indexes.
- The provisional dates are **not** advertised as a confirmed Event rich result.
- Set `NEXT_PUBLIC_SITE_URL` in Vercel to the final public origin, especially for a custom domain. Otherwise Vercel’s production URL is used automatically.
- Optionally set `GOOGLE_SITE_VERIFICATION` to your Search Console HTML verification token, then submit the production `/sitemap.xml` URL in Search Console.
- Optionally set `NEXT_PUBLIC_GA_MEASUREMENT_ID` to enable Google Analytics 4 page-view tracking. Analytics is not loaded when the variable is absent.
- Keep page descriptions, content, dates, and the sponsor list current when the festival details are confirmed.

## Performance and delivery improvements

- Public festival pages are statically prerendered instead of waiting for an authenticated Supabase request in the root layout. Account, dashboard, callback, and API routes remain request-rendered where required.
- All existing visual effects are retained, including the Chamber of Secrets route transition, hero fly-through, Golden Snitch, ScrollTrigger reveals and parallax, Lenis scrolling, wand sparks, card tilts, and animated snake scrollbar.
- The hero video now displays an optimized poster immediately and defers the MP4 request briefly so initial HTML, CSS, fonts, and navigation can become interactive first. Data-saver and reduced-motion visitors skip the video decode without blocking the page.
- Continuous canvas work is managed explicitly: the snake renderer pauses while the tab is hidden and uses a controlled decorative frame budget, while the Chamber canvas caps high-DPI resolution to prevent excessive pixel overdraw on 4K/Retina screens.
- Smooth scrolling respects reduced-motion preferences, route loading has immediate themed feedback, and static fonts/media receive immutable browser caching headers. Next.js image AVIF/WebP optimization remains enabled.
- GitHub Actions validates every pull request and pushes to `main`, `latest-update`, or `latest-build` with clean-install lint, TypeScript, and production-build checks. Hosting deployment remains managed by the connected Vercel project after CI succeeds.

## Contact form

- `/contact` now has a validated, accessible contact form with a honeypot field and a server route at `/api/contact`.
- Run the migration in `supabase/migrations/202610250001_contact_messages.sql` against the configured Supabase project to store messages securely with insert-only RLS.
- Alternatively set `CONTACT_FORM_WEBHOOK_URL` to deliver the validated payload to an approved email/automation provider without storing it in Supabase.
- Set `NEXT_PUBLIC_CONTACT_EMAIL` only when you want the organisation schema to publish a contact email address.

## Checks

The offline smoke test is a single command and performs the lint plus production build. It works on Windows, macOS, and Linux:

```bash
npm test
```

On systems with `make`, `make test` is an equivalent alias.

The individual checks are also available when needed:

```bash
npm run lint
npm run typecheck
npm run build
npx playwright install chromium
npm run test:e2e
```

The Playwright suite checks desktop/mobile routes, overflow, image loading, navigation, schedule tabs, filters/decree dialogs, calendar downloads, FAQs, 0–100 loading, actual parallax, autonomous snitch depth changes, hover interactions, reduced-motion overrides, Hallows controls, authentication validation/protected-route redirects, ceremony preview recovery/no profile writes, and server-rendered SEO/robots/sitemap output. Screenshots are generated under ignored `test-results/`. Automated checks do not create real Supabase accounts or send real signup/recovery email.

Browser tests use the production build, so run `npm run build` first. They start the server automatically on port 3000. To use a different port on macOS/Linux/WSL:

```bash
PLAYWRIGHT_PORT=3100 npm run test:e2e
```

For an end-to-end email check against your configured Supabase project, create a test account, open its confirmation link in the same browser, explore the ceremony preview from `/account`, sign out, and follow a password-reset email to set a new password. PKCE confirmation/recovery links need the browser that initiated the request. Preview reveals do not assign official membership.

## Deployment

Import the repository into Vercel with the **Next.js** preset, select **Node.js 22.20.0** to match [`.nvmrc`](.nvmrc), set the Supabase environment variables above, configure the production auth callback URLs, and redeploy. The production command is `npm run build`; other Node hosts can serve it with `npm start`. Social image URLs use Vercel’s production URL automatically; set `NEXT_PUBLIC_SITE_URL` to your final public/custom-domain origin for canonical URLs and sharing cards.

For a container deployment, build the checked-in image with `docker build -t technika-27 .`, then run it with `docker run --rm --publish 3000:3000 technika-27`. Pass any deployment-specific environment variables with Docker’s `--env-file` or `--env` flags; no credentials are stored in the image or repository.
