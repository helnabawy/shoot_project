import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { creatorBookingsV1, myProfileV1, profilePatchV1, sampleAddV1, uploadV1 } from './creator-account'
import { ENDPOINTS } from './endpoints'

const read = (name: string): Record<string, unknown> => JSON.parse(readFileSync(join(import.meta.dirname, 'examples', `${name}.json`), 'utf8'))

describe('MW-CONTRACT the creator account shapes', () => {
  it('MW-US1-S1 a draft profile with seven steps parses; fewer steps do not', () => {
    const draft = read('creator-profile-draft')
    expect(myProfileV1.safeParse(draft).success).toBe(true)
    expect(myProfileV1.safeParse({ ...draft, steps: (draft.steps as unknown[]).slice(1) }).success).toBe(false)
  })

  it('MW-US1-S4 a patch takes any subset of fields, and refuses an unknown gender', () => {
    expect(profilePatchV1.safeParse({}).success).toBe(true)
    expect(profilePatchV1.safeParse({ gender: 'man', languages: ['en'] }).success).toBe(true)
    expect(profilePatchV1.safeParse({ gender: 'other' }).success).toBe(false)
  })

  it('MW-US1-S8 an upload is base64 text no larger than 5 MB plus encoding', () => {
    expect(uploadV1.safeParse({ contentType: 'application/pdf', filename: 'id.pdf', data: 'AAAA' }).success).toBe(true)
    expect(uploadV1.safeParse({ contentType: 'application/pdf', filename: 'id.pdf', data: 'A'.repeat(8_000_000) }).success).toBe(false)
    expect(sampleAddV1.safeParse({ kind: 'image', file: { contentType: 'image/png', filename: 'a.png', data: 'AAAA' } }).success).toBe(true)
  })

  it('MW-US2-S8 a request carries the first name only and no phone number', () => {
    const bookings = creatorBookingsV1.parse(read('creator-bookings'))
    for (const request of [...bookings.waiting, ...bookings.upcoming, ...bookings.done]) {
      expect(Object.keys(request)).not.toContain('phone')
      expect(Object.keys(request)).not.toContain('whatsapp')
      expect(request.client).not.toMatch(/\s/)
    }
  })

  it('every creator endpoint needs a signed-in member and is never cached', () => {
    const mine = ENDPOINTS.filter((e) => e.path.includes('/me/creator/'))
    // 14 from 014, 3 from 019 (the brief inbox).
    expect(mine).toHaveLength(18)
    for (const e of mine) {
      expect(e.auth).toBe('required')
      expect(e.cache).toBe('no-store')
    }
  })
})
