# Product Roadmap — features mapped from shootix.ae

**Updated**: 2026-11-09 (006 is now the mobile-number sign-in from the 2026-11-09 redesign decision; the referral programme moved to 007). Each row is a Spec Kit feature; `specs/NNN-*/spec.md`
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
| 006 | Mobile number + one-time code sign-in | Client "Email OTP — no password", pro phone + code, country-code list; here: one phone-first flow for login and register (+971 default, SMS or WhatsApp, 6-digit code, role and name on first visit), email/password kept as an editor fallback; Google sign-in and email codes dropped | 001 (accounts), 005 (legal acceptance), 002 (provider onboarding) | draft (spec + clarifications in `specs/006-otp-signin/`; delivery provider decided in the plan) |
| 007 | Introducer / referral programme | 10% / 15% agency commission, referral links, payouts | 003 | idea |
| 008 | Notifications & messaging | WhatsApp / email notifications for briefs, quotations, confirmations; admin alerts | 003 | idea |

## Order of delivery

1. **001** — ships the public site, CMS, accounts, bilingual, themed, brief
   builder to WhatsApp (lead capture).
2. **002** — creators become visible (network cards, specialty pages).
3. **004** — prices exist, so quotations can be computed.
4. **003** — full Quick Match: availability → creator → details → quotation → booking.
5. **005** — content pages and SEO landing pages (can run alongside 002–004).
6. **006** — mobile-number sign-in replaces email/password for members (the 2026-11-09 redesign decision); 007–008 as the business needs them.

## Principles that apply to every feature

See `.specify/memory/constitution.md` (v1.3.0): spec first, performance
budgets, tests for every scenario, content and audiences in the CMS,
modular monolith, responsive + accessible + bilingual + themed, secure by
default, justified complexity, designed not generated (Principle IX: the
The Brief Bar direction and the impeccable design gates).
