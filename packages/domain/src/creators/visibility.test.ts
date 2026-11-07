import { describe, expect, it } from 'vitest'
import { canBook, isListed, isPublic } from './visibility'
import type { ListingState, ProfileState } from './types'

const profile = (over: Partial<ProfileState> = {}): ProfileState => ({ published: true, hasNewerDraft: false, personaIds: ['p1'], ...over })
const listing = (over: Partial<ListingState> = {}): ListingState => ({ active: true, suspended: false, ...over })

describe('CP-FR-002 visibility', () => {
  it('is public only when published, active and not suspended', () => {
    expect(isPublic(profile(), listing())).toBe(true)
    expect(isPublic(profile({ published: false }), listing())).toBe(false)
    expect(isPublic(profile(), listing({ active: false }))).toBe(false)
    expect(isPublic(profile(), listing({ suspended: true }))).toBe(false)
  })

  it('stays public while a newer draft is pending', () => {
    expect(isPublic(profile({ hasNewerDraft: true }), listing())).toBe(true)
  })

  it('is listed when public and at least one persona is in the audience (CP-FR-009)', () => {
    expect(isListed(profile({ personaIds: ['p1', 'p2'] }), listing(), ['p2', 'p3'])).toBe(true)
    expect(isListed(profile({ personaIds: ['p1'] }), listing(), ['p2'])).toBe(false)
    expect(isListed(profile({ personaIds: ['p1'] }), listing(), [])).toBe(false)
    expect(isListed(profile({ personaIds: ['p1'] }), listing({ suspended: true }), ['p1'])).toBe(false)
  })

  it('compares persona ids as strings', () => {
    expect(isListed(profile({ personaIds: ['7'] }), listing(), ['7'])).toBe(true)
  })

  it('can be booked exactly when listed (an unlisted creator is reachable but not bookable)', () => {
    expect(canBook(profile(), listing(), ['p1'])).toBe(true)
    expect(canBook(profile(), listing(), ['p9'])).toBe(false)
    expect(isPublic(profile(), listing())).toBe(true)
  })
})
