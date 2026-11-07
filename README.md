# Shoot Project

A fast, responsive marketing site with member accounts and a CMS, inspired by
[shootix.ae](https://shootix.ae). Hero: **"You brief. We shoot."**

- Visitors learn the offer on a single scrolling page and contact the business on WhatsApp.
- Visitors register and log in as a *seeker* (needs a professional) or a *provider* (is one).
- The owner edits every landing-page section and the WhatsApp number in the CMS.
- Visitors build a brief in one sentence ("I need a photographer for an event on … for 2 hours in Dubai, shot by anyone") whose words all come from the CMS; the brief is recorded and handed to WhatsApp.
- The target audience (personas and categories) is CMS data: switching from
  photographers to teachers needs no code change.
- English and Arabic (RTL), light and dark, on the site and in the CMS.

## Status

Feature 001 (landing page, brief builder, accounts, CMS, personas, Arabic/RTL,
light/dark) is implemented in `apps/web` and `packages/domain`. Not yet done:
the usability sessions with real participants (T106) and a first deploy.

| Artifact | Path |
|----------|------|
| Constitution | `.specify/memory/constitution.md` |
| Feature spec | `specs/001-landing-auth-cms/spec.md` |
| Plan + design | `specs/001-landing-auth-cms/{plan,research,data-model,quickstart}.md`, `contracts/` |
| Tasks | `specs/001-landing-auth-cms/tasks.md` |
| Roadmap + later features | `specs/ROADMAP.md`, `specs/002…005-*/spec.md` |
| Project skills | `.claude/skills/{payload-cms,nextjs-frontend,testing-strategy,persona-extensibility,ui-design}` |
| Product + design authority | `PRODUCT.md`, `DESIGN.md`, `.impeccable/surfaces/`, `.impeccable/mocks/decision/brief-bar.html` |

## Stack

Next.js 16 (App Router, React 19) + Payload CMS 3.93 + PostgreSQL 17 (committed
migrations) in one deployable app,
TypeScript everywhere, pnpm workspaces (`apps/web`, `packages/domain`,
`packages/config`), Tailwind CSS, Vitest, Playwright, Lighthouse CI.

## Getting started

```bash
nvm use                                   # Node 24
pnpm install
cp apps/web/.env.example apps/web/.env    # then fill the secrets
docker compose up -d postgres
pnpm db:migrate
pnpm seed                                 # default bilingual content + first admin
pnpm dev                                  # http://localhost:3000, admin at /admin
```

## Checks

```bash
pnpm typecheck && pnpm lint               # lint includes the logical-CSS (RTL) check
pnpm test                                 # domain + unit + component + integration (Docker needed)
pnpm test:coverage                        # domain 100 %, app ≥ 80 %
pnpm build && pnpm test:e2e               # Playwright: mobile, desktop, no-JS, Arabic, dark
npx @lhci/cli autorun --config=lighthouserc.json
```

## Production

`apps/web/Dockerfile` builds the standalone server; `docker-compose.prod.yml`
runs PostgreSQL, a one-off `payload migrate`, then two stateless web
instances. Set the S3 variables so media is shared between instances, and
call `POST /api/cron/cleanup` with `Authorization: Bearer $CRON_SECRET` daily.

See `CLAUDE.md` for the Spec Kit workflow and conventions.
