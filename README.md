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

Spec-driven setup complete; implementation not started.

| Artifact | Path |
|----------|------|
| Constitution | `.specify/memory/constitution.md` |
| Feature spec | `specs/001-landing-auth-cms/spec.md` |
| Plan + design | `specs/001-landing-auth-cms/{plan,research,data-model,quickstart}.md`, `contracts/` |
| Tasks | `specs/001-landing-auth-cms/tasks.md` |
| Roadmap + later features | `specs/ROADMAP.md`, `specs/002…005-*/spec.md` |
| Project skills | `.claude/skills/{payload-cms,nextjs-frontend,testing-strategy,persona-extensibility,ui-design}` |
| Product + design authority | `PRODUCT.md`, `.impeccable/surfaces/`, `.impeccable/mocks/decision/wayfinding.html` |

## Stack

Next.js 16 (App Router, React 19) + Payload CMS 3.93 + PostgreSQL 17 (committed
migrations) in one deployable app,
TypeScript everywhere, pnpm workspaces (`apps/web`, `packages/domain`,
`packages/config`), Tailwind CSS, Vitest, Playwright, Lighthouse CI.

## Getting started (after implementation Phase 1)

```bash
nvm use            # Node 24
pnpm install
cp apps/web/.env.example apps/web/.env
docker compose up -d postgres
pnpm --filter web payload migrate
pnpm --filter web seed
pnpm --filter web dev
```

See `CLAUDE.md` for the Spec Kit workflow and conventions.
