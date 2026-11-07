import { sql } from '@payloadcms/db-postgres'
import type { Payload } from 'payload'

let instance: Payload | undefined

/** The real Payload instance on the test database. Config is imported after env is set. */
export async function getTestPayload(): Promise<Payload> {
  if (!instance) {
    const { getPayload } = await import('payload')
    const { default: config } = await import('@payload-config')
    instance = await getPayload({ config })
  }
  return instance
}

/** Empties every table except the migrations ledger. */
export async function resetDatabase(): Promise<void> {
  const payload = await getTestPayload()
  const db = payload.db as unknown as { drizzle: { execute: (q: unknown) => Promise<{ rows: { tablename: string }[] }> } }
  const { rows } = await db.drizzle.execute(
    sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'payload_migrations'`,
  )
  if (rows.length) {
    const names = rows.map((r) => `"${r.tablename}"`).join(', ')
    await db.drizzle.execute(sql.raw(`TRUNCATE TABLE ${names} RESTART IDENTITY CASCADE`))
  }
}

export const quiet = { disableRevalidate: true }

let counter = 0
export async function createUser(
  roles: ('admin' | 'editor' | 'member')[] = ['member'],
  extra: Record<string, unknown> = {},
) {
  const payload = await getTestPayload()
  counter += 1
  return payload.create({
    collection: 'users',
    data: { name: `Test ${counter}`, email: `user${counter}-${Date.now()}@test.local`, password: 'password-123', roles, accountType: 'seeker', ...extra },
    context: quiet,
  })
}
