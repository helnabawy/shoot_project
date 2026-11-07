import { describe, expect, it } from 'vitest'
import { GUIDES_PAGE_SIZE, hasNativeText, isLive, paginateArticles, parsePage, readingMinutes, relatedArticles } from './articles'

const NOW = new Date('2026-11-07T12:00:00Z')

describe('MP-US3-S2 isLive', () => {
  it('is live once published and its time has come, including the exact moment', () => {
    expect(isLive({ _status: 'published', publishedAt: '2026-11-07T11:59:59Z' }, NOW)).toBe(true)
    expect(isLive({ _status: 'published', publishedAt: '2026-11-07T12:00:00Z' }, NOW)).toBe(true)
  })
  it('is not live before its time, as a draft, without a time or with a broken one', () => {
    expect(isLive({ _status: 'published', publishedAt: '2026-11-07T12:00:01Z' }, NOW)).toBe(false)
    expect(isLive({ _status: 'draft', publishedAt: '2020-01-01T00:00:00Z' }, NOW)).toBe(false)
    expect(isLive({ _status: 'published' }, NOW)).toBe(false)
    expect(isLive({ _status: 'published', publishedAt: 'soon' }, NOW)).toBe(false)
  })
})

describe('MP-US3-S1 paginateArticles / parsePage', () => {
  it('splits into pages of twelve and reports neighbours', () => {
    expect(GUIDES_PAGE_SIZE).toBe(12)
    expect(paginateArticles(30, 1)).toEqual({ page: 1, pages: 3, size: 12, offset: 0, hasPrev: false, hasNext: true })
    expect(paginateArticles(30, 2)).toMatchObject({ offset: 12, hasPrev: true, hasNext: true })
    expect(paginateArticles(30, 3)).toMatchObject({ offset: 24, hasPrev: true, hasNext: false })
    expect(paginateArticles(12, 1).pages).toBe(1)
  })
  it('clamps a page outside the range and handles no articles', () => {
    expect(paginateArticles(30, 99).page).toBe(3)
    expect(paginateArticles(30, 0).page).toBe(1)
    expect(paginateArticles(30, Number.NaN).page).toBe(1)
    expect(paginateArticles(0, 5)).toEqual({ page: 1, pages: 1, size: 12, offset: 0, hasPrev: false, hasNext: false })
    expect(paginateArticles(5, 2, 2).offset).toBe(2)
  })
  it('reads the page from the query string', () => {
    expect(parsePage('3')).toBe(3)
    expect(parsePage(['2', '9'])).toBe(2)
    for (const bad of [undefined, '', '0', '-1', '1.5', 'abc', '1e3', '9999999']) expect(parsePage(bad)).toBe(1)
  })
})

describe('MP-US3-S3 readingMinutes / hasNativeText / relatedArticles', () => {
  it('rounds up at 200 words a minute, at least one minute, for Arabic too', () => {
    const words = (n: number) => Array.from({ length: n }, () => 'word').join(' ')
    expect(readingMinutes('')).toBe(1)
    expect(readingMinutes(words(200))).toBe(1)
    expect(readingMinutes(words(201))).toBe(2)
    expect(readingMinutes(Array.from({ length: 450 }, () => 'كلمة').join(' '))).toBe(3)
  })
  it('knows whether a language has words of its own', () => {
    expect(hasNativeText('عنوان')).toBe(true)
    for (const empty of ['', '  ', null, undefined, 4]) expect(hasNativeText(empty)).toBe(false)
  })
  it('relates up to three others that share a category, newest first, never itself', () => {
    const a = (id: string, categories: string[], publishedAt: string) => ({ id, categories, publishedAt })
    const current = a('1', ['x', 'y'], '2026-01-01T00:00:00Z')
    const all = [current, a('2', ['x'], '2026-02-01T00:00:00Z'), a('3', ['z'], '2026-03-01T00:00:00Z'), a('4', ['y'], '2026-04-01T00:00:00Z'), a('5', ['x', 'y'], '2026-03-01T00:00:00Z'), a('6', ['x'], '2026-05-01T00:00:00Z')]
    expect(relatedArticles(current, all).map((r) => r.id)).toEqual(['6', '4', '5'])
    expect(relatedArticles(current, all, 1).map((r) => r.id)).toEqual(['6'])
    expect(relatedArticles(a('9', ['q'], '2026-01-01T00:00:00Z'), all)).toEqual([])
  })
})
