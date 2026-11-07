import { describe, expect, it } from 'vitest'
import { PROFILE_STEPS, profileStrength, STEP_NUMBER, STRENGTH_ITEMS, stepOfField, type StrengthItem } from './strength'

const all = (value: boolean) => Object.fromEntries(STRENGTH_ITEMS.map((i) => [i, value])) as Record<StrengthItem, boolean>

describe('CP-FR-016 profile strength', () => {
  it('names the seven steps in page order', () => {
    expect(PROFILE_STEPS).toEqual(['basics', 'about', 'places', 'links', 'samples', 'calendar', 'identity'])
    expect(STEP_NUMBER.identity).toBe(7)
  })

  it('a complete profile with everything recommended is 100 %', () => {
    const s = profileStrength({ missing: [], has: all(true) })
    expect(s.percent).toBe(100)
    expect(Object.values(s.steps).every((step) => step.required.length === 0 && step.recommended.length === 0)).toBe(true)
  })

  it('nothing at all is 0 %, and every required field sits in its step', () => {
    const s = profileStrength({ missing: ['displayName', 'personas', 'specialties', 'cities', 'languages', 'gender', 'emiratesId', 'tradeLicense'], has: all(false) })
    expect(s.percent).toBe(0)
    expect(s.steps.basics).toEqual({ required: ['displayName'], recommended: ['photo', 'bio'] })
    expect(s.steps.about).toEqual({ required: ['gender'], recommended: ['nationality', 'yearsExperience'] })
    expect(s.steps.places.required).toEqual(['personas', 'specialties', 'cities', 'languages'])
    expect(s.steps.links).toEqual({ required: [], recommended: ['link'] })
    expect(s.steps.samples).toEqual({ required: [], recommended: ['sample'] })
    expect(s.steps.calendar).toEqual({ required: [], recommended: [] })
    expect(s.steps.identity.required).toEqual(['emiratesId', 'tradeLicense'])
  })

  it('counts the 14 parts equally and rounds', () => {
    // 8 required done, nothing recommended: 8 of 14.
    expect(profileStrength({ missing: [], has: all(false) }).percent).toBe(57)
    expect(profileStrength({ missing: ['emiratesId'], has: { ...all(true), sample: false } }).percent).toBe(86)
  })

  it('finds the step a form field or error belongs to', () => {
    expect(stepOfField('displayName_en')).toBe('basics')
    expect(stepOfField('photo')).toBe('basics')
    expect(stepOfField('gender')).toBe('about')
    expect(stepOfField('yearsExperience')).toBe('about')
    expect(stepOfField('cities')).toBe('places')
    expect(stepOfField('social.2.url')).toBe('links')
    expect(stepOfField('sample.0.caption_en')).toBe('samples')
    expect(stepOfField('image')).toBe('samples')
    expect(stepOfField('tradeLicense')).toBe('identity')
    expect(stepOfField('emirates-id')).toBe('identity')
    expect(stepOfField('date')).toBe('calendar')
    expect(stepOfField('somethingElse')).toBeNull()
  })
})
