---
name: testing-strategy
description: The testing approach for this project — how every spec acceptance scenario maps to an automated test, where unit, component, integration (Payload + Testcontainers PostgreSQL) and Playwright end-to-end tests live, how to configure Vitest projects and coverage thresholds, naming and traceability conventions, determinism rules, and what to test for forms, CMS content, access control, personas, auth, Arabic/RTL localisation and light/dark themes. Use this skill whenever you write or change a test, start implementing any task (tests come first), add a Vitest or Playwright config, debug a flaky test, are asked "how should I test this", or need to prove a user story works before ticking it in tasks.md.
---

# Testing strategy

Constitution Principle III: every acceptance scenario has at least one
automated test, written before or with the code, failing first. Coverage
gates: 80% statements and branches overall, 100% statements in
`packages/domain`. These gates run in CI and block merges.

## The pyramid and where each layer lives

| Layer        | Tool                                  | Location                                   | Proves |
|--------------|---------------------------------------|--------------------------------------------|--------|
| Unit         | Vitest (node)                         | `packages/domain/src/**/*.test.ts`, `apps/web/src/**/*.test.ts`, `apps/web/tests/unit/**/*.test.ts` | pure logic: validation, persona resolution, link builders, interpolation |
| Component    | Vitest + jsdom + Testing Library      | `apps/web/src/**/*.test.tsx`               | rendering, states, interaction, roles/names |
| Integration  | Vitest (node) + real Payload + Testcontainers PostgreSQL (migrations applied) | `apps/web/tests/integration/**/*.int.test.ts` | access rules, hooks, validation, auth, seed idempotency |
| End-to-end   | Playwright against `next start` + seeded DB | `apps/web/tests/e2e/**/*.spec.ts`     | P1 journeys, REST contract, axe, WhatsApp link |
| Performance  | Lighthouse CI                         | `lighthouserc.json`                        | budgets (Principle II) |

Pick the lowest layer that can prove the behaviour. A validation rule is a
unit test, not an e2e test; an access rule is an integration test, not a
component test.

## Traceability: tests name the requirement they prove

Spec files define user stories (`US1`…) with acceptance scenarios and
functional requirements (`FR-001`…). Put the identifier in the `describe` or
`it` title:

```ts
describe('FR-010 WhatsApp link uses the CMS number', () => {
  it('US2-S1 builds a wa.me link with digits only', () => { ... })
})
```

Before ticking a task in `tasks.md`, grep the suite for the FR/US ids the task
covers; if none exist, the task is not done. This is how `/speckit-analyze`
and reviewers verify Principle III without reading every test.

## Commands

```bash
pnpm test              # unit + component + integration (CI default)
pnpm test:unit         # vitest --project unit
pnpm test:component    # vitest --project component
pnpm test:int          # vitest --project integration
pnpm test:e2e          # playwright test (migrates + seeds; run `pnpm --filter web build` first)
pnpm test:coverage     # vitest run --coverage, enforces thresholds
pnpm test:watch        # vitest in watch mode for the current package
```

Configs: `references/vitest-setup.md` (projects, jsdom, coverage, globals
setup for the PostgreSQL container) and `references/playwright-setup.md` (web server, seeding,
fixtures, axe).

## Writing unit tests (domain logic)

- Table-driven with `it.each` for input/output functions; include boundary
  and invalid cases (empty string, whitespace, unicode, max lengths).
- One behaviour per test; the title reads as a sentence.
- No snapshots of large objects; assert the fields that matter.
- Pure functions take their inputs explicitly (no `Date.now()`, no env
  reads inside) so tests never need fakes. When time matters, inject a
  `now` parameter.

## Every UI test runs in both languages and both themes

The site is bilingual (en LTR, ar RTL) and themed (light/dark). Treat these
as axes of the same test, not separate suites:

- Component tests render through `tests/setup/render.tsx`, which wraps the
  component in the i18n provider with the requested locale and sets
  `dir`/`lang` on the container; use `renderWithLocale(ui, { locale: 'ar' })`
  for RTL checks (alignment classes, mirrored icons, bidi isolation of phone
  numbers via `dir="ltr"` spans).
- Section/persona fixtures exist in both locales (`tests/fixtures/*.ts`
  export `en` and `ar` shapes); assert Arabic text appears when rendered
  with `locale: 'ar'` and that an untranslated field falls back to English.
- `apps/web/tests/unit/messages.test.ts` asserts `messages/en.json` and
  `messages/ar.json` have identical key sets and no empty values (FR-039).
- Playwright projects: `mobile`, `desktop`, `nojs`, plus `ar-mobile`
  (`locale: 'ar'`, `extraHTTPHeaders: { 'Accept-Language': 'ar' }`) and
  `dark` (`colorScheme: 'dark'`). Smoke specs run on all; axe runs in both
  themes on every public page. The first-frame theme check takes a
  screenshot before any script runs and asserts the body background is the
  dark token.
- Lighthouse CI collects `/` and `/ar` (plus login/register in each), in
  light and dark emulation (`--emulated-form-factor` + `prefers-color-scheme`
  via `settings.emulatedUserAgent`/`extraHeaders` or a second URL variant).

## Writing component tests

- Query by role and accessible name (`getByRole('button', { name: /chat on whatsapp/i })`);
  fall back to `getByLabelText`/`getByText`; use `data-testid` last.
- Drive interaction with `@testing-library/user-event`, not `fireEvent`.
- Server actions are passed as props or mocked with `vi.fn()`; test that the
  form calls them with the submitted values and renders returned errors.
- Render section components with realistic CMS fixtures from
  `tests/fixtures/` (the same shapes the seed produces). Test the empty state
  (no items) and the persona-interpolated copy.
- Do not assert Tailwind class names; assert visible outcomes (text, roles,
  `aria-*`, disabled state).

## Writing integration tests

See the payload-cms skill's `references/testing-payload.md` for the harness.
Rules: `overrideAccess: false` whenever testing as a user; three viewpoints
(anonymous, member, admin) for every access rule; `context.disableRevalidate`
on writes; reset the database in `beforeEach`; dynamic-import the Payload
config after env is set.

## Writing end-to-end tests

- One spec per user journey, named after the story (`us1-landing.spec.ts`).
- Start from seeded data; never depend on state left by another spec.
- Use page objects only when a page is used by more than one spec.
- Run `@axe-core/playwright` on each public page in the smoke suite.
- REST contract checks (`request.post('/api/users/login')`) live here too,
  since they need the running app.
- CI runs the smoke tag on every PR (landing, WhatsApp, brief builder,
  register/login, i18n, theme);
  the full suite runs nightly or on demand.

## Determinism and flakiness

- No real network, no real clock: `vi.useFakeTimers()` when time matters;
  fixed seeds for any randomness.
- Playwright waits on assertions (`expect(locator).toBeVisible()`), never
  `page.waitForTimeout`.
- A flaky test is a bug: fix the root cause or delete the test. Retries hide
  defects and are not enabled in CI.

## Coverage is a floor, not the goal

Coverage tells you what is untested; it does not tell you the tests are
good. Review tests for: the failure case, the empty case, the boundary, and
the permission-denied path. A suite that only exercises the happy path can
reach 80% and still prove nothing about the spec.

## Reference files

- `references/vitest-setup.md` — Vitest workspace with unit/component/integration projects and coverage thresholds.
- `references/playwright-setup.md` — Playwright config, seeding, fixtures, axe and smoke tags.
