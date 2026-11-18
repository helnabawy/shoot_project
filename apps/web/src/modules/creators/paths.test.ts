import { describe, expect, it } from 'vitest'
import { backToOffers, creatorPath } from './paths'

describe('OF-US4-S11 a profile opened from the offers page links back to it', () => {
  it('creatorPath carries the way back when one is given', () => {
    expect(creatorPath('7K4Q2', 'en')).toBe('/creators/7k4q2')
    expect(creatorPath('7K4Q2', 'ar', '/ar/match/B-22222/k?pick=photographer%3A0087')).toBe(
      '/ar/creators/7k4q2?back=%2Far%2Fmatch%2FB-22222%2Fk%3Fpick%3Dphotographer%253A0087',
    )
  })

  it('keeps only a same-site step-2 path, with or without the picks and the Arabic prefix', () => {
    expect(backToOffers('/match/B-22222/k_1')).toBe('/match/B-22222/k_1')
    expect(backToOffers('/ar/match/B-22222/k?pick=photographer%3A0087')).toBe('/ar/match/B-22222/k?pick=photographer%3A0087')
  })

  it('refuses anything else: other sites, other pages, odd shapes', () => {
    for (const bad of [undefined, '', ['/match/a/b'], 'https://evil.example/match/a/b', '//evil.example/match/a/b', '/match/a', '/match/a/b/details', '/account', '/match/a/b?next=//x', '/match/a/b?pick=<x>', '/fr/match/a/b']) {
      expect(backToOffers(bad)).toBeNull()
    }
  })
})
