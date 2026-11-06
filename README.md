# Shoot Project

A fast, responsive marketing site with member accounts and a CMS, inspired by
[shootix.ae](https://shootix.ae). Hero: **"You brief. We shoot."**

- Visitors learn the offer on a single scrolling page and contact the business on WhatsApp.
- Visitors register and log in as a *seeker* (needs a professional) or a *provider* (is one).
- The owner edits every landing-page section and the WhatsApp number in the CMS.
- The target audience (personas and categories) is CMS data: switching from
  photographers to teachers needs no code change.

## Status

Spec-driven setup complete; implementation not started.

| Artifact | Path |
|----------|------|
| Constitution | `.specify/memory/constitution.md` |
| Feature spec | `specs/001-landing-auth-cms/spec.md` |
| Plan + design | `specs/001-landing-auth-cms/{plan,research,data-model,quickstart}.md`, `contracts/` |
| Tasks | `specs/001-landing-auth-cms/tasks.md` |
| Project skills | `.claude/skills/{payload-cms,nextjs-frontend,testing-strategy,persona-extensibility}` |

## Stack

Next.js (App Router, React) + Payload CMS 3 + MongoDB in one deployable app,
TypeScript everywhere, pnpm workspaces (`apps/web`, `packages/domain`,
`packages/config`), Tailwind CSS, Vitest, Playwright, Lighthouse CI.

## Getting started (after implementation Phase 1)

```bash
nvm use            # Node 24
pnpm install
cp apps/web/.env.example apps/web/.env
docker compose up -d mongo
pnpm --filter web seed
pnpm --filter web dev
```

See `CLAUDE.md` for the Spec Kit workflow and conventions.
