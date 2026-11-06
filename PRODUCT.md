# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 16 (App Router, React) with Payload CMS 3 embedded, PostgreSQL, Tailwind CSS v4, pnpm monorepo. Binding per `.specify/memory/constitution.md`; chosen by the user from "Angular or React + Node + MongoDB + Payload", then switched to PostgreSQL on 2026-11-07 for bookings, payments and reporting.

## Users

Two client types, served equally by one flow (confirmed 2026-11-06):

- **Individuals** in the UAE booking a one-off shoot: weddings and engagements, proposals, birthdays, family and newborn, portraits. Usually first-timers, usually on a phone, often reached through WhatsApp or Instagram, deciding quickly and wanting to know the price and whether someone is free.
- **Businesses and brands** booking content: products, food and drinks, property, corporate and branding, social media content. Repeat buyers who value speed, a fixed price and a reliable professional.

Secondary audiences:

- **Creators** (photographers, videographers; later other professions such as teachers) who register to receive work.
- **The owner and editors** who run the content area: change copy, options, the WhatsApp number and the audience without a developer.

## Product Purpose

A marketplace front door that turns "I need a shoot" into a booked professional with as little effort as possible. The client describes the job in one sentence ("You brief. We shoot."), sees that it is handled, and is in a conversation within a minute. Success: a first-time visitor reaches a WhatsApp conversation or a recorded brief in under 60 seconds on a phone, without reading instructions.

## Positioning

Inspired by shootix.ae: verified professionals, one fixed price shown before booking, a one-sentence brief instead of a quote form. Differentiators specific to this product: the target audience is data (the same site can serve teachers or any profession tomorrow), and the whole experience is bilingual English/Arabic with right-to-left done properly. Any further claim (pricing, guarantees, verification process) is undecided and must not be invented.

## Operating Context

- Market: UAE (Dubai, Abu Dhabi, Sharjah, Ajman, Ras Al Khaimah, Fujairah, Umm Al Quwain, Al Ain). Currency AED.
- Conversion runs through WhatsApp; one business number managed in the CMS.
- Most visits are mobile, many in dark mode, many in Arabic.
- Editors work in the Payload admin, in English or Arabic.

## Capabilities and Constraints

- Feature 001 (planned in `specs/001-landing-auth-cms/`): landing page, brief builder (sentence with CMS-managed options: persona, occasion, date, duration, emirate, shot by), WhatsApp hand-off and lead record, register/login/account, CMS-editable content, personas, EN/AR, light/dark.
- Later features (`specs/ROADMAP.md`): creator directory and profiles, matching/quotation/booking, pricing and corporate packages, marketing/legal pages.
- Performance budgets are binding: LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms, landing JS ≤ 200 KB.
- Every visible word is CMS data or a translation key; no audience name in code.
- Terminology: client (seeker), creator (provider), persona, category/specialty, brief.
- Undecided: final brand name (working name "Shoot Project"), payment provider, commission, verification process.

## Brand Commitments

- Working name "Shoot Project" until a final name is chosen; no logo exists.
- Voice taken from the confirmed hero line "You brief. We shoot.": short, plain, direct, no agency jargon.
- The user requires a modern design that does not look AI-generated, and a client flow that is as simple and straightforward as possible.
- Standing preference (2026-11-07): the owner wants warmth, people and Dubai-grade premium polish over literal concepts, and chose a direction of their own, macOS Spotlight and Quick Actions ("The Brief Bar"), after rejecting a ticket and a signage world as costumes.

## Evidence on Hand

None yet (confirmed 2026-11-06): no portfolio photos or videos, no logo, no client logos, no testimonials, no reviews, no counts of creators or samples. Do not fabricate testimonials, client logos, creator counts, ratings, prices or press. Imagery slots must be designed to work with honest placeholders and to receive real photography later through the CMS.

## Product Principles

1. **One sentence, one tap.** The brief is the interface; every extra field, screen or decision must justify itself against "under 60 seconds on a phone".
2. **Price and next step are never hidden.** The client always knows what happens next and how to reach a person.
3. **Both languages are first-class.** Arabic is designed, not translated after the fact.
4. **Honest by default.** Show only real proof; an empty state is better than an invented number.
5. **The owner runs it.** Anything a client reads can be changed in the content area without a developer.

## Accessibility & Inclusion

WCAG 2.1 AA in both themes and both languages; keyboard and screen-reader operable brief builder; works without JavaScript; touch targets ≥ 44 px; respects reduced motion.
