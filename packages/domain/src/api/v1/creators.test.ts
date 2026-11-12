import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import { creatorListV1, creatorProfileRequestV1, creatorProfileV1, creatorsRequestV1, specialtyPageV1, specialtyRequestV1 } from './creators'
import { hirePageRequestV1, hirePageV1 } from './hire'

const example = (name: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(import.meta.dirname, 'examples', `${name}.json`), 'utf8')) as Record<string, unknown>

const without = (value: Record<string, unknown>, key: string) => Object.fromEntries(Object.entries(value).filter(([k]) => k !== key))

const cases: [string, z.ZodType, string[]][] = [
  ['creatorListV1', creatorListV1, ['creators', 'creators.ar']],
  ['creatorProfileV1', creatorProfileV1, ['creator-profile', 'creator-profile.ar']],
  ['specialtyPageV1', specialtyPageV1, ['specialty']],
  ['hirePageV1', hirePageV1, ['hire-page']],
]

describe.each(cases)('%s', (_name, schema, files) => {
  it.each(files)('accepts %s.json', (file) => {
    expect(schema.safeParse(example(file)).success).toBe(true)
  })

  it('refuses a missing required field', () => {
    const value = example(files[0] as string)
    for (const key of Object.keys(value)) expect(schema.safeParse(without(value, key)).success, key).toBe(false)
  })
})

describe('the creator card', () => {
  const list = example('creators') as z.input<typeof creatorListV1>

  it('MR-US3-S1 refuses a card without displayCode', () => {
    const [first, ...rest] = list.items
    const broken = without(first as Record<string, unknown>, 'displayCode')
    expect(creatorListV1.safeParse({ ...list, items: [broken, ...rest] }).success).toBe(false)
  })

  it('MR-US3-S1 the examples show Omar K. as SH-0087 with the board places, specialties and languages', () => {
    const omar = list.items[0]
    expect(omar).toMatchObject({ name: 'Omar K.', displayCode: 'SH-0087', places: ['Sharjah', 'Dubai'], specialties: ['Weddings', 'Events', 'Portraits'], languages: ['Arabic', 'English'] })
    expect(list.items.map((c) => c.name)).toEqual(['Omar K.', 'Mariam A.', 'Yusuf R.'])
    expect(omar?.photo?.sizes.map((s) => s.width)).toEqual([400, 800])
    expect(omar?.photo?.sizes[0]?.url).toMatch(/^https:\/\/example\.test\/api\/media\/file\//)
  })

  it('MR-US3-S2 the profile example has no gender', () => {
    expect(Object.keys(example('creator-profile'))).not.toContain('gender')
    expect(example('creator-profile.ar').locale).toBe('ar')
  })
})

describe('creatorsRequestV1', () => {
  it('MR-US3-S1 accepts the filters and page "2", and ignores unknown keys', () => {
    const parsed = creatorsRequestV1.parse({ query: { type: 'photographer', specialty: 'weddings', place: 'dubai', page: '2', utm_source: 'x' } })
    expect(parsed.query).toEqual({ type: 'photographer', specialty: 'weddings', place: 'dubai', page: '2' })
    expect(creatorsRequestV1.parse({ query: {} }).query).toEqual({})
  })

  it('refuses a page that is not an integer ≥ 1, and a repeated filter', () => {
    for (const page of ['0', '-1', '1.5', 'two', '']) expect(creatorsRequestV1.safeParse({ query: { page } }).success, page).toBe(false)
    expect(creatorsRequestV1.safeParse({ query: { type: ['a', 'b'] } }).success).toBe(false)
  })
})

describe('path parameters', () => {
  it('MR-US3-S2 params.code is 1–16 characters', () => {
    expect(creatorProfileRequestV1.safeParse({ params: { code: 'a' } }).success).toBe(true)
    expect(creatorProfileRequestV1.safeParse({ params: { code: 'sh-0087' } }).success).toBe(true)
    expect(creatorProfileRequestV1.safeParse({ params: { code: 'x'.repeat(16) } }).success).toBe(true)
    expect(creatorProfileRequestV1.safeParse({ params: { code: '' } }).success).toBe(false)
    expect(creatorProfileRequestV1.safeParse({ params: { code: 'x'.repeat(17) } }).success).toBe(false)
  })

  it('a specialty and a hire slug are non-empty', () => {
    expect(specialtyRequestV1.safeParse({ params: { specialty: 'weddings' } }).success).toBe(true)
    expect(specialtyRequestV1.safeParse({ params: { specialty: '' } }).success).toBe(false)
    expect(hirePageRequestV1.safeParse({ params: { slug: 'مصور-اعراس-دبي' } }).success).toBe(true)
    expect(hirePageRequestV1.safeParse({ params: { slug: '' } }).success).toBe(false)
  })
})

describe('hirePageV1', () => {
  it('MR-US3-S4 sends at most six creators and a path without language prefix', () => {
    const page = example('hire-page') as z.input<typeof hirePageV1>
    const seven = Array.from({ length: 7 }, () => page.creators[0])
    expect(hirePageV1.safeParse({ ...page, creators: seven }).success).toBe(false)
    expect(hirePageV1.safeParse({ ...page, path: '/ar/hire/x' }).success).toBe(false)
    expect(hirePageV1.safeParse({ ...page, builder: null }).success).toBe(true)
  })
})
