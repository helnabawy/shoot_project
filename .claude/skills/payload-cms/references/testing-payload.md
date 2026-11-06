# Integration testing Payload with a throwaway PostgreSQL

Integration tests boot the real Payload instance against a disposable
PostgreSQL container started by Testcontainers, with the committed
migrations applied, so access rules, hooks, validation, constraints and
auth behave exactly as in production. Never mock the database layer
(constitution Principle III). Docker must be running locally and in CI.

## Layout

```
apps/web/
├── vitest.config.ts              # three projects: unit (node), component (jsdom), integration (node)
└── tests/
    ├── integration/
    │   ├── setup/global-setup.ts # starts PostgreSqlContainer, exports DATABASE_URI, runs migrations
    │   ├── setup/payload.ts      # getTestPayload(), resetDatabase(), asUser()
    │   ├── auth.int.test.ts
    │   ├── personas.int.test.ts
    │   └── site-settings.int.test.ts
    └── e2e/                      # Playwright, see testing-strategy skill
```

## Global setup

```ts
// tests/integration/setup/global-setup.ts
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { execSync } from 'node:child_process'
let container: StartedPostgreSqlContainer
export async function setup() {
  container = await new PostgreSqlContainer('postgres:17').start()
  process.env.DATABASE_URI = container.getConnectionUri()
  process.env.PAYLOAD_SECRET = 'test-secret-test-secret-test-secret'
  process.env.PAYLOAD_DISABLE_ADMIN = 'true'
  execSync('pnpm payload migrate', { stdio: 'inherit', env: process.env })  // proves the committed migrations
}
export async function teardown() { await container?.stop() }
```

Running the committed migrations (instead of relying on dev-mode schema
push) makes every test run a migration test too: a schema change without
its migration fails here before it fails in production.

## Test helper

```ts
// tests/integration/setup/payload.ts
import type { Payload } from 'payload'
let instance: Payload | undefined
export async function getTestPayload() {
  if (!instance) {
    const { getPayload } = await import('payload')
    const { default: config } = await import('@payload-config')   // dynamic: env must be set first
    instance = await getPayload({ config })
  }
  return instance
}
export async function resetDatabase() {
  const payload = await getTestPayload()
  for (const { slug } of payload.config.collections) {
    if (slug.startsWith('payload-')) continue   // keep Payload's internal migrations/preferences tables
    await payload.delete({ collection: slug, where: {} , context: { disableRevalidate: true } })
  }
}
```

Import the config dynamically; a static import evaluates `payload.config.ts`
before the global setup has set the environment variables.

## Example: access rule from three viewpoints

```ts
describe('personas access', () => {
  beforeEach(resetDatabase)
  it('FR-027: anyone can read active personas', async () => {
    const payload = await getTestPayload()
    await payload.create({ collection: 'personas', data: photographer, context: { disableRevalidate: true } })
    const res = await payload.find({ collection: 'personas', overrideAccess: false })  // anonymous
    expect(res.docs).toHaveLength(1)
  })
  it('FR-016: members cannot create personas', async () => {
    const payload = await getTestPayload()
    const member = await createMember(payload)
    await expect(payload.create({ collection: 'personas', data: teacher, overrideAccess: false, user: member }))
      .rejects.toThrow(/not allowed/i)
  })
  it('FR-016: admins can create personas', async () => { /* same with admin user */ })
})
```

- `overrideAccess: false` is what makes the Local API enforce access; without
  it every test passes vacuously.
- Pass `context: { disableRevalidate: true }` on writes so hooks do not call
  Next.js revalidation outside a request scope.
- Name tests after the requirement they prove (`FR-027`) so the spec can be
  traced to the suite.

## Testing localisation

```ts
it('FR-038: Arabic read falls back to English for an untranslated field', async () => {
  const payload = await getTestPayload()
  await payload.updateGlobal({ slug: 'landing-page', locale: 'en', data: { hero: { headline: 'You brief. We shoot.' } }, context: { disableRevalidate: true } })
  const ar = await payload.findGlobal({ slug: 'landing-page', locale: 'ar', fallbackLocale: 'en' })
  expect(ar.hero.headline).toBe('You brief. We shoot.')
  const all = await payload.findGlobal({ slug: 'landing-page', locale: 'all' })
  expect(findUntranslatedFields(all, 'ar')).toContain('hero.headline')
})
```

Also assert that writing with `locale: 'ar'` does not change the `en` value,
and that shared fields (`slug`, `order`, `anchor`, uploads) are identical
under both locales.

## Testing hooks

Spy on the revalidation module (`vi.mock('@/shared/payload/hooks/revalidate')`
or spy on `next/cache`) and assert the right tag is revalidated once per
change. Also assert it is **not** called when `disableRevalidate` is set.

## Testing REST endpoints

For contract-level checks (status codes, cookie set on login) start the Next
app in the e2e suite, or call the Payload REST handlers through the Local API
equivalent. Keep REST contract tests in Playwright's `request` fixture against
the running app; Vitest integration tests stay at the Local API level, which
is faster and sufficient for access/validation/hook behaviour.
