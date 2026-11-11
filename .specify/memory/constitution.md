<!--
Sync Impact Report (amendment 2026-11-10)
- Version: 1.3.0 -> 1.4.0 (MINOR: materially expanded guidance; no principle removed or redefined)
- Modified principles:
  - III. Test-First for Every Use Case: adds the mobile test pyramid (unit, cubit, widget) and its
    coverage gate
  - V. Modular Monolith, Monorepo-Ready: names apps/mobile and its layout
  - VI. Responsive, Accessible, Bilingual and Themed by Default: adds mobile verification sizes and
    checks
- Added sections: "Mobile app (apps/mobile)" bullet group in Technology Stack & Constraints; mobile
  checks in Development Workflow & Quality Gates
- Removed sections: none
- Compliance (Principle III amended): the existing mobile code already follows these rules (see
  apps/mobile/README.md); its tests are unit, cubit and widget tests. Known gap: no CI job runs
  flutter analyze / flutter test yet.
- Dependent files: CLAUDE.md stack section to mention apps/mobile (runtime guidance must stay
  consistent); templates read the constitution at runtime and need no change.
- Deferred TODOs: add the CI job for the mobile checks.
-->
# Shoot Project Constitution

## Core Principles

### I. Spec-Driven Development

Every change to the product begins as a specification under `specs/` and flows
through the Spec Kit workflow: constitution → specify → (clarify) → plan →
tasks → implement. No application code is written for a feature that has no
spec, and no task is executed that is not listed in that feature's `tasks.md`.
Specs describe WHAT users need and WHY in technology-agnostic language; plans
describe HOW. When implementation reveals that a spec was wrong, the spec is
amended first and the code follows.

Rationale: the product is expected to grow in audiences, features and team
size. A written spec is the only durable contract between those who decide
and those who build, and it is what makes AI-assisted implementation
reviewable.

### II. Performance Budgets Are Requirements

The public website MUST meet these budgets on a mid-range mobile device over a
simulated 4G connection, measured by Lighthouse in CI on every pull request:

- Largest Contentful Paint (LCP) ≤ 2.5 s; Cumulative Layout Shift (CLS) ≤ 0.1;
  Interaction to Next Paint (INP) ≤ 200 ms; Time to First Byte (TTFB) ≤ 800 ms.
- Lighthouse Performance score ≥ 90 for the landing page and auth pages.
- Initial JavaScript shipped to the landing page ≤ 200 KB compressed; a task
  that exceeds the budget MUST remove or defer code before it merges.
- All above-the-fold imagery uses responsive, modern formats with explicit
  dimensions; fonts are self-hosted and preloaded; no render-blocking
  third-party scripts on first paint.

A pull request that regresses a budget is blocked until the regression is
fixed or the budget is formally amended here.

Rationale: speed is a stated product goal and a direct driver of conversion on
a marketing site; budgets that are not enforced in CI do not survive.

### III. Test-First for Every Use Case (NON-NEGOTIABLE)

Every acceptance scenario in a feature spec MUST be covered by at least one
automated test, and the test MUST be written before or alongside the code it
verifies, failing first. The test pyramid is:

- Unit tests for all framework-free domain logic (validation, persona
  resolution, link builders, formatting). Target: 100% of exported functions.
- Integration tests for every API endpoint, CMS collection/global access rule,
  hook and auth flow, executed against a real, containerised (Testcontainers)
  PostgreSQL instance with the committed migrations applied, never against mocks of the database.
- Component tests for every interactive UI component (forms, navigation,
  CMS-driven sections) covering rendering, states and user interaction.
- End-to-end tests for each user journey in the spec (visit the landing
  page, build and submit a brief, contact via WhatsApp, register, log in,
  edit content in the CMS and see it live).

Minimum coverage gate: 80% statements and branches repository-wide; the domain
package gates at 100% statements.

The mobile app (`apps/mobile`) uses the same rule with its own pyramid: unit
tests for domain logic and use cases, cubit tests (`bloc_test`) for every
state transition, and widget tests for every screen and interactive widget in
English and Arabic. Testcontainers, Playwright and Lighthouse do not apply to
it. Its gate is 80% line coverage of the code a feature adds or changes,
measured with `flutter test --coverage`. Scenario ids in Dart test names
(`test`, `testWidgets`, `group`, `blocTest`) are enforced by the same
`check:scenarios` script as the web tests. Tests are deterministic: no reliance on wall
clock, network or ordering. Flaky tests are fixed or deleted, never retried
into green.

Rationale: the user explicitly requires that unit tests handle all use cases;
tests are also what let an AI agent or a new contributor change the system
safely.

### IV. Content and Configuration Live in the CMS

Marketing copy, section ordering, imagery, contact details (including the
WhatsApp number) and the list of target audiences (personas) and their
categories are DATA managed in the CMS, never constants in application code.
Concretely:

- Adding, renaming, re-ordering or disabling a persona (e.g. "Photographer",
  later "Teacher") or a category is a CMS edit that requires no deployment.
- Every landing-page section reads its content from a CMS global or
  collection; code only defines the shape (schema) and the rendering.
- Code may ship seed data for first run, but seed data is not a fallback path
  that silently hides a missing CMS record; missing required content fails
  loudly in development and renders a safe empty state in production.
- Published CMS changes are visible on the site within 60 seconds without a
  rebuild.

Rationale: the product owner wants to edit the landing page and the WhatsApp
number without engineers, and wants to pivot the target audience later. Both
are only possible if content and audience definitions are data.

### V. Modular Monolith, Monorepo-Ready

The system ships as ONE deployable web application (site + CMS admin + API)
organised as a pnpm workspace, so that it can be split later without a
rewrite:

- `packages/domain` holds framework-free TypeScript (types, schemas, pure
  functions). It MUST NOT import from Next.js, React or Payload.
- `apps/web` holds the Next.js + Payload application, organised by feature
  module (`modules/<feature>/`), each with its own collections, components,
  services and tests. Modules communicate through explicit exports, never by
  reaching into another module's internals.
- A new app (mobile, separate API, second site) is added as a new workspace
  under `apps/` that depends on `packages/*`; shared UI is extracted to
  `packages/ui` only when a second consumer exists (YAGNI).
- `apps/mobile` is the Flutter app for iOS and Android. It sits outside the
  pnpm workspace (its own toolchain), follows clean architecture by feature
  (`features/<feature>/{domain,data,presentation}` with shared `core/`), and
  reads product data only through the web app's REST API.
- Horizontal scaling MUST be possible: the web app is stateless (sessions are
  cookie/JWT based, uploads go to object storage in production, no in-process
  caches that assume a single instance).

Rationale: one deployable keeps the MVP simple and cheap; explicit boundaries
keep the option to scale the team and the architecture open.

### VI. Responsive, Accessible, Bilingual and Themed by Default

Every screen is designed mobile-first and verified at 360 px, 768 px, 1024 px
and 1440 px widths, **in both English (LTR) and Arabic (RTL), and in both the
light and dark theme**, before a task is complete. The site meets WCAG 2.1
AA: semantic HTML, keyboard operability, visible focus, colour contrast
≥ 4.5:1 in each theme, labelled form controls, and `prefers-reduced-motion`
respected. Touch targets are ≥ 44 px. Layout uses logical (start/end)
properties so RTL needs no per-component overrides; the theme is applied
before first paint so there is never a flash of the wrong colours. These are
acceptance criteria, not polish.

Mobile app screens meet the same bar: verified on a 360 px-wide phone and,
for every form factor the app targets (today iPad), at 768 px and 1024 px; in
English and Arabic, light and dark; at the largest system text size; with
VoiceOver and TalkBack; using directional layout APIs only (start/end, never
left/right); and with the saved theme applied on the first frame.

Rationale: most visitors to a creative-services site in the UAE arrive on a
phone, many read Arabic, and many devices are in dark mode; accessibility and
localisation failures are both a legal risk and a conversion loss.

### VII. Secure by Default

- Every CMS collection and global declares explicit `access` rules; the
  default is deny. Public reads are opt-in per collection.
- Authentication uses the CMS's built-in auth with HTTP-only, secure,
  same-site cookies; passwords are never logged or returned; login attempts
  are rate-limited and accounts lock after repeated failures.
- Secrets and environment-specific values come from environment variables
  validated at startup; none are committed.
- User input is validated at the boundary (schema validation) and escaped on
  output; no raw HTML from the CMS is rendered without sanitisation.
- Personally identifiable information is never written to logs.

Rationale: the site stores member accounts and exposes an admin panel; a
breach of either is an existential risk for a small business.

### VIII. Simplicity and Justified Complexity

Start with the simplest design that satisfies the spec. Any new service,
package, abstraction layer, state-management library or infrastructure
component MUST be justified in the feature plan's Complexity Tracking table
with the concrete problem it solves and the simpler alternative rejected.
Prefer platform and framework primitives over third-party packages.

Rationale: the fastest site and the easiest codebase to scale is the one with
the least in it.

### IX. Designed, Not Generated

The client flow is as short and plain as it can be, and the interface looks
deliberately designed for this product, never like a template or an
AI-generated site.

- **Simple flow**: one primary action per screen; the brief needs no
  account; every slot has a sensible default; no step asks for information a
  later step could ask for; plain-language labels and errors; the client
  always sees what happens next and a way to reach a person (WhatsApp).
- **Design authority**: `PRODUCT.md` (product truth), the surface briefs in
  `.impeccable/surfaces/` (direction contracts) and, once the first build is
  reviewed, `DESIGN.md` + `.impeccable/design.json` (tokens) govern every UI
  task. The chosen world for the public site is "The Brief Bar" (one
  Spotlight-style panel: the brief as a search field, options as grouped
  result rows, the Top Hit as the one action). New UI inherits it; replacing it is a design decision
  made with the impeccable workflow, never drift.
- **Craft gates**: every UI task is built with the `impeccable` skill, reads
  its craft floor before editing, runs the impeccable detector on changed
  UI, and a surface is done only after the impeccable finish review returns
  `ship` and the documenter has recorded DESIGN.md.
- **Banned tells**: stock gradients, glassmorphism, generic icon tiles,
  centred headline over a row of equal cards, invented testimonials, logos,
  counts or ratings, and the default font list impeccable flags (unless a
  surface brief names a reason).

Rationale: the owner asked for a user-friendly, modern site that does not
look AI-generated; without an explicit authority and gate, every new screen
regresses to the category default.

## Technology Stack & Constraints

The stack below is binding for all features unless amended here. Plans MUST
NOT introduce alternatives without a constitution amendment.

- **Language**: TypeScript in `strict` mode everywhere (app, packages, tests,
  scripts). No `any` without an inline justification comment.
- **Runtime**: Node.js 24 LTS, pinned via `.nvmrc` and `engines` (Payload 3
  requires `^22.23.4 || >=24.22.1`; odd-numbered releases such as 25 are not
  LTS and are not used); pnpm as the only package manager (lockfile
  committed). Versions of `payload`, `@payloadcms/*`, `next`, `react` and
  `react-dom` are pinned exactly (no `^`) and kept identical across the
  workspace.
- **Frontend**: React with Next.js App Router. The public site is
  server-rendered (static where possible, revalidated on CMS publish) and
  navigates client-side without full page reloads, giving single-page-app
  behaviour with first-paint performance. Styling with Tailwind CSS; design
  tokens defined once in the Tailwind theme.
- **Backend + CMS**: Payload CMS 3.x running inside the same Next.js app
  (admin panel at `/admin`, REST API at `/api/*`, Local API for server-side
  reads). PostgreSQL via Payload's Postgres adapter (`@payloadcms/db-postgres`),
  with versioned migrations committed to the repository and applied on deploy. Media stored on local disk in
  development and object storage (S3-compatible) in production.
- **Testing**: Vitest for unit, component (React Testing Library) and
  integration tests; Playwright for end-to-end; Lighthouse CI for performance
  budgets. Integration tests run against an ephemeral PostgreSQL container.
- **Tooling**: ESLint + Prettier with a shared config package; Conventional
  Commits; GitHub Actions for CI.
- **Mobile app (`apps/mobile`)**: Flutter on the stable channel with the SDK
  version pinned in its README, Dart with sound null safety and the strict
  `analysis_options.yaml`; targets iOS (iPhone and iPad) and Android. Packages
  are pinned exactly (no `^`); no code generation unless a plan justifies it
  in Complexity Tracking. State with cubits (`flutter_bloc`), dependency
  injection with `get_it`, tests with `flutter_test`, `bloc_test` and
  `mocktail`. Interface strings live in ARB files (`en`, `ar`); product copy is
  CMS data read through the API, never a Dart constant or an ARB entry.
- **Browser support**: last 2 versions of evergreen browsers plus iOS Safari
  ≥ 16; no IE.
- **Internationalisation**: bilingual from the first release — English
  (default, LTR) and Arabic (RTL) — for the public site and the CMS admin
  interface. Every user-visible text field in the CMS is localised with
  English as the fallback; identifiers, numbers, flags and ordering are shared
  across languages. Static interface strings live in versioned translation
  files, one per language. Adding a third language is configuration plus
  translations, never a code change.
- **Theming**: light and dark themes for the public site and the CMS admin,
  driven by design tokens with one value per theme; the default follows the
  device setting, a visible toggle overrides it, and the choice persists.

## Development Workflow & Quality Gates

- One feature branch per spec, named `NNN-short-name` to match `specs/`.
- Definition of Done for a task: code + tests written, `pnpm typecheck`,
  `pnpm lint`, `pnpm test` (unit + integration + component) pass locally;
  responsive checks done per Principle VI; task ticked in `tasks.md`. For
  mobile tasks the checks are `dart format`, `flutter analyze` (no issues)
  and `flutter test` in `apps/mobile`, plus `pnpm check:scenarios`.
- Pull request gates (all required to merge): typecheck, lint, unit +
  integration + component tests with coverage thresholds, Playwright smoke
  suite, Lighthouse CI budgets (Principle II), no high/critical `pnpm audit`
  findings.
- Every PR description references the spec and the task IDs it completes.
- Code review checks constitution compliance explicitly; a reviewer may block
  on any principle and must cite it.
- Seed/reference data (default personas, categories, landing copy, site
  settings) lives in versioned seed scripts so any environment can be
  bootstrapped with one command.

## Governance

This constitution supersedes all other conventions in the repository. Where a
skill, template or tool default conflicts with it, the constitution wins and
the conflicting artifact is updated.

- **Amendments**: propose via a pull request that edits this file, states the
  motivation, and updates any dependent templates, skills or CI gates in the
  same change. Amendments to Principles II, III or VII require an explicit
  note on how existing code will be brought into compliance.
- **Versioning**: semantic versioning. MAJOR for removing or redefining a
  principle; MINOR for adding a principle or materially expanding guidance;
  PATCH for clarifications and wording.
- **Compliance review**: `/speckit-plan` evaluates every plan against the
  Constitution Check gates derived from Principles I–IX; `/speckit-analyze`
  is run before `/speckit-implement` on every feature. Violations are either
  fixed or justified in the plan's Complexity Tracking table.
- **Runtime guidance**: `CLAUDE.md` at the repository root and the skills under
  `.claude/skills/` carry day-to-day development guidance and MUST stay
  consistent with this document.

**Version**: 1.4.0 | **Ratified**: 2026-11-06 | **Last Amended**: 2026-11-10
