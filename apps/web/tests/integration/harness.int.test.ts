import { describe, expect, it } from 'vitest'
import { getTestPayload } from './setup/payload'

describe('integration harness', () => {
  it('boots Payload on the migrated test database with every collection and global', async () => {
    const payload = await getTestPayload()
    expect(payload.config.collections.map((c) => c.slug)).toEqual(
      expect.arrayContaining(['users', 'personas', 'categories', 'option-sets', 'briefs', 'media', 'rate-limits']),
    )
    expect(payload.config.globals.map((g) => g.slug)).toEqual(['landing-page', 'site-settings'])
    await expect(payload.count({ collection: 'users' })).resolves.toMatchObject({ totalDocs: expect.any(Number) })
  })
})
