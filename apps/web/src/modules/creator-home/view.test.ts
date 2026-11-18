import type { CreatorHomeV1, HomeItemV1 } from '@shoot/domain/api/v1'
import { describe, expect, it } from 'vitest'
import { buildHomeView, type Words } from './view'

const words: Words = {
  title: (v) => `${v.occasion} in ${v.emirate}`,
  titleNoOccasion: (v) => `${v.profession} in ${v.emirate}`,
  answerBy: (time) => `Answer by ${time}`,
  dateToAgree: 'To agree',
  sentAt: (relative) => relative,
  stepLabel: (step) => `step:${step}`,
}
const NOW = new Date('2026-11-17T10:00:00.000Z')

const base: CreatorHomeV1 = {
  name: 'Omar K.',
  code: 'SH-0087',
  professions: ['Photographer', 'Videographer'],
  photo: null,
  mode: 'live',
  needs: [],
  counts: { toAnswer: 3, comingUp: 1, completed: 4 },
  queue: [
    { kind: 'booking', ref: 'Q-1', occasion: 'Wedding', emirate: 'Dubai', profession: 'Photographer', date: '2026-11-28', time: '16:00', length: '4 hours', client: 'Sara M.', respondBy: '2026-11-17T14:00:00.000Z' },
    { kind: 'brief', ref: 'B-1', persona: '1', occasion: 'Birthday party', emirate: 'Dubai', profession: 'Photographer', date: '2026-11-20', sentAt: '2026-11-17T08:00:00.000Z', budgetFils: 90_000 },
    { kind: 'brief', ref: 'B-2', persona: '1', occasion: '', emirate: 'Abu Dhabi', profession: 'Photographer', date: null, sentAt: '2026-11-16T10:00:00.000Z' },
  ],
  next: { ref: 'Q-9', quotation: 'Q-9', occasion: 'Product shoot', emirate: 'Sharjah', date: '2026-11-19', time: '10:00', length: '2 hours', paid: true },
  today: 'free',
  reasons: [],
}

/** The example's i-th request with some fields changed. */
const q = (i: number, over: Record<string, unknown> = {}): HomeItemV1 => ({ ...(base.queue[i] as object), ...over }) as HomeItemV1

describe('CH-US1-S1 the card’s lines', () => {
  it('reads a booking request: title, date and time, length, client, reference and the answer-by time', () => {
    const [card] = buildHomeView(base, 'en', words, NOW).queue
    expect(card).toMatchObject({ kind: 'booking', ref: 'Q-1', title: 'Wedding in Dubai', deadline: 'Answer by 18:00' })
    expect(card!.lines).toEqual([
      { label: 'date', value: 'Sat 28 Nov, 16:00' },
      { label: 'length', value: '4 hours' },
      { label: 'client', value: 'Sara M.' },
      { label: 'reference', value: 'Q-1' },
    ])
  })

  it('reads a brief: date, what is needed, when it was sent, reference, and the client’s price when there is one', () => {
    const [, brief, undated] = buildHomeView(base, 'en', words, NOW).queue
    expect(brief!.lines.map((l) => l.label)).toEqual(['date', 'needs', 'sent', 'reference', 'price'])
    expect(brief!.lines.find((l) => l.label === 'date')!.value).toBe('Fri 20 Nov')
    expect(brief!.lines.find((l) => l.label === 'needs')!.value).toBe('Photographer')
    expect(brief!.lines.find((l) => l.label === 'sent')!.value).toMatch(/2 hours ago/)
    expect(brief!.lines.find((l) => l.label === 'price')!.value).toMatch(/900/)
    expect(brief!.deadline).toBeNull()
    expect(brief).toMatchObject({ persona: '1', hasPrice: true })
    expect(undated!.lines.find((l) => l.label === 'date')!.value).toBe('To agree')
    expect(undated!.lines.some((l) => l.label === 'price')).toBe(false)
    expect(undated!.hasPrice).toBe(false)
  })

  it('titles a brief with no occasion by its profession, and drops the place when there is none', () => {
    const [, , undated] = buildHomeView(base, 'en', words, NOW).queue
    expect(undated!.title).toBe('Photographer in Abu Dhabi')
    const noPlace = buildHomeView({ ...base, queue: [q(2, { emirate: '' })] }, 'en', words, NOW).queue[0]!
    expect(noPlace.title).toBe('Photographer')
  })

  it('leaves out a booking’s time and length when the booking has none, and its date when it has none', () => {
    const [card] = buildHomeView({ ...base, queue: [q(0, { time: null, length: null, date: null })] }, 'en', words, NOW).queue
    expect(card!.lines.map((l) => l.label)).toEqual(['date', 'client', 'reference'])
    expect(card!.lines[0]!.value).toBe('To agree')
  })

  it('puts a different day’s deadline with its date', () => {
    const [card] = buildHomeView({ ...base, queue: [q(0, { respondBy: '2026-11-19T14:00:00.000Z' })] }, 'en', words, NOW).queue
    expect(card!.deadline).toBe('Answer by Thu 19 Nov, 18:00')
  })
})

describe('CH-US1-S1 CH-US1-S7 the queue as a view', () => {
  it('shows the position and the rest, up to five following requests', () => {
    const many = { ...base, queue: Array.from({ length: 9 }, (_, i) => q(1, { ref: `B-${i}` })) }
    const view = buildHomeView(many, 'en', words, NOW)
    expect(view.card!.ref).toBe('B-0')
    expect(view.rest).toHaveLength(5)
    expect(view.hiddenCount).toBe(3)
    expect(view.total).toBe(9)
  })

  it('has no card when nothing waits', () => {
    const view = buildHomeView({ ...base, queue: [], counts: { toAnswer: 0, comingUp: 1, completed: 4 } }, 'en', words, NOW)
    expect(view.card).toBeNull()
    expect(view.rest).toEqual([])
    expect(view.total).toBe(0)
  })

  it('sends "See all" to the inbox when a hidden item is a brief, otherwise to the bookings', () => {
    const bookings = { ...base, queue: Array.from({ length: 8 }, (_, i) => q(0, { ref: `Q-${i}` })) }
    expect(buildHomeView(bookings, 'en', words, NOW).seeAllTo).toBe('bookings')
    const mixed = { ...base, queue: [...Array.from({ length: 6 }, (_, i) => q(0, { ref: `Q-${i}` })), ...base.queue.slice(1)] }
    expect(buildHomeView(mixed, 'en', words, NOW).seeAllTo).toBe('inbox')
  })
})

describe('CH-US3-S1 CH-US3-S3 CH-US3-S5 the rest of the page', () => {
  it('reads the identity, the next shoot and today', () => {
    const view = buildHomeView(base, 'en', words, NOW)
    expect(view).toMatchObject({ name: 'Omar K.', code: 'SH-0087', professions: 'Photographer and Videographer', mode: 'live', today: 'free' })
    expect(view.next).toMatchObject({ ref: 'Q-9', title: 'Product shoot in Sharjah', day: '19', paid: true })
    expect(view.next!.when).toBe('Thu 19 Nov, 10:00 · 2 hours')
    expect(buildHomeView({ ...base, next: null }, 'en', words, NOW).next).toBeNull()
  })

  it('joins professions with "and" in Arabic too, and formats Arabic dates', () => {
    const view = buildHomeView({ ...base, professions: ['مصوّر', 'مصوّر فيديو'] }, 'ar', words, NOW)
    expect(view.professions).toContain('مصوّر')
    expect(view.queue[0]!.lines[0]!.value).toMatch(/28/)
  })

  it('turns the missing steps into labelled needs, only for an incomplete profile', () => {
    const notLive: CreatorHomeV1 = { ...base, mode: 'incomplete', counts: undefined, queue: [], next: null, needs: [{ step: 'samples', required: ['samples'], recommended: [] }, { step: 'places', required: [], recommended: ['cities'] }] }
    const view = buildHomeView(notLive, 'en', words, NOW)
    expect(view.needs).toEqual([
      { step: 'samples', label: 'step:samples', required: true },
      { step: 'places', label: 'step:places', required: false },
    ])
    expect(view.stepsDone).toBe(6)
    expect(view.stepsTotal).toBe(7)
  })
})
