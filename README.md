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
- All existing visual effects are retained, including the Chamber of Secrets route transition, hero fly-through, Golden Snitch, ScrollTrigger reveals and parallax, Lenis scrolling, wand sparks, card tilts, and the animated fireworks-dragon scrollbar (Weasleys' Wildfire Whiz-bangs: crackers burst along the edge and assemble into a fire dragon as you scroll).
- The hero video now displays an optimized poster immediately and defers the MP4 request briefly so initial HTML, CSS, fonts, and navigation can become interactive first. Data-saver and reduced-motion visitors skip the video decode without blocking the page.
- Continuous canvas work is managed explicitly: the fireworks-dragon renderer pauses while the tab is hidden and uses a controlled decorative frame budget, while the Chamber canvas caps high-DPI resolution to prevent excessive pixel overdraw on 4K/Retina screens.
- Smooth scrolling respects reduced-motion preferences, route loading has immediate themed feedback, and static fonts/media receive immutable browser caching headers. Next.js image AVIF/WebP optimization remains enabled.
- GitHub Actions validates every pull request and pushes to `main`, `latest-update`, or `latest-build` with clean-install lint, TypeScript, and production-build checks. Hosting deployment remains managed by the connected Vercel project after CI succeeds.

## Contact form

- `/contact` now has a validated, accessible contact form with a honeypot field and a server route at `/api/contact`.
- Run the migration in `supabase/migrations/202610250001_contact_messages.sql` against the configured Supabase project to store messages securely with insert-only RLS.
- Alternatively set `CONTACT_FORM_WEBHOOK_URL` to deliver the validated payload to an approved email/automation provider without storing it in Supabase.
- Set `NEXT_PUBLIC_CONTACT_EMAIL` only when you want the organisation schema to publish a contact email address.

## Styling and theming

Every visual decision lives in one stylesheet: [`src/app/globals.css`](src/app/globals.css). It is imported once by [`src/app/layout.tsx`](src/app/layout.tsx) and contains the Tailwind entry point, the base layer, the five house themes, every page and component style, the shared animations, and the vendored Lenis scroll rules. There are no CSS Modules and no component `<style>` blocks.

The class names that used to come from CSS Modules are kept in [`src/lib/css-classes.ts`](src/lib/css-classes.ts). Components import one of the maps (`acceptance`, `arrival`, `registry`, `council`, `room`) as `styles`, so markup still reads `styles.root`; the maps point at the prefixed global classes `acceptance-*`, `arrival-*`, `registry-*`, `council-*`, and `cr-*`. When you add a class to one of those sections, add it to the matching map too.

### Section order

`globals.css` is concatenated in a deliberate cascade order. Later sections intentionally override earlier ones, so **do not reorder the sections**. Add new rules to the section that owns the component.

| # | Section | What belongs there |
| --- | --- | --- |
| 1 | Globals | Tailwind bridge, reset, typography, scrollbar, shared page chrome and loading scene. |
| 2 | Wizarding | Home page, hero, castle, house, timeline and shared festival sections. |
| 3 | Marauders map | Map paper palette, map controls, markers and event cards. |
| 4 | Reference portals | Shared coming-soon/reference-page chrome. |
| 5 | House themes | OKLCH generator, semantic tokens, five theme presets and their overrides. |
| 6 | Theme utilities | The `theme-*` component classes and the cross-site colour bridge. |
| 7 | Home experience | Atelier-style home sections, scroll scenes and home-only palettes. |
| 8 | Page components | Former CSS Modules: acceptance letter, arrival, alumni registry, council gallery, common room. |
| 9 | Component animations | Former inline `<style>` blocks: header and navbar book-burgers, hero candles and snitch. |
| 10 | Lenis | Vendored `lenis/dist/lenis.css` (MIT). |

### How a house theme works

A theme only declares a handful of knobs: a hue, a chroma and a peak lightness for the primary, secondary and tertiary scales, a hue and chroma for the neutrals, the tower-light hue, and four status hues. The generator turns those knobs into the full 11-step scales and every semantic token, so all five themes always expose exactly the same variable names.

`data-theme` is set on `<html>` by the boot script in `layout.tsx` and kept in sync by the house provider. The values are `hogwarts` (the default gold look), `gryffindor`, `slytherin`, `ravenclaw` and `hufflepuff`. You can put `data-theme="ravenclaw"` on any element to theme just that subtree — the whole token system recomputes there, which is how the house cards and previews work.

Colours are authored in OKLCH. A 2023+ browser is required (Chrome 111, Safari 15.4, Firefox 113).

### Theme knobs

These are the only values a house preset needs. All of them live in section 5 of `globals.css`.

| Knob | Hogwarts (default) | Gryffindor | Slytherin | Ravenclaw | Hufflepuff |
| --- | --- | --- | --- | --- | --- |
| `--primary-hue` | 81 | 27 | 158 | 262 | 90 |
| `--primary-chroma` | 0.115 | 0.205 | 0.145 | 0.18 | 0.17 |
| `--primary-light` | 0.88 | 0.6 | 0.56 | 0.58 | 0.84 |
| `--secondary-hue` | 300 | 86 | 235 | 68 | 62 |
| `--secondary-chroma` | 0.13 | 0.145 | 0.025 | 0.115 | 0.14 |
| `--secondary-light` | 0.6 | 0.82 | 0.78 | 0.72 | 0.72 |
| `--tertiary-hue` | 48 | 52 | 190 | 225 | 138 |
| `--tertiary-chroma` | 0.125 | 0.15 | 0.1 | 0.085 | 0.095 |
| `--tertiary-light` | 0.62 | 0.68 | 0.72 | 0.8 | 0.7 |
| `--neutral-hue` | 294 | 22 | 165 | 268 | 75 |
| `--neutral-chroma` | 0.027 | 0.022 | 0.02 | 0.03 | 0.018 |
| `--success-hue` | 155 | 150 | 128 | 155 | 150 |
| `--warning-hue` | 60 | 62 | 85 | 80 | 55 |
| `--danger-hue` | 20 | 8 | 22 | 22 | 25 |
| `--info-hue` | 245 | 250 | 235 | 220 | 245 |
| `--house-tower-hue` | 0deg | 325deg | 85deg | 170deg | 0deg |

The five presets also override a few semantic tokens where the generic mapping would not read well on that palette:

| Theme | Overrides |
| --- | --- |
| Hogwarts | `--house-flag: var(--primary-800)` · `--house-second: var(--primary-400)` · `--on-brand: var(--neutral-1000)` · `--fg-brand: var(--primary-500)` · `--link: var(--primary-400)` · `--link-hover: var(--primary-300)` · `--ring: var(--primary-400)` · `--selection: color-mix(in oklab, var(--primary-500) 30%, transparent)` |
| Gryffindor, Slytherin, Ravenclaw | `--brand-hover: var(--primary-600)` · `--brand-active: var(--primary-700)` |
| Hufflepuff | `--brand-hover: var(--primary-400)` · `--brand-active: var(--primary-600)` · `--on-brand: var(--neutral-1000)` |

### Editing recipes

**Recolour a house.** Change only that house's `--primary-*` (or `--secondary-*` / `--tertiary-*`) knobs in section 5. Keep `--primary-light` high enough that `--fg-brand` stays readable on the dark surfaces; the house presets use `0.56`–`0.88` for that reason. To validate, load any page with `data-theme` set to the house and check body text, buttons, the navbar and one parchment page.

**Change the warmth of the darks.** `--neutral-hue` and `--neutral-chroma` control every background, surface, border and muted text at once. Raising chroma above roughly `0.04` starts to tint the whole site; lowering it toward `0` gives a neutral grey.

**Theme one page or card.** Put `data-theme="gryffindor"` on a wrapper. All child components use the local tokens automatically. This is cheaper and safer than writing new colour rules.

**Add a sixth house.** Add its selector to the shared generator list (`:root, [data-theme="hogwarts"], …`), add a preset block with the 16 knobs above, add the key to `src/lib/houses.ts` (`houseThemes`, `selectableHouses`, crest paths), and make sure the boot script and `houseFromValue` accept it. No component CSS should need to change.

**Change the type.** The font families come from `next/font` in `src/app/layout.tsx` and are exposed as `--font-garamond`, `--font-outfit`, `--font-handwriting` and `--font-harryp`. Tailwind reads them through `--font-serif`, `--font-sans` and `--font-harryp`. Swap the loader there, not in `globals.css`.

**Retune a page's paper palette.** The acceptance letter, alumni registry, council gallery and common room each expose a small local palette. Edit the tokens in their section 8 block; the table below lists them. These are intentionally independent of the house theme so the printed/parchment objects keep their material colour.

### Core tokens

These tokens are generated for every theme. Components should use them instead of raw colours; that is what makes a house swap recolour the whole site.

#### Scales

Each scale has 11 steps. Step `500` is the pure colour and is the only step that equals the knobs exactly; `50`–`400` interpolate toward white (`0.985` lightness), and `600`–`950` interpolate toward `0.19` lightness. Use `300`–`500` for text and accents on dark surfaces, `700`–`950` for fills and borders, and `50`–`200` for text on light parchment.

| Step | Primary | Secondary | Tertiary |
| --- | --- | --- | --- |
| 50 | `--primary-50` | `--secondary-50` | `--tertiary-50` |
| 100 | `--primary-100` | `--secondary-100` | `--tertiary-100` |
| 200 | `--primary-200` | `--secondary-200` | `--tertiary-200` |
| 300 | `--primary-300` | `--secondary-300` | `--tertiary-300` |
| 400 | `--primary-400` | `--secondary-400` | `--tertiary-400` |
| 500 | `--primary-500` | `--secondary-500` | `--tertiary-500` |
| 600 | `--primary-600` | `--secondary-600` | `--tertiary-600` |
| 700 | `--primary-700` | `--secondary-700` | `--tertiary-700` |
| 800 | `--primary-800` | `--secondary-800` | `--tertiary-800` |
| 900 | `--primary-900` | `--secondary-900` | `--tertiary-900` |
| 950 | `--primary-950` | `--secondary-950` | `--tertiary-950` |

| Step | Token | Lightness |
| --- | --- | --- |
| 50 | `--neutral-50` | 0.975 |
| 100 | `--neutral-100` | 0.94 |
| 200 | `--neutral-200` | 0.88 |
| 300 | `--neutral-300` | 0.79 |
| 400 | `--neutral-400` | 0.68 |
| 500 | `--neutral-500` | 0.56 |
| 600 | `--neutral-600` | 0.44 |
| 700 | `--neutral-700` | 0.34 |
| 800 | `--neutral-800` | 0.26 |
| 900 | `--neutral-900` | 0.2 |
| 950 | `--neutral-950` | 0.15 |
| 1000 | `--neutral-1000` | 0.105 |

The neutral steps are tinted by `--neutral-hue` / `--neutral-chroma`; the chroma is scaled up from `50` to `500` and stays near full strength for the darks.

#### Surfaces

| Token | Default | Use |
| --- | --- | --- |
| `--bg-sunken` | `var(--neutral-1000)` | Deepest chrome behind the page. |
| `--bg` | `var(--neutral-950)` | Base page background. |
| `--surface-1` | `var(--neutral-900)` | Panels, cards and inputs. |
| `--surface-2` | `var(--neutral-800)` | Raised controls and hovered surfaces. |
| `--surface-3` | `var(--neutral-700)` | Highest surface and strong separators. |
| `--bg-tint` | `primary-900` 40% over `neutral-950` | House-tinted page wash. |
| `--surface-tint` | `primary-900` 50% over `neutral-900` | House-tinted panel. |
| `--overlay` | `neutral-1000` 72% | Modal and drawer scrim. |
| `--hover-overlay` | `neutral-50` 6% | Generic hover wash. |
| `--active-overlay` | `neutral-50` 10% | Generic pressed wash. |

#### Text

| Token | Default | Use |
| --- | --- | --- |
| `--fg-strong` | `var(--neutral-50)` | Headings and high-emphasis text. |
| `--fg` | `var(--neutral-100)` | Default body text. |
| `--fg-muted` | `var(--neutral-300)` | Secondary copy, labels, descriptions. |
| `--fg-subtle` | `var(--neutral-400)` | Captions, placeholders, metadata. |
| `--fg-disabled` | `var(--neutral-500)` | Disabled labels and icons. |
| `--fg-brand` | `var(--primary-300)` | House-coloured headings and accents. |
| `--fg-accent` | `var(--secondary-300)` | Metal / secondary accent text. |
| `--fg-highlight` | `var(--tertiary-300)` | Supporting accent text. |
| `--link` | `var(--secondary-300)` | Inline link colour. |
| `--link-hover` | `var(--secondary-200)` | Inline link hover. |
| `--text` | `var(--fg)` | Legacy alias for `--fg`. |
| `--muted` | `var(--fg-muted)` | Legacy alias for `--fg-muted`. |
| `--panel` | `var(--surface-1)` | Legacy alias for a panel surface. |
| `--gold` | `var(--fg-brand)` | Legacy alias for the house accent. |
| `--gold-deep` | `var(--primary-600)` | Legacy deeper accent. |
| `--ink` | `var(--neutral-800)` | Legacy dark ink; re-declared by parchment pages. |
| `--paper` | `var(--neutral-100)` | Legacy light paper; re-declared by the registry. |

#### Borders and focus

| Token | Default | Use |
| --- | --- | --- |
| `--line-subtle` | `var(--neutral-800)` | Hairline separators. |
| `--line` | `var(--neutral-700)` | Default border. |
| `--line-strong` | `var(--neutral-600)` | Emphasised border. |
| `--line-brand` | `primary-500` 45% | House-coloured border. |
| `--line-accent` | `secondary-500` 45% | Metal-coloured border. |
| `--ring` | `var(--secondary-400)` | Focus ring colour. |
| `--ring-offset` | `var(--bg)` | Focus ring offset. |
| `--selection` | `secondary-500` 35% | Text selection background. |

#### Brand, accent and highlight

Each family has the same shape: a solid fill, hover/active variants, translucent soft fills, a border and a foreground colour for text placed on the solid fill. Use the soft fill plus border for ghost buttons and badges.

| Token | Default | Use |
| --- | --- | --- |
| `--brand` | `var(--primary-500)` | Primary solid fill (house colour). |
| `--brand-hover` | `var(--primary-400)` | Primary hover; some houses use `600` instead. |
| `--brand-active` | `var(--primary-600)` | Primary pressed; some houses use `700`. |
| `--brand-soft` | `primary-500` 14% | Translucent primary fill. |
| `--brand-soft-hover` | `primary-500` 22% | Translucent primary hover. |
| `--brand-border` | `primary-500` 45% | Primary border. |
| `--on-brand` | `var(--neutral-50)` | Text/icon on a primary fill; Hogwarts and Hufflepuff use `neutral-1000`. |
| `--accent` | `var(--secondary-500)` | Secondary solid fill. |
| `--accent-hover` | `var(--secondary-400)` | Secondary hover. |
| `--accent-active` | `var(--secondary-600)` | Secondary pressed. |
| `--accent-soft` | `secondary-500` 14% | Translucent secondary fill. |
| `--accent-soft-hover` | `secondary-500` 22% | Translucent secondary hover. |
| `--accent-border` | `secondary-500` 45% | Secondary border. |
| `--on-accent` | `var(--neutral-1000)` | Text/icon on a secondary fill. |
| `--highlight` | `var(--tertiary-500)` | Tertiary solid fill. |
| `--highlight-hover` | `var(--tertiary-400)` | Tertiary hover. |
| `--highlight-active` | `var(--tertiary-600)` | Tertiary pressed. |
| `--highlight-soft` | `tertiary-500` 14% | Translucent tertiary fill. |
| `--highlight-soft-hover` | `tertiary-500` 22% | Translucent tertiary hover. |
| `--highlight-border` | `tertiary-500` 45% | Tertiary border. |
| `--on-highlight` | `var(--neutral-1000)` | Text/icon on a tertiary fill. |

`--accent` is remapped by the small accent utilities: `.accent-gold` uses `--fg-accent`, `.accent-crimson` uses `--fg-brand`, `.accent-blue` uses `--fg-highlight`, and `.parchment-card` pins it to `#8d432f` for readable links on cream paper.

#### Status and charts

| Token | Default | Use |
| --- | --- | --- |
| `--success-solid` | `oklch(0.64 0.15 var(--success-hue))` | Success fill. |
| `--success-fg` | `oklch(0.82 0.12 var(--success-hue))` | Success text. |
| `--success-soft` | `success-solid` 16% | Success background. |
| `--success-border` | `success-solid` 42% | Success border. |
| `--warning-solid` | `oklch(0.8 0.13 var(--warning-hue))` | Warning fill. |
| `--warning-fg` | `oklch(0.88 0.12 var(--warning-hue))` | Warning text. |
| `--warning-soft` | `warning-solid` 16% | Warning background. |
| `--warning-border` | `warning-solid` 42% | Warning border. |
| `--danger-solid` | `oklch(0.6 0.19 var(--danger-hue))` | Error fill. |
| `--danger-fg` | `oklch(0.8 0.13 var(--danger-hue))` | Error text. |
| `--danger-soft` | `danger-solid` 16% | Error background. |
| `--danger-border` | `danger-solid` 42% | Error border. |
| `--info-solid` | `oklch(0.65 0.11 var(--info-hue))` | Info fill. |
| `--info-fg` | `oklch(0.82 0.1 var(--info-hue))` | Info text. |
| `--info-soft` | `info-solid` 16% | Info background. |
| `--info-border` | `info-solid` 42% | Info border. |
| `--on-solid` | `var(--neutral-1000)` | Text on any solid status fill. |

| Token | Default | Use |
| --- | --- | --- |
| `--chart-1` | `var(--primary-500)` | Chart series 1. |
| `--chart-2` | `var(--secondary-500)` | Chart series 2. |
| `--chart-3` | `var(--tertiary-500)` | Chart series 3. |
| `--chart-4` | `var(--primary-300)` | Chart series 4. |
| `--chart-5` | `var(--secondary-300)` | Chart series 5. |
| `--chart-6` | `var(--tertiary-300)` | Chart series 6. |

The four status families are hue-only knobs. Changing `--danger-hue` recolours the fill, text, background and border together.

#### Gradients, shadows and glows

| Token | Default | Use |
| --- | --- | --- |
| `--gradient-brand` | 135° `primary-700` → `primary-500` → `primary-400` | Primary buttons and banners. |
| `--gradient-accent` | 135° `secondary-700` → `secondary-500` → `secondary-300` | Metal accents. |
| `--gradient-sigil` | 120° `primary-500` → `secondary-500` | Crests and seals. |
| `--gradient-text` | 90° `primary-300` → `secondary-300` | Gradient text. |
| `--gradient-surface` | 180° `surface-2` → `surface-1` | Raised panel fill. |
| `--gradient-fade` | 180° transparent → `bg` | Section fade-out. |
| `--gradient-hero` | Two radial house washes over `bg` | Hero atmosphere. |
| `--shadow-sm` | 1 px ambient shadow | Small elevation. |
| `--shadow-md` | 6 px / 2 px shadow pair | Cards and popovers. |
| `--shadow-lg` | 24 px soft shadow | Dialogs and floating panels. |
| `--inner-highlight` | inset 1 px white 8% | Top inner highlight on glass. |
| `--glow-brand` | 1 px `brand-border` + 32 px primary glow | Focused/selected house element. |
| `--glow-accent` | 1 px `accent-border` + 32 px secondary glow | Focused/selected accent element. |
| `--glow-highlight` | 1 px `highlight-border` + 32 px tertiary glow | Focused/selected highlight element. |

#### House aliases

| Token | Default | Use |
| --- | --- | --- |
| `--house-flag` | `var(--primary-800)` | House banner colour. |
| `--house-second` | `var(--secondary-300)` | Second banner colour; Hogwarts uses `primary-400`. |
| `--house-glow` | `var(--primary-300)` | House light/glow colour. |
| `--house-tower-hue` | `0deg` | Rotates the castle tower light for each house. |

### Tailwind bridge

Tailwind utilities use a mirror namespace declared in `@theme inline` at the top of `globals.css`. The bridge exists so utilities such as `bg-surface`, `text-fg-brand` or `border-brand-border` resolve to the same tokens. Edit the semantic token, not the bridge.

The mapping is mechanical (`--color-foo` → `--foo`) with these exceptions:

| Bridge token | Maps to |
| --- | --- |
| `--color-obsidian` | `--bg-sunken` |
| `--color-vault` | `--surface-1` |
| `--color-gold` | `--fg-brand` |
| `--color-lumos` | `--brand` |
| `--color-parchment` | `--fg-strong` |
| `--color-surface` | `--surface-1` |
| `--color-brand-on` | `--on-brand` |

The complete bridge set is:

```text
--color-bg-sunken      --color-bg            --color-surface        --color-surface-1
--color-surface-2      --color-surface-3     --color-fg             --color-fg-strong
--color-fg-muted       --color-fg-subtle     --color-fg-disabled    --color-fg-brand
--color-fg-accent      --color-fg-highlight  --color-brand          --color-brand-hover
--color-brand-active   --color-brand-soft    --color-brand-border   --color-brand-on
--color-accent         --color-accent-soft   --color-accent-border  --color-highlight
--color-highlight-soft --color-highlight-border --color-line-subtle --color-line
--color-line-strong    --color-ring          --color-danger-fg      --color-danger-soft
--color-obsidian       --color-vault         --color-gold           --color-lumos
--color-parchment      --shadow-glow-brand   --shadow-glow-accent   --shadow-glow-highlight
--shadow-inset         --font-sans           --font-serif           --font-harryp
```

There is deliberately no bridge for the hover/active pairs other than brand, for the full status family, or for the `on-*` tokens other than brand; use the `var(--token)` form in component CSS when you need those.

### Typography

| Token | Source | Use |
| --- | --- | --- |
| `--font-garamond` | `localFont` Garamond files in `layout.tsx` | Editorial serif (`font-serif`). |
| `--font-outfit` | `localFont` Outfit in `layout.tsx` | UI sans (`font-sans`, default body). |
| `--font-handwriting` | `localFont` Caveat in `layout.tsx` | Signatures and marginalia. |
| `--font-harryp` | `localFont` HarryP in `layout.tsx` | Festival wordmark (`font-harryp`). |
| `--font-sans` | `var(--font-outfit)` | Tailwind `font-sans`. |
| `--font-serif` | `var(--font-garamond)` | Tailwind `font-serif`. |
| `--font-harryp` | `var(--font-harryp)` | Tailwind `font-harryp`; the name is intentionally identical. |

Fonts are self-hosted by `next/font`; changing the family means changing the loader in `layout.tsx`, not the CSS.

### Page and component tokens

These palettes are local to one experience. They are declared on the component root, so they can be adjusted without touching the global theme.

#### Loading scene

| Token | Default | Use |
| --- | --- | --- |
| `--loading-x-far` / `--loading-y-far` | `0px` | Far parallax layer offset. |
| `--loading-x-mid` / `--loading-y-mid` | `0px` | Mid parallax layer offset. |
| `--loading-x-near` / `--loading-y-near` | `0px` | Near parallax layer offset. |

Set them on `.loading-screen` if you reintroduce pointer parallax; the bundled scene currently keeps the layers at rest.

#### Marauder's Map

| Token | Default | Use |
| --- | --- | --- |
| `--map-paper` | `#ead8b3` | Map parchment. |
| `--map-paper-deep` | `#b78d60` | Parchment edge/shadow. |
| `--map-ink` | `#3f3027` | Primary map ink. |
| `--map-ink-soft` | `#705440` | Secondary map ink. |
| `--map-burgundy` | `#6e302d` | Route and seal accent. |
| `--map-gold` | `#c99c50` | Marker gold. |

#### Home experience

| Token | Default | Use |
| --- | --- | --- |
| `--home-ink` | `bg-sunken` 88% + black | Atelier ink. |
| `--home-panel` | `surface-1` 84% | Translucent atelier panel. |
| `--home-line` | `fg-brand` 24% | Atelier hairline. |

#### Acceptance letter

| Token | Default | Use |
| --- | --- | --- |
| `--ink` | `#23170c` | Letter ink. |
| `--parchment` | Layered radial + linear gradient | Aged paper surface. |
| `--envelope-paper` | Layered radial + linear gradient | Envelope stock. |
| `--W` | `240`–`560px` | Sheet width, measured from the viewport; every other size derives from it. |
| `--P` | `W × .46` | One fold panel height. |
| `--E` | measured px | Envelope width. |
| `--EH` | measured px | Envelope height. |
| `--D` | measured px (max 150) | Desk-plane offset. |
| `--S` | `P × .34` | Wax seal diameter. |
| `--persp` | `1100px` | 3D perspective. |
| `--row` | `0`, `1`, … | Strip offset in sheet heights; keeps the paper grain and print aligned across folds. |
| `--seal` | `0` | Wax seal progress; GSAP drives it to `1`. |
| `--edge` | `0` | Paper edge glow; GSAP drives it. |
| `--warm` | `0` | Warm paper glow; GSAP drives it. |
| `--shine` | `130%` | Name-shine background position. |
| `--shineOn` | `0` | Name-shine opacity. |

The layout variables (`--W`, `--P`, `--E`, `--EH`, `--D`, `--S`, `--persp`) are computed from the measured viewport in `acceptance-letter.tsx`. Leave them to the component; override the material colours if you are reskinning the letter.

#### Registration arrival

| Token | Default | Use |
| --- | --- | --- |
| `--paper-height` | `min(560px, calc(100svh - 230px))` | Height of the folded invitation. |
| `--piece` | `calc(var(--paper-height) / 3)` | One folded panel. |
| `--paper-surface` | Layered grain + gradient | Invitation paper. |
| `--dissolve` | `0%` | Ink-dissolve progress. |
| `--iris` | `0%` | Iris reveal progress. |
| `--drift` | unset | Per-mote horizontal drift; optional hook used by the mote keyframe. |

#### Alumni registry

| Token | Default | Use |
| --- | --- | --- |
| `--registry-gold` | `#d8b778` | Ledger gold. |
| `--registry-wine` | `#642932` | Wax and leather. |
| `--registry-ink` | `#39291e` | Registry ink. |
| `--paper` | `#ead9b4` | Ledger paper (local override). |
| `--ink` | `var(--registry-ink)` | Ink alias (local override). |
| `--bg` | `#1d0c12` | Registry room background. |
| `--fg` | `#eadbc1` | Registry body text (dark room). |
| `--fg-strong` | `#f0dfbc` | Registry headings. |
| `--fg-muted` | `#c5b29b` | Registry secondary text. |
| `--fg-subtle` | `#b19a7d` | Registry metadata. |
| `--fg-brand` | `var(--registry-gold)` | Registry accent text. |
| `--brand` | `var(--registry-gold)` | Registry accent fill. |
| `--ring` | `#ecd19c` | Registry focus ring. |
| `--surface-1` | `#fff8df80` | Paper card fill (paper scope). |
| `--line` | `#a7835545` | Paper rules (paper scope). |

The paper sheets re-declare `--fg`, `--fg-strong`, `--fg-muted`, `--fg-subtle`, `--fg-brand`, `--surface-1`, `--line` and `--ring` to dark-ink values so shared form and text components stay readable on cream. Keep those local overrides when editing the registry.

#### Council gallery

| Token | Default | Use |
| --- | --- | --- |
| `--council-gold` | `#d8b778` | Frames and rules. |
| `--council-gold-light` | `#f2deb1` | Highlighted metal. |
| `--council-ink` | `#44301f` | Portrait caption ink. |
| `--council-paper` | `#e9d8b0` | Portrait card paper. |
| `--ring` | `#edce92` | Gallery focus ring. |
| `--seal-base` | `#74373a` | Wax seal base (default chamber). |
| `--seal-deep` | `#3e1b25` | Wax seal shadow. |
| `--seal-highlight` | `#b97361` | Wax seal highlight. |

The wax trio is re-declared per chamber: `aurors` uses `#3c6151 / #193c32 / #819878`, `faculty` uses `#3d536c / #1d2b42 / #8797a8`. The scroll dialog also pins `--ring` to `#7d4331`.

#### Common room

| Token | Default | Use |
| --- | --- | --- |
| `--room-accent` | `#a9c6a8` | House accent for room props. |
| `--room-ink` | `#24372e` | Room ink and headings. |
| `--room-paper` | `#eee4d1` | Parchment panels and dialogs. |
| `--entrance-progress` | `0` | Camera entrance progress; JS writes `0`–`1`. |
| `--welcome-opacity` | `0` | Welcome copy fade, derived from the entrance progress. |

Room accents are re-declared per house: Gryffindor `#d9b374 / #652c26`, Ravenclaw `#b7c9de / #283d58`, Hufflepuff `#e0c38b / #5a4a27`. The panel dialog re-declares `--fg`, `--fg-strong`, `--fg-muted`, `--fg-brand`, `--room-ink` and `--room-paper` for light paper.

#### Book-burger

| Token | Default | Use |
| --- | --- | --- |
| `--book` | `var(--brand-active)` | Cover colour of one book; `.tn-b1`, `.tn-b2` and `.tn-b3` set `brand-active`, `primary-800` and `primary-600`. |
| `--thud` | `0.8px` | Book drop distance in the fall/rise keyframes; `.tn-b1` uses `0.8px` and `.tn-b2` uses `1.6px`. |


### Runtime-only variables

These are written by React, GSAP or the camera controller rather than by a stylesheet. They are listed so you know where to look when you trace a value in DevTools.

| Token | Set by | Use |
| --- | --- | --- |
| `--hero-light-x` / `--hero-light-y` | `magic-interactions.tsx` | Pointer position for the hero light. |
| `--glow-x` / `--glow-y` | `magic-interactions.tsx` | Pointer position for card glows. |
| `--hole` | `ChamberDoor.tsx` | Radius of the transitional hole. |
| `--region-accent` | `marauders-map.tsx` | Category colour for a map region. |
| `--marker-accent` | `marauders-map.tsx` | Category colour for a map marker. |
| `--event-accent` | `marauders-map.tsx` | Category colour for a map event card. |
| `--i` | `room-entrance.tsx` | Stagger index for entrance letters. |
| `--entrance-progress` / `--welcome-opacity` | `camera-controller.tsx` | Common-room entrance progress. |
| `--seal` / `--edge` / `--warm` / `--shine` / `--shineOn` | `letter-timeline.ts` (GSAP) | Acceptance-letter animation state. |

A handful of decorative hooks are still read by legacy markup but are not set anywhere today: `--house-color`, `--dust-left`, `--dust-top`, `--dust-delay`, `--star-left`, `--star-top`, `--star-delay`, `--flame-index`, `--brick-index` and the arrival `--drift`. They are inert (the CSS falls back or inherits) and are safe to set if you reuse those elements.

### Finding a variable

Search by name from the repository root:

```bash
grep -n -- '--primary-hue' src/app/globals.css     # declaration and every use
grep -rn -- '--room-accent' src                   # component and CSS references
```

When you add a token, add it to the owning section and to this document. Before committing, run `grep -o -- '--[a-z0-9-]*' src/app/globals.css | sort -u` and confirm every declaration is covered here.

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
