import { describe, expect, it } from 'vitest'
import { profileStatus } from './status'
import type { ListingState, ProfileState } from './types'

const profile = (over: Partial<ProfileState> = {}): ProfileState => ({ published: false, hasNewerDraft: false, personaIds: ['p1'], ...over })
const listing = (over: Partial<ListingState> = {}): ListingState => ({ active: true, suspended: false, ...over })

describe('CP-FR-002 derived status (data-model status table, in order)', () => {
  it.each([
    ['suspended wins over everything', profile({ published: true, hasNewerDraft: true }), listing({ suspended: true, active: false, submittedAt: 'x' }), 'suspended'],
    ['paused when the provider switched the profile off', profile({ published: true }), listing({ active: false }), 'paused'],
    ['live with changes when a newer draft exists', profile({ published: true, hasNewerDraft: true }), listing(), 'live-with-changes'],
    ['live when published', profile({ published: true }), listing(), 'live'],
    ['in review when submitted and not yet published', profile(), listing({ submittedAt: '2026-11-07T10:00:00Z' }), 'in-review'],
    ['draft otherwise', profile(), listing(), 'draft'],
    ['draft when never submitted even with a draft saved', profile({ hasNewerDraft: true }), listing({ submittedAt: null }), 'draft'],
  ] as const)('%s', (_name, p, l, expected) => {
    expect(profileStatus(p, l)).toBe(expected)
  })
})
