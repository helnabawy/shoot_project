import { describe, expect, it } from 'vitest'
import ar from '../../messages/ar.json'
import en from '../../messages/en.json'

type Tree = { [key: string]: string | Tree }

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === 'string' ? { ...acc, [path]: value } : { ...acc, ...flatten(value, path) }
  }, {})
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}|<(\w+)>/g)].map((m) => m[1] ?? `<${m[2]}>`).sort()

describe('FR-039 translation files', () => {
  const enFlat = flatten(en as Tree)
  const arFlat = flatten(ar as Tree)

  it('have identical keys', () => {
    expect(Object.keys(arFlat).sort()).toEqual(Object.keys(enFlat).sort())
  })

  it('have no empty strings', () => {
    for (const [key, value] of [...Object.entries(enFlat), ...Object.entries(arFlat)]) {
      expect(value.trim(), key).not.toBe('')
    }
  })

  it('keep the same ICU placeholders in both languages', () => {
    for (const key of Object.keys(enFlat)) {
      expect(placeholders(arFlat[key] ?? ''), key).toEqual(placeholders(enFlat[key] ?? ''))
    }
  })

  it('cover every validation key the domain package emits', () => {
    for (const key of [
      'auth.errors.nameLength',
      'auth.errors.emailInvalid',
      'auth.errors.passwordLength',
      'auth.errors.passwordRequired',
      'auth.errors.accountType',
      'auth.errors.personaRequired',
      'brief.errors.required',
      'brief.errors.dateInvalid',
      'brief.errors.datePast',
      'brief.errors.numberInvalid',
      'brief.errors.tooLong',
      'brief.errors.notAnOption',
      'contact.errors.whatsappFormat',
    ]) {
      expect(enFlat[key], key).toBeTruthy()
    }
  })
})
