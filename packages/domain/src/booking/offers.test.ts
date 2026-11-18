import { describe, expect, it } from 'vitest'
import {
  matchingEmirate,
  canChange,
  canWithdraw,
  feeOf,
  inRange,
  MAX_OFFER_CHANGES,
  offerQuote,
  offerRange,
  offersOn,
  offerStamp,
  sortOffers,
  type OfferState,
} from './offers'

const settings = { minPercent: 70, maxPercent: 200 }
const label = (en: string) => ({ en, ar: en })

describe('offersOn', () => {
  it('needs Quick Match and the offers switch', () => {
    expect(offersOn({ quickMatchEnabled: true, offersEnabled: true })).toBe(true)
    expect(offersOn({ quickMatchEnabled: false, offersEnabled: true })).toBe(false)
    expect(offersOn({ quickMatchEnabled: true, offersEnabled: false })).toBe(false)
    expect(offersOn({ quickMatchEnabled: true, offersEnabled: undefined })).toBe(false)
  })
})

describe('OF-US1-S3 OF-US3-S3 the allowed range', () => {
  it('is a percentage of the suggestion, in whole dirhams', () => {
    expect(offerRange(80_000, settings)).toEqual({ min: 56_000, max: 160_000 })
    expect(offerRange(80_050, { minPercent: 70, maxPercent: 200 })).toEqual({ min: 56_000, max: 160_100 })
  })

  it('refuses amounts outside it and accepts its edges', () => {
    const range = offerRange(80_000, settings)
    expect(inRange(56_000, range)).toBe(true)
    expect(inRange(160_000, range)).toBe(true)
    expect(inRange(55_900, range)).toBe(false)
    expect(inRange(160_100, range)).toBe(false)
  })

  it('refuses fractions of a dirham and non-integers', () => {
    const range = offerRange(80_000, settings)
    expect(inRange(80_050, range)).toBe(false)
    expect(inRange(800.5, range)).toBe(false)
    expect(inRange(Number.NaN, range)).toBe(false)
  })
})

describe('OF-US1-S5 no suggestion', () => {
  it('allows any whole amount of at least AED 1', () => {
    const range = offerRange(null, settings)
    expect(range).toEqual({ min: 100, max: null })
    expect(inRange(100, range)).toBe(true)
    expect(inRange(10_000_000, range)).toBe(true)
    expect(inRange(0, range)).toBe(false)
  })
})

describe('OF-US4-S4 OF-SC-004 fee and quotation', () => {
  it('the fee is the percentage in whole dirhams', () => {
    expect(feeOf(80_000, 10)).toBe(8_000)
    expect(feeOf(95_000, 10)).toBe(9_500)
    expect(feeOf(95_500, 10)).toBe(9_600)
    expect(feeOf(95_000, 0)).toBe(0)
  })

  it('OF-US5-S1 one offer line per pick and one fee line that is the sum of the per-offer fees', () => {
    const quote = offerQuote(
      [
        { personaId: 'p', label: label('Photographer · Omar K.'), amount: 95_000 },
        { personaId: 'v', label: label('Videographer · Mariam A.'), amount: 120_500 },
      ],
      10,
      label('Service fee 10%'),
    )
    expect(quote.lines.map((l) => [l.kind, l.amount, l.personaId])).toEqual([
      ['offer', 95_000, 'p'],
      ['offer', 120_500, 'v'],
      ['fee', 9_500 + 12_100, undefined],
    ])
    expect(quote.subtotal).toBe(95_000 + 120_500 + 21_600)
    expect(quote.discount).toBe(0)
    expect(quote.total).toBe(quote.subtotal)
  })

  it('a zero fee adds no fee line', () => {
    const quote = offerQuote([{ personaId: 'p', label: label('x'), amount: 80_000 }], 0, label('fee'))
    expect(quote.lines.map((l) => l.kind)).toEqual(['offer'])
    expect(quote.total).toBe(80_000)
  })
})

const state = (over: Partial<OfferState> = {}): OfferState => ({ decision: 'accepted', withdrawn: false, declined: false, revisions: 0, locked: false, ...over })

describe('OF-US3-S4 OF-US3-S6 changing and withdrawing', () => {
  it('a new offer and up to three changes are allowed', () => {
    expect(canChange(null)).toBe('ok')
    expect(canChange(state({ revisions: 2 }))).toBe('ok')
    expect(MAX_OFFER_CHANGES).toBe(3)
    expect(canChange(state({ revisions: 3 }))).toBe('tooManyChanges')
  })

  it('a withdrawn or rejected answer starts again', () => {
    expect(canChange(state({ withdrawn: true, revisions: 3 }))).toBe('ok')
    expect(canChange(state({ decision: 'rejected', revisions: 3 }))).toBe('ok')
  })

  it('declined by the client is final', () => {
    expect(canChange(state({ declined: true }))).toBe('declined')
    expect(canWithdraw(state({ declined: true }))).toBe('declined')
  })

  it('locked while an issued quotation includes it', () => {
    expect(canChange(state({ locked: true }))).toBe('picked')
    expect(canWithdraw(state({ locked: true }))).toBe('picked')
    expect(canWithdraw(state())).toBe('ok')
    expect(canWithdraw(null)).toBe('ok')
  })
})

describe('OF-US4-S3 order', () => {
  it('lowest total first, then the earlier answer', () => {
    const offers = [
      { id: 'c', totalFils: 99_000, answeredAt: '2026-11-17T09:00:00Z' },
      { id: 'a', totalFils: 88_000, answeredAt: '2026-11-17T10:00:00Z' },
      { id: 'b', totalFils: 88_000, answeredAt: '2026-11-17T08:00:00Z' },
    ]
    expect(sortOffers(offers).map((o) => o.id)).toEqual(['b', 'a', 'c'])
    expect(offers[0]?.id).toBe('c')
  })
})

describe('offerStamp', () => {
  it('is stable for the same parts and changes when any part does', () => {
    const a = offerStamp(['b1', 'c1:80000:0', 'c2:95000:1'])
    expect(offerStamp(['b1', 'c1:80000:0', 'c2:95000:1'])).toBe(a)
    expect(offerStamp(['b1', 'c1:80000:0', 'c2:95000:2'])).not.toBe(a)
    expect(a).toMatch(/^[0-9a-z]+$/)
  })
})

describe('OF-US2-S2 offers go to every emirate (amended 2026-11-18)', () => {
  it('an offers brief matches creators in any emirate; a fixed-price brief keeps its emirate', () => {
    expect(matchingEmirate('7', 'offers')).toBeNull()
    expect(matchingEmirate('7', 'fixed')).toBe('7')
    expect(matchingEmirate('7', null)).toBe('7')
    expect(matchingEmirate(null, undefined)).toBeNull()
  })
})
