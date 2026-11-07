# apps/web

The Shoot Project website and CMS in one Next.js 16 app: the public site under
`src/app/(site)/[locale]` (English at `/`, Arabic at `/ar`) and Payload CMS
under `src/app/(payload)` (admin at `/admin`, REST at `/api`).

- What and why: `specs/001-landing-auth-cms/spec.md`
- How: `specs/001-landing-auth-cms/plan.md`, `data-model.md`, `contracts/`
- Look and feel: `DESIGN.md` and `.impeccable/surfaces/` at the repository root

## Layout

| Path | Holds |
|------|-------|
| `src/modules/<feature>/` | collections, globals, blocks, components, queries, actions and tests per feature (auth, brief, contact, landing, media, personas, site-settings, admin) |
| `src/shared/` | the bar component kit (`ui/bar`), i18n and theme helpers, Payload access/hooks/fields, the seed |
| `src/migrations/` | committed PostgreSQL migrations; never edit a migration that has shipped |
| `messages/{en,ar}.json` | static UI strings; CMS copy lives in Payload |
| `tests/` | integration (Testcontainers PostgreSQL), e2e (Playwright), fixtures |

## Scripts

```bash
pnpm dev | build | start
pnpm payload migrate | migrate:create <name> | generate:types | generate:importmap
pnpm seed
pnpm test | test:unit | test:component | test:int | test:coverage | test:e2e
```

Environment variables are documented in `.env.example` and validated at
startup by `src/shared/lib/env.ts`.
