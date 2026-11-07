import { describe, expect, it } from 'vitest'
import { missingForReview, moveItem, parseProfileForm, parseSampleForm, removeItem, replaceItem } from './schemas'

const valid = {
  displayName_en: '  Sara Khan ',
  displayName_ar: 'سارة خان',
  bio_en: 'Weddings and portraits.',
  bio_ar: '',
  personas: ['1'],
  specialties: ['10', '11'],
  cities: ['100'],
  languages: ['en', 'ar'],
  social: [{ platform: 'instagram', url: 'https://instagram.com/sara' }],
}
const errorsOf = (over: Record<string, unknown>) => {
  const result = parseProfileForm({ ...valid, ...over })
  return result.ok ? null : result.errors
}

describe('CP-US3-S1 profile form', () => {
  it('accepts a valid profile and trims the text', () => {
    const result = parseProfileForm(valid)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.displayName).toEqual({ en: 'Sara Khan', ar: 'سارة خان' })
    expect(result.data.bio).toEqual({ en: 'Weddings and portraits.', ar: '' })
    expect(result.data).toMatchObject({ personas: ['1'], specialties: ['10', '11'], cities: ['100'], languages: ['en', 'ar'] })
  })

  it('treats Arabic text as optional and missing optional fields as empty', () => {
    const result = parseProfileForm({ displayName_en: 'Sara', personas: ['1'] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data).toMatchObject({ displayName: { en: 'Sara', ar: '' }, bio: { en: '', ar: '' }, specialties: [], cities: [], languages: [], social: [] })
  })

  it.each([
    [{ displayName_en: 'S' }, 'displayName_en', 'creators.errors.nameLength'],
    [{ displayName_en: '   ' }, 'displayName_en', 'creators.errors.nameLength'],
    [{ displayName_en: 'x'.repeat(61) }, 'displayName_en', 'creators.errors.nameLength'],
    [{ displayName_ar: 'x'.repeat(61) }, 'displayName_ar', 'creators.errors.nameLength'],
    [{ bio_en: 'x'.repeat(601) }, 'bio_en', 'creators.errors.bioLength'],
    [{ bio_ar: 'x'.repeat(601) }, 'bio_ar', 'creators.errors.bioLength'],
    [{ personas: [] }, 'personas', 'creators.errors.personasRange'],
    [{ personas: ['1', '2', '3', '4', '5'] }, 'personas', 'creators.errors.personasRange'],
    [{ personas: ['1', '1'] }, 'personas', 'creators.errors.duplicate'],
    [{ specialties: Array.from({ length: 13 }, (_, i) => String(i)) }, 'specialties', 'creators.errors.tooMany'],
    [{ specialties: ['1', '1'] }, 'specialties', 'creators.errors.duplicate'],
    [{ cities: Array.from({ length: 13 }, (_, i) => String(i)) }, 'cities', 'creators.errors.tooMany'],
    [{ cities: ['5', '5'] }, 'cities', 'creators.errors.duplicate'],
    [{ languages: ['en', 'xx'] }, 'languages', 'creators.errors.languageInvalid'],
    [{ languages: ['en', 'en'] }, 'languages', 'creators.errors.duplicate'],
  ])('rejects %o on %s with %s', (override, field, message) => {
    expect(errorsOf(override)?.[field]).toContain(message)
  })

  it('accepts exactly the limits', () => {
    expect(errorsOf({ displayName_en: 'x'.repeat(60), bio_en: 'x'.repeat(600), personas: ['1', '2', '3', '4'], specialties: Array.from({ length: 12 }, (_, i) => String(i)) })).toBeNull()
    expect(errorsOf({ displayName_en: 'xy' })).toBeNull()
  })

  it('links must be https on the platform\'s own site, at most six', () => {
    expect(errorsOf({ social: [{ platform: 'instagram', url: 'http://instagram.com/sara' }] })?.['social.0.url']).toContain('creators.errors.socialInvalid')
    expect(errorsOf({ social: [{ platform: 'instagram', url: 'https://tiktok.com/@sara' }] })?.['social.0.url']).toContain('creators.errors.socialInvalid')
    expect(errorsOf({ social: [{ platform: 'website', url: 'javascript:alert(1)' }] })?.['social.0.url']).toContain('creators.errors.socialInvalid')
    expect(errorsOf({ social: [valid.social[0], { platform: 'website', url: 'https://sara.example' }] })).toBeNull()
    const seven = Array.from({ length: 7 }, () => ({ platform: 'website', url: 'https://sara.example' }))
    expect(errorsOf({ social: seven })?.social).toContain('creators.errors.tooMany')
  })

  it('rejects an unknown platform', () => {
    expect(errorsOf({ social: [{ platform: 'myspace', url: 'https://x.example' }] })?.['social.0.platform']).toBeDefined()
  })

  it('reports every problem at once, each against its own field', () => {
    const errors = errorsOf({ displayName_en: '', bio_en: 'x'.repeat(601), languages: ['xx'] })
    expect(Object.keys(errors ?? {}).sort()).toEqual(['bio_en', 'displayName_en', 'languages'])
  })
})

describe('CP-US3-S1 sample form', () => {
  it('accepts an image sample and a video link on an allowed host', () => {
    expect(parseSampleForm({ kind: 'image', caption_en: ' Golden hour ', caption_ar: '', category: '10' })).toEqual({
      ok: true,
      data: { kind: 'image', caption: { en: 'Golden hour', ar: '' }, category: '10', videoUrl: undefined },
    })
    const video = parseSampleForm({ kind: 'video', videoUrl: ' https://youtu.be/abc ', caption_en: '' })
    expect(video).toMatchObject({ ok: true, data: { kind: 'video', videoUrl: 'https://youtu.be/abc', category: undefined } })
  })

  it('a video needs an https link on YouTube or Vimeo', () => {
    for (const videoUrl of ['', 'http://youtu.be/abc', 'https://evil.example/x', 'https://youtube.com.evil.example/x']) {
      const result = parseSampleForm({ kind: 'video', videoUrl })
      expect(result.ok, videoUrl).toBe(false)
      if (!result.ok) expect(result.errors.videoUrl).toContain('creators.errors.videoHost')
    }
  })

  it('captions are at most 140 characters; the kind must be image or video', () => {
    const long = parseSampleForm({ kind: 'image', caption_en: 'x'.repeat(141) })
    expect(!long.ok && long.errors.caption_en).toContain('creators.errors.captionLength')
    const ar = parseSampleForm({ kind: 'image', caption_ar: 'x'.repeat(141) })
    expect(!ar.ok && ar.errors.caption_ar).toContain('creators.errors.captionLength')
    expect(parseSampleForm({ kind: 'audio' }).ok).toBe(false)
    expect(parseSampleForm({}).ok).toBe(false)
  })

  it('ignores a video link on an image sample', () => {
    const result = parseSampleForm({ kind: 'image', videoUrl: 'https://evil.example' })
    expect(result).toMatchObject({ ok: true, data: { videoUrl: undefined } })
  })
})

describe('CP-FR-011 gender, nationality and years of experience', () => {
  const base = { displayName_en: 'Sara', personas: ['1'] }

  it('stores them when given and null when left empty', () => {
    const given = parseProfileForm({ ...base, gender: 'woman', nationality: 'AE', yearsExperience: '8' })
    expect(given).toMatchObject({ ok: true, data: { gender: 'woman', nationality: 'AE', yearsExperience: 8 } })
    const empty = parseProfileForm({ ...base, gender: '', nationality: '', yearsExperience: '' })
    expect(empty).toMatchObject({ ok: true, data: { gender: null, nationality: null, yearsExperience: null } })
    expect(parseProfileForm({ ...base, yearsExperience: '0' })).toMatchObject({ ok: true, data: { yearsExperience: 0 } })
  })

  it.each([
    [{ gender: 'other' }, 'gender', 'creators.errors.genderInvalid'],
    [{ nationality: 'XX' }, 'nationality', 'creators.errors.nationalityInvalid'],
    [{ yearsExperience: '61' }, 'yearsExperience', 'creators.errors.experienceRange'],
    [{ yearsExperience: '-1' }, 'yearsExperience', 'creators.errors.experienceRange'],
    [{ yearsExperience: '2.5' }, 'yearsExperience', 'creators.errors.experienceRange'],
    [{ yearsExperience: 'ten' }, 'yearsExperience', 'creators.errors.experienceRange'],
  ])('rejects %j', (over, field, message) => {
    const result = parseProfileForm({ ...base, ...over })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[field]).toEqual([message])
  })
})

describe('CP-US3-S1 submitting for review', () => {
  const complete = { displayName: 'Sara', personas: ['1'], specialties: ['10'], cities: ['100'], languages: ['en'] }

  it('lists nothing missing for a complete profile', () => {
    expect(missingForReview(complete)).toEqual([])
  })

  it('lists exactly what is missing, in form order', () => {
    expect(missingForReview({ displayName: ' ', personas: [], specialties: [], cities: [], languages: [] })).toEqual(['displayName', 'personas', 'specialties', 'cities', 'languages'])
    expect(missingForReview({ ...complete, cities: [] })).toEqual(['cities'])
    expect(missingForReview({ ...complete, languages: [], specialties: [] })).toEqual(['specialties', 'languages'])
  })

  it('CP-FR-011 gender is required before review once the form asks for it', () => {
    expect(missingForReview({ ...complete, gender: null })).toEqual(['gender'])
    expect(missingForReview({ ...complete, gender: '' })).toEqual(['gender'])
    expect(missingForReview({ ...complete, gender: 'woman' })).toEqual([])
  })

  it('samples are not required to send for review (only to be featured)', () => {
    expect(missingForReview(complete)).not.toContain('samples')
  })
})

describe('sample list edits', () => {
  const list = ['a', 'b', 'c']
  it('moves an item up or down and refuses to leave the list', () => {
    expect(moveItem(list, 1, 'up')).toEqual(['b', 'a', 'c'])
    expect(moveItem(list, 1, 'down')).toEqual(['a', 'c', 'b'])
    expect(moveItem(list, 0, 'up')).toEqual(list)
    expect(moveItem(list, 2, 'down')).toEqual(list)
    expect(moveItem(list, 9, 'up')).toEqual(list)
    expect(moveItem(list, -1, 'down')).toEqual(list)
  })
  it('removes and replaces by index without touching the original', () => {
    expect(removeItem(list, 1)).toEqual(['a', 'c'])
    expect(removeItem(list, 5)).toEqual(list)
    expect(replaceItem(list, 2, 'z')).toEqual(['a', 'b', 'z'])
    expect(replaceItem(list, 7, 'z')).toEqual(list)
    expect(list).toEqual(['a', 'b', 'c'])
  })
})
