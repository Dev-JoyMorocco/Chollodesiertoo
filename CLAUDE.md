# Chollodesierto — Hydrogen storefront

Shopify Hydrogen (2025.5) + React Router 7 (flatRoutes) + Tailwind v4. Deployed
to Oxygen from GitHub (`main` → `.github/workflows/oxygen-deployment-*.yml`).
The same code runs a second store; anything store-specific lives in Shopify
Admin, not in code.

## Working in this repo

- Node is installed: `npm run build` (runs GraphQL codegen, so a bad Storefront
  query fails it) and `npx tsc --noEmit` (0 errors — keep it that way). The unused
  Hydrogen template components (cart, search, header/footer, aside) were removed.
- The Shopify AI Toolkit plugin (`shopify-plugin:shopify` skill) validates
  GraphQL against Shopify's schema. It only knows supported API versions:
  Hydrogen 2025.5 pins Storefront API 2025-04, which is out of support, so
  validate against the oldest one it lists. `admin-query.ts` uses Admin API 2026-07.
- No `.env` and no Admin API token locally, so Admin changes (metaobject
  definitions, fields, variants, entries) are done by the user in Shopify Admin.
  Give them exact steps instead of writing a script that cannot run.
- The user commits and pushes themselves. Don't commit unless asked.
- The user works from screenshots: when two are sent, confirm which one is the
  reference before changing anything.

## Content comes from Shopify

Components keep English fallbacks; Shopify values win when set.

| What | Where in Admin | Read with |
|---|---|---|
| Short texts / labels | Content → Metaobjects → **Website Text** (`ui_string`, key/value) | `t(key, fallback)` from `useT()` (`app/lib/ui-strings`) |
| Section copy + images | Content → Metaobjects → **Page Section** (key e.g. `about.story`, `blog.post`) | `mapPageSections` (`app/lib/admin-queries.ts`) |
| Brand name, logo, tagline, rating, handles | Content → Metaobjects → **Site Settings** | `mapSiteSettings`, root loader |
| Value cards (About "Our values", home trust bar) | **Value Prop** (`group`: `about_values` / `trust`) | `mapValueProps` |

- Website Text only loads the first 250 entries.
- A hardcoded emoji or label in code is only a fallback. When changing one, tell
  the user to update or clear the matching Website Text entry too, and keep
  `scripts/organize-schema.mjs` (the list of Website Text keys) in sync.
- Page Section `subheading` lines are joined with `\n` and rendered with
  `whitespace-pre-line`.
- Paragraphs in AboutBookingSupports support `**bold**` (rendered by `withBold`).
- Uploaded SVGs come back from the Storefront API as `GenericFile` (`url`), PNG/JPG
  as `MediaImage` (`image.url`). Query both and read with `fFileUrl`.
- Value Prop has an optional File field `icon_image`. When set, it replaces the
  built-in icon in AboutValues (the `icon` field is only a name: minibus /
  landscape / card / heart).
- Blog post hero background: article metafield `custom.hero_image` (File,
  Storefront access on), falling back to the `blog.post` Page Section image.
  The `blog.post` section also feeds the "From the Sahara" block.
- Logo alt text = site name: `siteSettings.brandName || shopName`.
- Oxygen env vars per store: `PUBLIC_STORE_DOMAIN`, `PUBLIC_STOREFRONT_API_TOKEN`,
  `PUBLIC_STOREFRONT_ID`, `PUBLIC_CHECKOUT_DOMAIN` (missing it breaks
  Analytics.Provider), `SESSION_SECRET`.

## Styling rules (`app/styles/tailwind.css`)

- Theme tokens live in `@theme`: colors `primary` #C45A2C, `primary-hover`
  #C7460E, `sand`, `dark`, `forest`, `whatsapp` / `whatsapp-hover`; type scale
  `text-hero/h2/h3/label/btn/price`; `rounded-card`; `shadow-card(-m)`. Use the
  tokens — no hex codes copied into components.
- Fonts: Patua One (display) is loaded in **one weight only** — never put
  `font-bold` on `font-display` (it fakes bold). Nunito has no italic loaded — no
  `italic`.
- Eyebrows: `text-label font-bold uppercase text-primary` + `<Underline />`, no
  letter-spacing.
- Underlines: only `app/assets/underline-dark.svg` / `underline-light.svg`, via
  `<Underline tone="dark|light" />` or the `.price-underline` classes. No inline
  squiggle SVGs.
- **Buttons — one class each, defined once.** Each class owns its default AND
  hover background/shadow, so the hover fades smoothly (mixing a Tailwind `bg-*`
  default with a plain-CSS hover made it snap). Hover only changes color and
  shadow: no translate or scale on buttons.
  - `.btn-primary` orange CTA (shadow; hover `#c7460e` + bigger shadow)
  - `.btn-primary-flat` orange, hover darkens only (TourRoutes cards)
  - `.btn-hover-target` orange circle inside a `.group` button (video play)
  - `.btn-whatsapp` green CTA (hover `#009939`); `aria-disabled="true"` fades it
  - Booking controls: `.btn-light` (white pill, steppers / See All Stories /
    Load more), `.btn-dark` (calendar arrows), `.btn-day` (calendar day,
    `data-state="range|edge"`), `.btn-segment` (`aria-pressed`), `.btn-card`
    (route/camp cards, `aria-pressed`). `:disabled` greys them and removes hover.
  - `.btn-smooth` shared transition for every other button.
- **Cursor** is set once in `@layer base`: pointer on `a, button, [role=button],
  label[for], summary, select` and clickable inputs; `not-allowed` on
  `:disabled` and `[aria-disabled=true]`. Don't add `cursor-*` per component
  (draggable carousels use `cursor-pointer` + grabbing while dragging).
- Body copy blocks that must line up on both sides use `text-justify`
  (+ `hyphens-auto`).
- Navbar and footer slogan use `text-shadow-slogan` (`--text-shadow-slogan`).
- A global `prefers-reduced-motion` rule disables transitions/animations.

## Booking page (`app/components/BookingBody.tsx`, `app/routes/booking.tsx`)

- Dates (`app/lib/booking-date.ts`): "today" is **Morocco time**
  (`Africa/Casablanca`). Default departure = tomorrow; today and earlier are
  disabled in the calendar; the "‹" arrow stops at the first bookable month.
  `isBookableIsoDate` re-checks `_arrival_date` in the route action (server side).
- Travelers: `MIN_TRAVELERS = 1`, `MAX_TRAVELERS = 17`; stepper ends are disabled.
- Airport transfer (`app/lib/booking-transfer.ts`): price is a **total for the
  group**, by travelers count and One way / Return. Each row is a variant of the
  transfer product named with its range and leg, e.g. `1-4 travelers / One way`.
  Current prices: 1–4 €14 / €28, 5–7 €19 / €38, 8–17 €35 / €70 (edit them on
  the variants in Admin). The action checks the transfer variant matches the
  tour line's quantity. The summary shows `Airport transfer €xx` (no "1 x").
- Cart lines carry `_arrival_date` and `_tour_type` (canonical, for the booking
  backend) plus localized copies. The tour line is always first.
- Tour variant ids come from the store's tour product at runtime
  (`mapTourVariantIds`: options `Route` + `Camp Tier`, e.g. "Classic Loop" +
  "Shared Camp" → `classic-loop-shared`), so each store books its own variants.
  The ids hardcoded in `BookingBody.tsx` are only a fallback when the product
  can't be read.

## Pages — notes

- Home hero: "Watch the Journey" scrolls in JS (`scrollToJourney`) to
  `#journey` (the TrustBar video card); plain hash links only worked once.
  Camels (`camels.svg`) sit on the front dune.
- Footer camels: `.sf-camel { bottom: 3.75rem; width: clamp(120px, 11vw, 180px) }`.
- Navbar hides the main-menu item whose href is exactly `/booking` (the Book
  Now button replaces it). A different link (trailing slash, other domain)
  shows a duplicate Book Now.
- About: AboutStory collage is placed from the left (top / middle / portrait +
  emoji), text justified, founder line has an SVG Moroccan flag and dots in the
  text color. The "Who we work with" Partners section was removed (component and
  query deleted); AboutPartners ("Our partners") stays.
- Blog: PageHero `underlineLastWord`; the featured card's photo overlaps the
  navy "Featured" strip; the article page has no "← Journal" link.
- `frame_ant.js` → `/api/unstable/graphql.json` 404 in the console comes from a
  browser extension, not this site.
- Policies: `/policies/<handle>` (`policies.$handle.tsx`) shows the policies
  from Admin › Settings › Policies; the footer legal links point there.
- SEO: `/robots.txt` and `/sitemap.xml` are routes built from the request's
  domain and the store's blog posts and policies (`[robots.txt].tsx`,
  `[sitemap.xml].tsx`). New pages must be added to `STATIC_PATHS`.
- Shopify's standard URLs redirect instead of 404: `/cart`, `/products/*`,
  `/collections(/*)` → `/booking`; `/pages/<handle>` → the matching page
  (about, contact, faq, reviews, booking) or home; `/search` → home. `/account/*`
  is not built (no customer accounts).
- `<html lang>` = the store's default language (`localization` in the site
  settings query → `shopLanguage`).
- Contact form posts to the `contact.tsx` action, which saves a
  `contact_message` metaobject (fields `name`, `email`, `message`,
  `submitted_at`) through the Admin API (`app/lib/admin-query.ts`). Needs
  `SHOPIFY_ADMIN_ACCESS_TOKEN` (write_metaobjects) in Oxygen and the definition
  in Admin. Honeypot field `company` filters bots.
- Accessibility: skip link in `root.tsx` → every page's `<main id="main-content">`;
  global `:focus-visible` ring; video popups use `useModal` (Escape, focus trap,
  scroll lock); Testimonials autoplay pauses on focus and is off under reduced motion.

## Copying to another store

Never copy `.env*`, `.shopify/`, `h2_deploy_log.json`, or
`.github/workflows/oxygen-deployment-*.yml`. Skip `node_modules/`, `dist/`,
`.react-router/`, and `data/` (this store's export). Variant ids are read at
runtime, so no code change is needed for them; `vite.config.ts` `allowedHosts`
only affects the local dev server. The second store needs the same Shopify
setup (metaobject definitions, product options `Route` / `Camp Tier`, transfer
variants, Oxygen env vars). See `CLONE-TO-NEW-STORE.md`.
