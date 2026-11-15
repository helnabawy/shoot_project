import { describe, expect, it } from 'vitest'
import {
  KEPT_BRIEF_MAX_AGE_S,
  decodeKeptBrief,
  encodeKeptBrief,
  isKeptBriefFresh,
  keptBriefMatches,
  keptEntries,
  keptValue,
  type KeptBrief,
} from './kept'

const at = '2026-11-14T10:00:00.000Z'
const kept = (over: Partial<KeptBrief> = {}): KeptBrief => ({
  v: 1,
  at,
  path: '/',
  locale: 'en',
  sentence: 'I need a photographer for an event in Dubai.',
  entries: [
    ['persona', 'photographer'],
    ['occasion', 'event'],
  ],
  ...over,
})

describe('021 kept brief', () => {
  describe('BS-US3-S1 the brief survives the sign-in round trip', () => {
    it('round-trips through the cookie value, Arabic included', () => {
      const brief = kept({ locale: 'ar', sentence: 'أحتاج مصوّراً لمناسبة في دبي.', entries: [['occasion__custom', 'عيد ميلاد']], error: { errors: { date: 'brief.errors.pastDate' }, formError: 'brief.errors.tooMany' } })
      const raw = encodeKeptBrief(brief)
      expect(raw).toMatch(/^[A-Za-z0-9_-]+$/)
      expect(decodeKeptBrief(raw)).toEqual(brief)
    })

    it('keeps only the answers, the creator, the pick and typed words', () => {
      const form: [string, unknown][] = [
        ['persona', 'photographer'],
        ['persona', 'videographer'],
        ['occasion__custom', 'Graduation'],
        ['creator', 'CR-12'],
        ['pick', 'photographer:12'],
        ['locale', 'en'],
        ['js', '1'],
        ['website', 'spam'],
        ['phone', '+971501234567'],
        ['date', ''],
        ['unknown', 'x'],
        ['duration', new Blob(['x'])],
      ]
      expect(keptEntries(form, ['persona', 'occasion', 'date', 'duration'])).toEqual([
        ['persona', 'photographer'],
        ['persona', 'videographer'],
        ['occasion__custom', 'Graduation'],
        ['creator', 'CR-12'],
        ['pick', 'photographer:12'],
        ['date', ''],
      ])
    })

    it('caps the number and length of entries', () => {
      const many = Array.from({ length: 60 }, (_, i) => ['persona', `p${i}`] as [string, string])
      expect(keptEntries(many, ['persona'])).toHaveLength(40)
      expect(keptEntries([['persona', 'x'.repeat(500)]], ['persona'])[0]![1]).toHaveLength(200)
    })

    it('reads one value of an entry', () => {
      expect(keptValue(kept({ entries: [['creator', 'CR-12']] }), 'creator')).toBe('CR-12')
      expect(keptValue(kept(), 'creator')).toBe('')
    })

    it('matches only the builder it came from: same page, language and creator', () => {
      const withCreator = kept({ path: '/book/CR-12', entries: [['creator', 'CR-12']] })
      expect(keptBriefMatches(kept(), { path: '/', locale: 'en' })).toBe(true)
      expect(keptBriefMatches(kept(), { path: '/', locale: 'ar' })).toBe(false)
      expect(keptBriefMatches(kept(), { path: '/hire/weddings', locale: 'en' })).toBe(false)
      expect(keptBriefMatches(withCreator, { path: '/book/CR-12', locale: 'en', creator: 'CR-12' })).toBe(true)
      expect(keptBriefMatches(withCreator, { path: '/book/CR-12', locale: 'en' })).toBe(false)
      expect(keptBriefMatches(kept(), { path: '/', locale: 'en', creator: 'CR-12' })).toBe(false)
    })
  })

  describe('BS-US3-S3 a kept brief lasts one hour', () => {
    it('is fresh for an hour, then stale', () => {
      expect(KEPT_BRIEF_MAX_AGE_S).toBe(3600)
      expect(isKeptBriefFresh(kept(), new Date('2026-11-14T10:59:00.000Z'))).toBe(true)
      expect(isKeptBriefFresh(kept(), new Date('2026-11-14T11:01:00.000Z'))).toBe(false)
      expect(isKeptBriefFresh(kept({ at: 'not a date' }), new Date(at))).toBe(false)
      // A clock that runs behind the server's still accepts a brief kept "in the future" by a minute.
      expect(isKeptBriefFresh(kept({ at: '2026-11-14T10:01:00.000Z' }), new Date(at))).toBe(true)
      expect(isKeptBriefFresh(kept({ at: '2026-11-14T10:10:00.000Z' }), new Date(at))).toBe(false)
    })
  })

  describe('FR-017 nothing but a valid brief is read back', () => {
    it.each([
      ['missing', undefined],
      ['empty', ''],
      ['not base64', '%%%'],
      ['not JSON', encode('not json')],
      ['not an object', encode('[1]')],
      ['another version', encode(JSON.stringify({ ...kept(), v: 2 }))],
      ['a path that is not same-site', encode(JSON.stringify({ ...kept(), path: '//evil.test' }))],
      ['a path without a slash', encode(JSON.stringify({ ...kept(), path: 'x' }))],
      ['an unknown language', encode(JSON.stringify({ ...kept(), locale: 'fr' }))],
      ['entries that are not pairs', encode(JSON.stringify({ ...kept(), entries: [['a']] }))],
      ['entries that are not a list', encode(JSON.stringify({ ...kept(), entries: 'x' }))],
      ['a sentence that is not text', encode(JSON.stringify({ ...kept(), sentence: 1 }))],
      ['a time that is not text', encode(JSON.stringify({ ...kept(), at: 1 }))],
      ['errors that are not text', encode(JSON.stringify({ ...kept(), error: { errors: { a: 1 } } }))],
      ['an error that is not an object', encode(JSON.stringify({ ...kept(), error: 'x' }))],
      ['a form error that is not text', encode(JSON.stringify({ ...kept(), error: { errors: {}, formError: 1 } }))],
    ])('ignores %s', (_label, raw) => {
      expect(decodeKeptBrief(raw)).toBeNull()
    })

    it('does not keep a brief too large for a cookie', () => {
      expect(encodeKeptBrief(kept({ sentence: 'x'.repeat(4000) }))).toBeNull()
    })
  })
})

function encode(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64url')
}
