import { describe, expect, it } from 'vitest'
import { meUpdateV1 } from './account'

const keys = (value: unknown) => {
  const r = meUpdateV1.safeParse(value)
  return r.success ? [] : r.error.issues.map((i) => i.message)
}

describe('MK-US3-S3 MK-US3-S4 the details update', () => {
  it('takes a name, an email and the finish flag', () => {
    expect(meUpdateV1.parse({ name: ' Sara ', email: 'sara@example.ae', finishShown: true })).toEqual({ name: 'Sara', email: 'sara@example.ae', finishShown: true })
  })
  it('names the field problem as a message key', () => {
    expect(keys({ email: 'nope' })).toEqual(['account.errors.emailInvalid'])
    expect(keys({ name: 'S' })).toEqual(['account.errors.nameLength'])
    expect(keys({ email: `${'a'.repeat(260)}@x.ae` })).toContain('account.errors.emailInvalid')
  })
  it('refuses an empty change and a false flag', () => {
    expect(keys({})).toEqual(['api.errors.invalidField'])
    expect(meUpdateV1.safeParse({ finishShown: false }).success).toBe(false)
  })
})
