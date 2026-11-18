import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { creatorHomeV1, homeItemV1 } from './creator-home'

const example = (name: string) => JSON.parse(readFileSync(join(import.meta.dirname, 'examples', `${name}.json`), 'utf8')) as Record<string, unknown>

const booking = {
  kind: 'booking',
  ref: 'Q-2026-0142',
  occasion: 'Wedding',
  emirate: 'Dubai',
  profession: 'Photographer',
  date: '2026-11-28',
  time: '16:00',
  length: '4 hours',
  client: 'Sara M.',
  respondBy: '2026-11-18T14:00:00.000Z',
}
const brief = { kind: 'brief', ref: 'B-7K2QX', persona: '1', occasion: 'Birthday party', emirate: 'Dubai', profession: 'Photographer', date: null, sentAt: '2026-11-17T08:00:00.000Z' }

describe('CH-US1-S1 a queue item', () => {
  it('reads a booking request with its time, length and client', () => {
    expect(homeItemV1.parse(booking)).toEqual(booking)
    expect(homeItemV1.safeParse({ ...booking, time: null, length: null }).success).toBe(true)
  })

  it('reads a brief with no date, and with the client price when creators offer prices', () => {
    expect(homeItemV1.safeParse(brief).success).toBe(true)
    expect(homeItemV1.safeParse({ ...brief, budgetFils: 120_000 }).success).toBe(true)
  })

  it('refuses a booking request without its answer-by time or client', () => {
    const { respondBy: _r, ...noDeadline } = booking
    const { client: _c, ...noClient } = booking
    expect(homeItemV1.safeParse(noDeadline).success).toBe(false)
    expect(homeItemV1.safeParse(noClient).success).toBe(false)
  })

  it('never carries a client on a brief, nor contact details or prices it does not declare (FR-026)', () => {
    expect(homeItemV1.safeParse({ ...brief, client: 'Sara M.' }).success).toBe(false)
    expect(homeItemV1.safeParse({ ...booking, phone: '+971501234567' }).success).toBe(false)
    expect(homeItemV1.safeParse({ ...booking, totalFils: 110_000 }).success).toBe(false)
  })
})

describe('CH-US4-S3 the home', () => {
  it('parses the three examples', () => {
    for (const name of ['creator-home', 'creator-home-clear', 'creator-home-not-live']) expect(creatorHomeV1.safeParse(example(name)).success).toBe(true)
  })

  it('has counts and a queue only when live, and To answer equals the queue', () => {
    const live = example('creator-home')
    const notLive = example('creator-home-not-live')
    expect(creatorHomeV1.safeParse({ ...live, counts: { toAnswer: 9, comingUp: 1, completed: 4 } }).success).toBe(false)
    expect(creatorHomeV1.safeParse({ ...notLive, counts: { toAnswer: 0, comingUp: 0, completed: 0 } }).success).toBe(false)
    expect(creatorHomeV1.safeParse({ ...notLive, queue: [brief] }).success).toBe(false)
  })
})
