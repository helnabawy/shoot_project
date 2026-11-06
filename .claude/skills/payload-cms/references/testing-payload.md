# Integration testing Payload with an in-memory MongoDB

Integration tests boot the real Payload instance against a throwaway MongoDB
started by `mongodb-memory-server`, so access rules, hooks, validation and auth
behave exactly as in production. Never mock the database layer (constitution
Principle III).

## Layout

```
apps/web/
├── vitest.config.ts              # two projects: unit+component (jsdom) and integration (node)
└── tests/
    ├── integration/
    │   ├── setup/global-setup.ts # starts MongoMemoryReplSet, exports DATABASE_URI
    │   ├── setup/payload.ts      # getTestPayload(), resetDatabase(), asUser()
    │   ├── auth.int.test.ts
    │   ├── personas.int.test.ts
    │   └── site-settings.int.test.ts
    └── e2e/                      # Playwright, see testing-strategy skill
```

## Global setup

```ts
// tests/integration/setup/global-setup.ts
import { MongoMemoryReplSet } from 'mongodb-memory-server'
let server: MongoMemoryReplSet
export async function setup() {
  server = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  process.env.DATABASE_URI = server.getUri()
  process.env.PAYLOAD_SECRET = 'test-secret'
  process.env.PAYLOAD_DISABLE_ADMIN = 'true'
}
export async function teardown() { await server?.stop() }
```

A replica set (not a standalone) is used because Payload's MongoDB adapter
can use transactions; a standalone server makes those code paths silently
differ from production. Payload's own test suite runs on
`mongodb-memory-server`, so the adapter is known to work with it. (Payload's
website *template* instead points Vitest at the `.env` database; we prefer
the in-memory server so `pnpm test` needs no running service.)

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
  for (const { slug } of payload.config.collections)
    await payload.delete({ collection: slug, where: {} , context: { disableRevalidate: true } })
}
```

Import the config dynamically; a static import evaluates `payload.config.ts`
before the global setup has set the environment variables.

## Example: access rule from three viewpoints

```ts
describe('personas access', () => {
  beforeEach(resetDatabase)
  it('FR-010: anyone can read active personas', async () => {
    const payload = await getTestPayload()
    await payload.create({ collection: 'personas', data: photographer, context: { disableRevalidate: true } })
    const res = await payload.find({ collection: 'personas', overrideAccess: false })  // anonymous
    expect(res.docs).toHaveLength(1)
  })
  it('FR-011: members cannot create personas', async () => {
    const payload = await getTestPayload()
    const member = await createMember(payload)
    await expect(payload.create({ collection: 'personas', data: teacher, overrideAccess: false, user: member }))
      .rejects.toThrow(/not allowed/i)
  })
  it('FR-011: admins can create personas', async () => { /* same with admin user */ })
})
```

- `overrideAccess: false` is what makes the Local API enforce access; without
  it every test passes vacuously.
- Pass `context: { disableRevalidate: true }` on writes so hooks do not call
  Next.js revalidation outside a request scope.
- Name tests after the requirement they prove (`FR-010`) so the spec can be
  traced to the suite.

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
