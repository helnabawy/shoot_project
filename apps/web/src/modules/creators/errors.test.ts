import { describe, expect, it } from 'vitest'
import ar from '../../../messages/ar.json'
import en from '../../../messages/en.json'
import { ERROR_MESSAGES, errorMessageKey } from './errors'

describe('CP-US3-S1 error messages', () => {
  it('every server error key has a message in both languages', () => {
    for (const messageKey of new Set(Object.values(ERROR_MESSAGES))) {
      expect((en.creators.err as Record<string, string>)[messageKey], `en ${messageKey}`).toBeTruthy()
      expect((ar.creators.err as Record<string, string>)[messageKey], `ar ${messageKey}`).toBeTruthy()
    }
  })

  it('every message in the error table is used by some key', () => {
    const used = new Set<string>(Object.values(ERROR_MESSAGES))
    for (const messageKey of Object.keys(en.creators.err)) expect(used.has(messageKey), messageKey).toBe(true)
  })

  it('maps known keys and falls back to the generic message', () => {
    expect(errorMessageKey('creators.errors.nameLength')).toBe('nameLength')
    expect(errorMessageKey('media.upload.size')).toBe('uploadSize')
    expect(errorMessageKey('something.else')).toBe('generic')
    expect(errorMessageKey(undefined)).toBe('generic')
  })

  it('covers every key the domain schemas, hooks and media rules can raise', async () => {
    const { readFileSync } = await import('node:fs')
    const sources = ['../../../../../packages/domain/src/creators/schemas.ts', './hooks.ts', './collections/CreatorProfiles.ts', '../media/collections/Media.ts', './actions.ts']
    const raised = new Set<string>()
    for (const file of sources) {
      const text = readFileSync(new URL(file, import.meta.url), 'utf8')
      for (const match of text.matchAll(/'((?:creators|media)\.[a-zA-Z.]+)'/g)) raised.add(match[1] as string)
    }
    const known = new Set(Object.keys(ERROR_MESSAGES))
    // Names that are not errors (a collection slug, a context flag).
    const ignore = new Set(['creators.code.immutable', 'creators.user.immutable', 'creators.code.unavailable'])
    const missing = [...raised].filter((key) => !known.has(key) && !ignore.has(key))
    expect(missing).toEqual([])
  })
})
