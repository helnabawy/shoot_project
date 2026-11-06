# Quickstart & Validation: Landing Page, Member Accounts and CMS-Managed Content

**Plan**: [plan.md](plan.md) | **Contracts**: [contracts/](contracts/)

## Prerequisites

- Node 24 LTS (`nvm use` reads `.nvmrc`), pnpm 10.x, Docker (for PostgreSQL).
- Copy `apps/web/.env.example` to `apps/web/.env` and set `PAYLOAD_SECRET`,
  `PREVIEW_SECRET`, `CRON_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`;
  `DATABASE_URI` defaults to `postgres://shoot:shoot@127.0.0.1:5432/shoot`
  (the Docker Compose service).

## Setup and run

```bash
pnpm install
docker compose up -d postgres
pnpm --filter web payload migrate  # apply committed migrations
pnpm --filter web seed             # admin + personas + categories + option sets + settings + landing page + brief builder
pnpm --filter web dev              # http://localhost:3000 ; admin at /admin
```

## Automated validation (what CI runs)

```bash
pnpm typecheck
pnpm lint
pnpm test:coverage                 # unit + component + integration, thresholds enforced
pnpm --filter web build
pnpm test:e2e -- --grep @smoke     # Playwright, migrated + seeded Docker PostgreSQL, mobile, desktop, nojs, ar-mobile, dark
npx @lhci/cli autorun              # budgets in lighthouserc.json
```

Expected: all green; coverage ≥ 80% (app) and 100% statements (domain);
Lighthouse performance ≥ 90, accessibility ≥ 95 on `/`, `/login`, `/register`
and on `/ar`, `/ar/login`, `/ar/register`, in both light and dark emulation.

## Scenario → test mapping (Principle III)

| Story / scenario | Layer | Test |
|------------------|-------|------|
| US1-S1 hero + sections render in order | e2e, component | `e2e/us1-landing.spec.ts`, `modules/landing/components/*.test.tsx` |
| US1-S2 anchors scroll without reload, URL fragment | e2e | `us1-landing.spec.ts` |
| US1-S3 no horizontal overflow at 360 px | e2e (mobile project) | `us1-landing.spec.ts` |
| US1-S4 keyboard/screen-reader reachable | e2e (axe) + component (roles) | `us1-landing.spec.ts`, section tests |
| US1-S5 empty section omitted | component | `RenderBlocks.test.tsx` |
| US2-S1 WhatsApp link = configured number + message | unit, component, e2e | `domain/contact/whatsapp.test.ts`, `WhatsAppButton.test.tsx`, `us2-whatsapp.spec.ts` |
| US2-S2 floating button visible, not covering controls | e2e (mobile) | `us2-whatsapp.spec.ts` |
| US2-S3 number change live ≤ 60 s | integration (hook revalidates) + e2e | `site-settings.int.test.ts`, `us3-cms.spec.ts` |
| US3-S1/S2 edit + publish visible, reorder | integration + e2e | `landing-page.int.test.ts`, `us3-cms.spec.ts` |
| US3-S3 invalid WhatsApp number rejected | unit + integration | `whatsapp.test.ts`, `site-settings.int.test.ts` |
| US3-S4 drafts not public | integration + e2e | `landing-page.int.test.ts`, `api.spec.ts` |
| US3-S5 non-editor denied admin | integration + e2e | `auth.int.test.ts`, `us3-cms.spec.ts` |
| US4-S1…S7 register/login/lockout/logout/no escalation | unit (schemas), component (forms), integration, e2e | `domain/auth/schemas.test.ts`, `RegisterForm.test.tsx`, `LoginForm.test.tsx`, `auth.int.test.ts`, `us4-auth.spec.ts` |
| US5-S1…S4 add/deactivate/delete persona | unit (resolve/interpolate), integration, e2e | `domain/personas/*.test.ts`, `personas.int.test.ts`, `us5-personas.spec.ts` |
| Edge: no active persona | component + integration | `PersonaSelect.test.tsx`, `personas.int.test.ts` |
| Edge: JS disabled forms/links | e2e (`nojs` project) | `us4-auth.spec.ts`, `us2-whatsapp.spec.ts` |
| FR-033 stateless / two instances | e2e (optional job) | `docker compose --scale web=2` + login/session check |
| US6-S1 Arabic site fully Arabic, RTL | e2e (`ar-mobile` project), component (`dir=rtl` render) | `us6-i18n.spec.ts`, section tests with `ar` fixtures |
| US6-S2 switcher keeps page/anchor, no reload, persists | e2e | `us6-i18n.spec.ts` |
| US6-S3 browser language negotiation | e2e (`Accept-Language: ar`) | `us6-i18n.spec.ts` |
| US6-S4/S5 per-language editing, fallback to English | integration | `localization.int.test.ts` |
| US6-S6 admin UI in Arabic | e2e | `us6-i18n.spec.ts` |
| US6-S7 RTL overflow, bidi numbers, mirrored icons | e2e (ar-mobile) + component | `us6-i18n.spec.ts`, `ResultRow.test.tsx` (glyph tile on the start side, key hint on the end side) |
| US6-S8 hreflang + lang | e2e | `us6-i18n.spec.ts` |
| FR-039 translation files complete | unit | `messages.test.ts` (same keys in `en.json` and `ar.json`) |
| FR-041 placeholders in Arabic | unit | `domain/personas/interpolate.test.ts` (`ar` conjunctions) |
| US7-S1 no flash of light theme in dark mode | e2e (`colorScheme: 'dark'`) | `us7-theme.spec.ts` (first-frame screenshot + computed background) |
| US7-S2 toggle applies, persists, system option | component + e2e | `ThemeToggle.test.tsx`, `us7-theme.spec.ts` |
| US7-S3 contrast in both themes | e2e (axe ×2) + Lighthouse | `us7-theme.spec.ts`, `lighthouserc.json` |
| US7-S4 admin theme preference | e2e | `us7-theme.spec.ts` |
| US8-S1/S2 sentence renders, persona re-filters options | component | `BriefBuilder.test.tsx` |
| US8-S3 brief recorded + WhatsApp opens with sentence | integration + e2e | `briefs.int.test.ts`, `us8-brief.spec.ts` |
| US8-S4 required slot / past date rejected | unit + component | `domain/brief/schema.test.ts`, `BriefBuilder.test.tsx` |
| US8-S5 new option visible ≤ 60 s | integration (revalidate) + e2e | `briefs.int.test.ts`, `us8-brief.spec.ts` |
| US8-S6 new slot from CMS without code | component (fixture with `{subject}` slot) | `BriefBuilder.test.tsx` |
| US8-S7 Arabic builder RTL | e2e (`ar-mobile`) | `us8-brief.spec.ts` |
| US8-S8 member link + account list | integration + e2e | `briefs.int.test.ts`, `us8-brief.spec.ts` |
| US8-S9 no-JS submit redirects to WhatsApp | e2e (`nojs`) | `us8-brief.spec.ts` |
| FR-050 dedupe + anonymous limit | integration | `briefs.int.test.ts` |
| FR-056/FR-057 one primary action, visible at 360×640 | e2e | `us1-landing.spec.ts` |
| FR-059 confirmation shows reference + reply time | component + e2e | `BriefSuccess.test.tsx`, `us8-brief.spec.ts` |
| FR-061/SC-016 banned patterns, design review | detector + finish review | T104 |
| FR-062 reduced-motion path | component | `motion.test.ts` |
| SC-015/SC-017 usability, tap count | moderated test | `usability.md` (T106) |

## Manual walkthrough (after `pnpm --filter web dev`)

1. **US1** Open `/` on a phone-width viewport: hero "You brief. We shoot.",
   the six-line brief panel and the "See who's free" action panel with
   "Rather talk? WhatsApp us" beneath, then How it works → Why us →
   Specialties → For professionals → FAQ → CTA. Tap "How it works" in the nav: smooth scroll,
   URL ends with `#how-it-works`, no reload.
2. **US2** Tap the hero's WhatsApp link and the floating button: both open
   `https://wa.me/971500000000?text=...` with the default message.
3. **US3** Sign in at `/admin` with the seed admin. Site Settings → change
   WhatsApp number to `+971 58 149 8824` → Save. Landing Page → change hero
   sub-headline, drag FAQ above Why us, add an FAQ item → Publish. Reload `/`
   within a minute: all four changes visible. Try saving `0581498824` as the
   number: validation error, old number still live. Save a hero change as
   draft only: `/` unchanged; `/next/preview?secret=…&path=/` shows it.
4. **US4** `/register` as a seeker → lands on `/account`. Log out. `/register`
   again with the same email → "already has an account". `/register` as a
   provider: persona select shows Photographer, Videographer. `/login` with
   a wrong password 5× → 6th says locked. `/account` while logged out →
   redirected to `/login?next=/account`, and back after login.
5. **US5** In `/admin`: Personas → create "Teacher" (`teacher`), Categories →
   "Mathematics", "Physics" linked to Teacher, Site Settings → add Teacher to
   active personas → Save; Landing Page → Publish. Reload `/`: the brief builder's professional-type slot,
   specialties grid and persona band include Teacher; `/register` provider
   options include Teacher. Deactivate Photographer: it disappears from the
   site; the seeded provider account still opens `/account`. Try deleting
   Videographer while a category references it: refused with a message.

6. **US6** Open `/ar`: Arabic hero "أنت تحدّد. نحن نصوّر." (seed copy), page
   is right-to-left, the WhatsApp message is Arabic, the phone number reads
   left-to-right. Use the switcher on `#how-it-works`: lands on
   `/#how-it-works` in English without reload; reload `/` → still English
   (remembered). In `/admin` switch the locale selector to Arabic, clear the
   Arabic "Why us" heading, publish: `/ar` shows the English heading in that
   spot and the admin lists the field as untranslated. In account
   preferences set the admin language to Arabic: menus are Arabic and RTL.
7. **US7** Set the device/browser to dark: open `/` — dark from the first
   frame. Toggle to light, navigate to `/login`, reload: still light. Choose
   "System": follows the device again. In `/admin` account preferences pick
   dark: the content area turns dark.

8. **US8** On `/`, the hero shows "Quick match / You brief. We shoot." and
   the sentence "I need a [photographer] for [an event] on [any date] for
   [2 hours] in [Dubai], shot by [anyone]." Tap "an event" → the 19
   occasions; switch to videographer → occasions re-filter if any are
   persona-specific. Pick a date, tap "See who's free": a confirmation
   with the brief reference and expected reply time appears and WhatsApp opens with the full sentence. In `/admin` → Briefs
   the entry lists every selection; set its status to contacted. Add
   "a graduation" to Occasions and publish; reload `/` and find it. Submit
   the same brief twice quickly: one entry. With JS disabled, submit:
   you land on the WhatsApp link.

## Done when

All automated checks above pass in CI on the feature branch, the manual
walkthrough matches, and `tasks.md` has every task ticked.
