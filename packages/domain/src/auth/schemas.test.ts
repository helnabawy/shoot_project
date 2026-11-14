import { describe, expect, it } from 'vitest'
import { combinedPersonaValue, isProviderRegistrationValid, MAX_PROVIDER_PERSONAS, registerSchema } from './schemas'

const valid = {
  name: 'Mariam Saeed',
  email: 'Mariam@Example.COM ',
  password: 'correct-horse',
  accountType: 'seeker',
  acceptTerms: 'on',
}

const firstMessage = (r: { success: boolean; error?: { issues: { message: string; path: PropertyKey[] }[] } }) =>
  r.error?.issues[0]

describe('MP-US2-S2 acceptance of the legal documents', () => {
  it('refuses registration without the acceptance checkbox, and with anything but "on"', () => {
    for (const acceptTerms of [undefined, '', 'off', 'true']) {
      const result = registerSchema.safeParse({ ...valid, acceptTerms })
      expect(result.success).toBe(false)
      expect(result.error?.issues[0]).toMatchObject({ message: 'auth.errors.acceptTerms', path: ['acceptTerms'] })
    }
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })
})

describe('FR-019 registration schema', () => {
  it('US4-S1 accepts a valid seeker and normalises the email', () => {
    const parsed = registerSchema.parse(valid)
    expect(parsed.email).toBe('mariam@example.com')
    expect(parsed.persona).toEqual([])
  })

  it.each([
    [{ name: 'M' }, 'auth.errors.nameLength'],
    [{ name: 'x'.repeat(81) }, 'auth.errors.nameLength'],
    [{ email: 'not-an-email' }, 'auth.errors.emailInvalid'],
    [{ password: 'short' }, 'auth.errors.passwordLength'],
    [{ password: 'x'.repeat(129) }, 'auth.errors.passwordLength'],
    [{ accountType: 'admin' }, 'auth.errors.accountType'],
  ])('rejects %o with %s', (override, message) => {
    const result = registerSchema.safeParse({ ...valid, ...override })
    expect(result.success).toBe(false)
    expect(firstMessage(result)?.message).toBe(message)
  })

  it('FR-021 requires at least 8 characters', () => {
    expect(registerSchema.safeParse({ ...valid, password: '12345678' }).success).toBe(true)
  })

  it('US4-S2 requires a persona for providers', () => {
    const result = registerSchema.safeParse({ ...valid, accountType: 'provider', persona: '  ' })
    expect(firstMessage(result)?.message).toBe('auth.errors.personaRequired')
    expect(firstMessage(result)?.path).toEqual(['persona'])
  })

  it('accepts a provider with a persona and categories', () => {
    const parsed = registerSchema.parse({ ...valid, accountType: 'provider', persona: '12', categories: ['3'] })
    expect(parsed.persona).toEqual(['12'])
    expect(parsed.categories).toEqual(['3'])
  })

  it('accepts the combined option: several personas in one value, trimmed and de-duplicated', () => {
    const parsed = registerSchema.parse({ ...valid, accountType: 'provider', persona: combinedPersonaValue(['photographer', 'videographer']) })
    expect(parsed.persona).toEqual(['photographer', 'videographer'])
    expect(registerSchema.parse({ ...valid, accountType: 'provider', persona: ' a , ,b,a ' }).persona).toEqual(['a', 'b'])
  })
})

describe('provider persona must be active', () => {
  it('seekers always pass', () => {
    expect(isProviderRegistrationValid({ accountType: 'seeker', persona: [] }, [])).toBe(true)
  })
  it('providers need active personas, every one of them', () => {
    expect(isProviderRegistrationValid({ accountType: 'provider', persona: ['1'] }, ['1', '2'])).toBe(true)
    expect(isProviderRegistrationValid({ accountType: 'provider', persona: ['1', '2'] }, ['1', '2'])).toBe(true)
    expect(isProviderRegistrationValid({ accountType: 'provider', persona: ['1', '9'] }, ['1', '2'])).toBe(false)
    expect(isProviderRegistrationValid({ accountType: 'provider', persona: ['9'] }, ['1'])).toBe(false)
    expect(isProviderRegistrationValid({ accountType: 'provider', persona: [] }, ['1'])).toBe(false)
  })
  it('caps a provider at the number of personas a profile holds', () => {
    const many = Array.from({ length: MAX_PROVIDER_PERSONAS + 1 }, (_, i) => String(i))
    expect(isProviderRegistrationValid({ accountType: 'provider', persona: many }, many)).toBe(false)
  })
})
