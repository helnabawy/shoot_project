# Product Roadmap — features mapped from shootix.ae

**Updated**: 2026-11-06. Each row is a Spec Kit feature; `specs/NNN-*/spec.md`
holds the specification. Status: *planned* = spec + plan + tasks exist,
*draft* = spec only (run `/speckit-plan` then `/speckit-tasks` when it is
next), *implemented* = built on its branch, *idea* = not yet specified.

| # | Feature | shootix.ae surface it covers | Depends on | Status |
|---|---------|------------------------------|------------|--------|
| 001 | Landing page, accounts, CMS content, personas, EN/AR, light/dark, **brief builder (Quick Match step 1)** | Home: hero, Quick Match sentence widget (incl. "Get a quote on WhatsApp"), How it works, Why Shootix, Browse by specialty (grid without counts), pro band, FAQ, trusted-by logos, header/footer, EN/AR toggle, client/pro sign-in (email+password here), content area | — | planned |
| 002 | Creator profiles & directory | "Our network" cards, /recommended, /work/{specialty} pages with sample + pro counts, "Find your professional", "Pick your own pro", verified badge, portfolio samples, a short creator code (prefix decided with the brand name), photo/video tags, provider onboarding after sign-up | 001 (accounts, personas, categories, media) | implemented (open: e2e re-run, second design reviews; shipped when merged) |
| 003 | Quick Match matching, quotation & booking | Steps 2–4: "Your creator" (availability by date, one price), "Your details" (name + WhatsApp), "Your quotation" (PDF, accept online), pro confirmation, booking states, payment held until delivery, "paid within 10 days", client six-step process | 001 (briefs), 002 (creators); carries 004's price-rule core | implemented |
| 004 | Pricing, packages & promotions | /pricing tabs (photo / video / both), hourly tiers with edited-photo counts, included/not included, travel fees per emirate, promo codes (WELCOME20), multi-day partner rates, /corporate retainers (term tabs, Essential/Growth/Brand Studio, add-ons, planning-call CTA, comparison, FAQ), /flash-deals, /extras, /plus, "Call" CTA | 001 (CMS, personas, option sets for durations/locations) | draft |
| 005 | Marketing & legal pages, blog | /terms, /terms/professional, /terms/ar, /privacy, /studios, /blog (guides), SEO landing pages (/hire/…, /work/…), 404, sitemap entries | 001 (blocks, localisation) | implemented (open: design finish reviews, Lighthouse CI run, full e2e run; shipped when merged) |
| 006 | Mobile accent colour (`specs/006-mobile-accent-colour/`): per-device accent, fixed `primary` red, saved appearance and language | Flutter app appearance sheet | mobile boilerplate | planned |
| 007 | Mobile foundation: type scale, design-system widget library, motion, app shell and routing, pixel-diff pipeline against the canvas | Screens 37, 39 and a component gallery | 006 | planned |
| 008 | Mobile REST API (`/api/mobile/v1`): handler wrapper, problem errors, read endpoints, `resolve`, contracts, deep-link files | none (backend) | 001, 002, 003, 005 | planned |
| 009 | Mobile-number OTP sign-in (SMS / WhatsApp) for app and web; replaces idea "Phone / email one-time-code" | Screens 20–23 | 008 | planned |
| 010 | Mobile first visit and landing | Screens 01–06 | 007, 008 | draft |
| 011 | Mobile creators: directory, profile, book this creator, specialty, hire | Screens 15–19 | 007, 008 | draft |
| 012 | Mobile Quick Match and booking | Screens 07–14, 40 | 009, 011 | draft |
| 013 | Mobile client account | Screens 24–26 | 009, 012 | draft |
| 014 | Mobile creator account | Screens 27–32 | 009, 011 | draft |
| 015 | Mobile guides, editor pages and legal | Screens 33–36, 38 | 007, 008 | draft |
| 016 | Introducer / referral programme | 10% / 15% agency commission, referral links, payouts | 003 | idea |
| 017 | Google (and Apple) sign-in | "Continue with Google", Sign in with Apple (required on iOS once Google is offered) | 009 | idea |
| 018 | Notifications & messaging | WhatsApp / email notifications (app push for briefs comes with 019) for briefs, quotations, confirmations, creator requests; admin alerts | 003, 009 | idea |
| 019 | Creator brief inbox (`specs/019-creator-brief-inbox/`, `BI-`): matching creators see open briefs in Up next (web and app), accept or reject; acceptors listed first at step 2 and assigned confirmed; app push both ways | Creator account home, Quick Match step 2, app creator account | 003, 012, 014 | implemented (open: owner's APNs key and service account, device walkthrough, goldens, finish review) |

Renumbered 2026-11-11: the ideas once listed as 006 (Introducer), 007 (one-time-code sign-in) and
008 (Notifications) are now 016, 009/017 and 018. Older specs that say "feature 008" for outbound
notification sending (`specs/003-quick-match-booking/`) mean 018.

Screen numbers refer to the design canvas (`specs/design-system/canvas/manifest.json`). Features
007–015 build the Flutter app (`apps/mobile`) pixel-for-pixel from those boards; see
`.claude/skills/flutter-mobile` and `.claude/skills/design-fidelity`.

## Order of delivery

1. **001** — ships the public site, CMS, accounts, bilingual, themed, brief
   builder to WhatsApp (lead capture).
2. **002** — creators become visible (network cards, specialty pages).
3. **004** — prices exist, so quotations can be computed.
4. **003** — full Quick Match: availability → creator → details → quotation → booking.
5. **005** — content pages and SEO landing pages (can run alongside 002–004).
6. **Mobile app**: 006 → 007 → 008 → 009 → 010 → 011 → 012 → 013 → 014, with 015 alongside
   010–014 once 008 exists.
7. 016–018 as the business needs them.

## Principles that apply to every feature

See `.specify/memory/constitution.md` (v1.4.0): spec first, performance
budgets, tests for every scenario, content and audiences in the CMS,
modular monolith, responsive + accessible + bilingual + themed, secure by
default, justified complexity, designed not generated (Principle IX: the
The Brief Bar direction and the impeccable design gates).
