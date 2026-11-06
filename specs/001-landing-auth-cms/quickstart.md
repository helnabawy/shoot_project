# Quickstart & Validation: Landing Page, Member Accounts and CMS-Managed Content

**Plan**: [plan.md](plan.md) | **Contracts**: [contracts/](contracts/)

## Prerequisites

- Node 24 LTS (`nvm use` reads `.nvmrc`), pnpm 10.x, Docker (for MongoDB).
- Copy `apps/web/.env.example` to `apps/web/.env` and set `PAYLOAD_SECRET`,
  `PREVIEW_SECRET`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.

## Setup and run

```bash
pnpm install
docker compose up -d mongo
pnpm --filter web seed             # admin + personas + categories + settings + landing page
pnpm --filter web dev              # http://localhost:3000 ; admin at /admin
```

## Automated validation (what CI runs)

```bash
pnpm typecheck
pnpm lint
pnpm test:coverage                 # unit + component + integration, thresholds enforced
pnpm --filter web build
pnpm test:e2e -- --grep @smoke     # Playwright, seeded Docker Mongo, mobile + desktop
npx @lhci/cli autorun              # budgets in lighthouserc.json
```

Expected: all green; coverage ≥ 80% (app) and 100% statements (domain);
Lighthouse performance ≥ 90, accessibility ≥ 95 on `/`, `/login`, `/register`.

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
| Edge: JS disabled forms/links | e2e (`javaScriptEnabled: false` project) | `us4-auth.spec.ts`, `us2-whatsapp.spec.ts` |
| FR-033 stateless / two instances | e2e (optional job) | `docker compose --scale web=2` + login/session check |

## Manual walkthrough (after `pnpm --filter web dev`)

1. **US1** Open `/` on a phone-width viewport: hero "You brief. We shoot.",
   trust chips, two CTAs, then How it works → Specialties → Why us → For
   professionals → FAQ → CTA. Tap "How it works" in the nav: smooth scroll,
   URL ends with `#how-it-works`, no reload.
2. **US2** Tap the hero WhatsApp CTA and the floating button: both open
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
   active personas → Save; Landing Page → Publish. Reload `/`: hero selector,
   specialties grid and persona band include Teacher; `/register` provider
   options include Teacher. Deactivate Photographer: it disappears from the
   site; the seeded provider account still opens `/account`. Try deleting
   Videographer while a category references it: refused with a message.

## Done when

All automated checks above pass in CI on the feature branch, the manual
walkthrough matches, and `tasks.md` has every task ticked.
