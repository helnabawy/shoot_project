# Prompt for Claude `/design` — brand and design system

Brand name: **Shoot** (Arabic: شوت), a working name for now. Paste everything below the line.

---

## 1. Your role

You are a senior brand and product designer who has shipped bilingual (English / Arabic)
consumer marketplaces in the Gulf. Your job is to create the brand identity and a complete,
production-ready design system for **Shoot**, a web platform in the UAE, and then show
the system working on its key screens. This is a redesign of a site that already works. The
product, the flows and the content model stay the same; the brand and the visual language change.

## 2. The product

- **Brand name:** Shoot (Arabic: شوت). This is a working name and may change, so build the
  identity so that swapping the wordmark doesn't break the system.
- **What it is:** a marketplace front door that turns "I need a shoot" into a booked
  professional with as little effort as possible. Today it brokers photographers and
  videographers. Tomorrow it may broker any profession (teachers, for example), so apart from
  the name itself, the visual system must not depend on camera imagery.
- **Hero line (confirmed, keep it):** "You brief. We shoot."
- **How it converts:** the client describes the job in **one sentence** built from tappable
  options (who, occasion, date, duration, emirate, shot by), sees a fixed price, picks a
  professional, and lands in a WhatsApp conversation. Goal: a first-time visitor on a phone
  reaches WhatsApp or a recorded brief **in under 60 seconds** without reading instructions.
- **Market:** UAE, all seven emirates plus Al Ain. Currency AED. Most visits are on a phone,
  many in dark mode, many in Arabic.
- **Sign-in:** the primary way to log in or register is a **UAE mobile number and a one-time
  code (OTP)** sent by SMS or WhatsApp. No password screen in the main path. Email/password is
  a secondary fallback only (for example for editors), reached through a quiet link.
  **Sign-in comes at the end of the brief, never before it**: brief → choose → details → number
  → code → WhatsApp. There is no login wall on the landing page, the directory or a profile.
- **First visit:** a short splash and three skippable learning steps (how to brief, how price and
  availability work, why the number is the account), then after the first booking a one-time
  "finish your account" checklist. All of it is CMS content and shows once per device.

## 3. Who it's for

1. **Individuals** booking a one-off shoot: weddings, engagements, proposals, birthdays,
   family and newborn, portraits. Usually first-timers on a phone, often coming from Instagram
   or WhatsApp. They want to know the price and whether someone is free.
2. **Businesses and brands** booking content: products, food and drinks, property, corporate,
   social media. Repeat buyers who care about speed, a fixed price and reliability.
3. **Creators** (the professionals) who sign up to get work and manage their profile,
   samples, availability and bookings.
4. **The owner and editors**, who run all copy and options from a CMS admin panel.

## 4. Brand personality and voice

- **Feel:** warm, human, premium to Dubai standards, and familiar. People and light, not
  gadgets. Polished through restraint, not decoration.
- **Voice:** short, plain and direct, like the hero line. No agency jargon, no hype, no
  exclamation marks. Both languages sound native. Arabic is written in Arabic, not translated
  from English.
- **What the owner has already rejected:** "costume" concepts that act out photography
  literally (film tickets, event signage, clapperboards, camera-shutter motifs). The previous
  direction, "The Brief Bar" (a macOS Spotlight-style floating search panel on a warm stone
  background, one blue accent, system fonts), was liked for being simple and familiar. You
  can evolve it or replace it, but whatever you propose must be at least as simple to use.

## 5. Hard constraints (non-negotiable)

**Bilingual and RTL**
- English (LTR) is the default and Arabic (RTL) is equal to it. Every component is designed
  and shown in both directions.
- Use logical properties only (start/end, inline/block), never left/right. Icons that imply
  direction (arrows, chevrons, progress) mirror in RTL. Logos, media controls and numerals
  don't mirror.
- Pick an Arabic typeface designed alongside the Latin one (matching weight, x-height feel
  and rhythm), not a fallback. Arabic needs more line height and must never use letter-spacing.
- Mixed text such as `AED 1,200`, phone numbers, dates and creator codes must render correctly
  in both directions.

**Light and dark**
- Dark ("the phone at night") is a first-class theme, not an inverted copy of light. Every
  colour is a semantic token with a light value and a dark value.

**Accessibility**
- WCAG 2.1 AA in both themes: text contrast ≥ 4.5:1 (≥ 3:1 for large text and UI
  boundaries). List the contrast ratio for every text/background token pair.
- Visible focus states, touch targets ≥ 44 px, no meaning carried by colour alone, and
  reduced-motion alternatives for every animation.

**Performance (these are requirements)**
- LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, landing page JS ≤ 200 KB.
- Font budget: at most 2 families (Latin + Arabic) and 4 font files in total, subset and
  `font-display: swap`. System fonts are allowed if they serve the brand better.
- No decorative images or video the layout depends on. Effects are CSS-only and cheap: one
  shadow scale, a few gradients, no blur on large surfaces on mobile.

**Mobile first**
- Design at 360 px first, then 768, 1024 and 1440 px.
- One primary action per screen. On mobile it stays within thumb reach.

**Honesty**
- There are **no** real photos, logos, testimonials, reviews, ratings, client logos,
  creator counts or press yet. Don't invent any. No fake stars, no "500+ happy clients",
  no stock-photo people presented as real work.
- Every image slot needs an honest, designed placeholder (empty state) that looks finished
  on its own and still works when the CMS fills it with real photography later.

**Content is data**
- All copy, option lists, audience names (photographer, videographer, and later anything
  else), prices and the WhatsApp number come from the CMS. Components must handle longer
  text, Arabic text that's 20–30 % longer or shorter, missing values and empty lists.

**Don't make it look AI-generated.** Avoid these template tells: purple-to-blue gradients,
glassmorphism everywhere, rows of three identical feature cards with icons, oversized
emoji, "Trusted by" logo strips, generic 3D blobs, stock gradient meshes, centred-everything
layouts, cards nested inside cards, and filler subtitles under every heading.

## 6. Deliverables

### A. Brand foundations
1. **Logo:** a "Shoot" wordmark in Latin and a "شوت" wordmark in Arabic, a lockup of both,
   and a compact mark or monogram for the favicon, app icon and WhatsApp avatar. No camera,
   lens, shutter or film icon in the mark. Show it on light, dark and photo backgrounds, plus
   minimum size and clear space.
2. **Brand idea:** one sentence (the north star) and 3–5 principles that explain the design
   decisions.

### B. Foundations (design tokens)
Define every token as a **semantic role** with a light and a dark value:
- **Colour:** ground (page background), panel, panel-solid, ink (main text), mute (secondary
  text), hair (borders), tile, tile-ink, accent, on-accent, selected, selected-hover,
  selected-ink, attention, on-attention, focus, success, warning, danger, photo-scrim.
  Keep one accent colour. Give each pair's contrast ratio.
- **Typography:** the Latin and Arabic families and a type scale (display, headline, section
  title, field, top-hit / primary row, row, body, meta, group label), with size, weight,
  line height and letter-spacing per step, a mobile and desktop size where they differ, and
  the Arabic adjustments. Use tabular numerals for prices and dates.
- **Spacing:** a 4 px based scale, page gutters per breakpoint, content column widths (a
  narrow reading column of about 680 px, a wide pane of about 1080 px, a form column of about
  480 px).
- **Radius, elevation and borders:** a small scale (row, tile, panel, sheet) and one shadow
  scale for light and dark.
- **Motion:** durations, easing curves, what moves and what never moves, and the
  reduced-motion fallback.
- **Iconography:** stroke style, grid, sizes, and which icons mirror in RTL.
- **Imagery:** art direction for future real photos (light, crop, people, skin tones
  across the UAE's diverse population, modest and culturally appropriate), plus the
  placeholder style used until real photos exist.

### C. Components (each with every state: default, hover, focus, active, selected, disabled, loading, error, empty, in LTR and RTL, light and dark)
- **Brief builder:** the one-sentence brief with inline tappable slots, the option picker
  for each slot (grouped list rows on mobile, inline on desktop), the date picker, and the
  primary action showing price and "Continue on WhatsApp".
- Buttons (primary, secondary, quiet, icon button, WhatsApp action), links.
- Form fields: text, phone (UAE format), email, password, select, checkbox, radio,
  segmented control, toggle, textarea, file and image upload, with helper and error text.
- **Phone + OTP sign-in:** a phone field with the country code fixed to +971 (other codes
  reachable but not default) that formats as you type; a 6-digit code input with auto-advance,
  paste support and one-time-code autofill from SMS; a resend action with a visible countdown;
  a "change number" link; and the states: sending, wrong code, expired code, too many
  attempts, and the delivery channel (SMS or WhatsApp).
- Header (logo, nav, language switch EN/عربي, theme switch light/dark/system, account),
  mobile menu, footer.
- **Creator card and row** (photo, name, specialty, emirate, creator code, starting price),
  creator profile header, sample gallery and viewer.
- Directory filters (specialty, emirate, date) and sorting.
- Quick Match steps: step indicator, a choose-a-creator list, booking details form.
- **Quotation document:** line items, total in AED, status, a print layout (A4).
- Booking status badge and timeline, availability calendar for creators.
- Account dashboard tiles, empty states, toasts, inline alerts, modal / bottom sheet,
  skeleton loaders, a 404 / removed page.
- Content blocks for editor-built marketing pages: hero, rich text, image + text, FAQ,
  call-to-action band, guide / article layout, legal page layout.

### D. Key screens (show each at 360 px and 1440 px, in English-light and Arabic-dark)
1. Landing page with the brief builder in the hero ("You brief. We shoot.").
2. Quick Match step 2, choosing a creator.
3. Quick Match step 3, booking details.
4. Quotation and booking status page.
5. Creators directory.
6. Creator profile.
7. Client account: bookings list.
8. Creator account: profile editor and availability.
9. Sign-in: enter mobile number → enter code → (first time only) choose a role, "I need a
   professional" / "I'm a professional", and a name. One flow for both login and register;
   the system decides which it is from the number.
10. Not found.

### E. Handoff
- Export all tokens as **CSS custom properties** on `:root` with a `.dark` override, named
  by role, ready to map into **Tailwind CSS v4** through `@theme inline`. Keep the role
  names from 6B so they replace the current tokens one for one
  (`--ground --panel --panel-solid --ink --mute --hair --tile --tile-ink --accent --on-accent
  --selected --selected-hover --selected-ink --attention --on-attention --focus
  --photo-scrim --radius-panel --radius-row --radius-tile --shadow --shadow-panel`), and list
  any new tokens separately.
- A short **DESIGN.md**: north star, tokens with values, a component inventory with usage
  rules, do's and don'ts, and the RTL and dark-mode rules.
- Components should be buildable as React + Tailwind with no UI library and no extra
  animation library.

## 7. How to work

1. **Explore first.** Show **3 distinct visual directions** for the landing page hero with
   the brief builder, each at 360 px in English-light and Arabic-dark. One of them should
   evolve "The Brief Bar"; the other two should be genuinely different. Name each direction,
   give its one-line idea, and say what it's best and worst at. Then **stop and wait for my
   choice.**
2. After I pick, build the foundations (6A–6B), then the components (6C), then the screens
   (6D), then the handoff (6E). Show progress after each stage.
3. Check your own work before showing it: contrast ratios, RTL mirroring, the 360 px layout,
   dark mode, empty states, long Arabic strings, and the AI-look list in section 5.
4. When something isn't specified, choose the simplest option that helps a first-time client
   on a phone, and note the assumption.
