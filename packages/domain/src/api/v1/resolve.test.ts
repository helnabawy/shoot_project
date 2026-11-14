import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { classifyPath, isResolvablePath, resolveRequestV1, resolveV1, strippedPath } from './resolve'

const example = (name: string): unknown => JSON.parse(readFileSync(join(import.meta.dirname, 'examples', `${name}.json`), 'utf8'))

describe('MR-US5-S1 classifyPath maps each website pattern to its app place', () => {
  it.each([
    ['/', 'route', {}],
    ['/creators', 'route', { route: '/creators' }],
    ['/guides', 'route', { route: '/guides' }],
    ['/login', 'route', { route: '/login' }],
    ['/login/code', 'route', { route: '/login/code' }],
    ['/register', 'route', { route: '/register' }],
    ['/creators/0087', 'creator', { code: '0087' }],
    ['/book/0087', 'book', { code: '0087' }],
    ['/work/weddings', 'specialty', { specialty: 'weddings' }],
    ['/hire/proposal-photographer-dubai', 'hire', { slug: 'proposal-photographer-dubai' }],
    ['/guides/how-to-brief', 'guide', { slug: 'how-to-brief' }],
    ['/guides/category/tips', 'guideCategory', { slug: 'tips' }],
    ['/guides/author/sara', 'guideAuthor', { slug: 'sara' }],
    ['/terms', 'legal', { kind: 'terms', view: 'current' }],
    ['/terms/versions', 'legal', { kind: 'terms', view: 'versions' }],
    ['/terms/versions/2', 'legal', { kind: 'terms', view: 'version', version: '2' }],
    ['/terms/professional', 'legal', { kind: 'professional-terms', view: 'current' }],
    ['/terms/professional/versions/1', 'legal', { kind: 'professional-terms', view: 'version', version: '1' }],
    ['/privacy', 'legal', { kind: 'privacy', view: 'current' }],
    ['/privacy/versions', 'legal', { kind: 'privacy', view: 'versions' }],
    ['/studios', 'page', { slug: 'studios' }],
  ] as const)('%s is %s', (path, kind, params) => {
    expect(classifyPath(path)).toEqual({ kind, params, locale: null, path })
    expect(classifyPath(`/ar${path === '/' ? '' : path}`)).toEqual({ kind, params, locale: 'ar', path })
  })

  it('drops a trailing slash and decodes percent-encoded segments in params', () => {
    expect(classifyPath('/creators/')).toEqual({ kind: 'route', params: { route: '/creators' }, locale: null, path: '/creators' })
    const arabic = encodeURIComponent('استوديو')
    expect(classifyPath(`/ar/${arabic}`)).toEqual({ kind: 'page', params: { slug: 'استوديو' }, locale: 'ar', path: `/${arabic}` })
    expect(classifyPath('/%E0%A4%A')).toEqual({ kind: 'page', params: { slug: '%E0%A4%A' }, locale: null, path: '/%E0%A4%A' })
  })

  it.each([
    '/creators/0087/extra',
    '/book',
    '/work/a/b',
    '/hire',
    '/guides/a/b/c',
    '/guides/tag/x',
    '/terms/other',
    '/terms/versions/0',
    '/terms/versions/x',
    '/terms/versions/1/2',
    '/match/B-7K4Q2',
    '/match/B-7K4Q2/abc/other',
    '/q/B-7K4Q2',
    '/a/b',
    '/en',
    '/login/other',
  ])('%s has no app place', (path) => {
    expect(classifyPath(path)).toBeNull()
  })
})

describe('MR-US5-S4 private places are classified, never looked up', () => {
  it.each([
    ['/match/B-7K4Q2/abc', { ref: 'B-7K4Q2', key: 'abc' }],
    ['/match/B-7K4Q2/abc/details', { ref: 'B-7K4Q2', key: 'abc' }],
    ['/q/B-7K4Q2/abc', { ref: 'B-7K4Q2', key: 'abc' }],
    ['/account', {}],
    ['/account/bookings/x', {}],
  ])('%s is private', (path, params) => {
    expect(classifyPath(path)).toEqual({ kind: 'private', params, locale: null, path })
  })
})

describe('resolveRequestV1 refuses addresses that are not site paths', () => {
  it.each(['https://x', '//x', '/\\x', '/a/../b', '/a/./b', '/a?b', '/a#b', 'a', '', '/a b', `/${'a'.repeat(512)}`, '/x://y'])('refuses %j', (path) => {
    expect(isResolvablePath(path)).toBe(false)
    expect(resolveRequestV1.safeParse({ query: { path } }).success).toBe(false)
    expect(classifyPath(path)).toBeNull()
  })

  it('accepts a site path of 512 characters', () => {
    expect(resolveRequestV1.safeParse({ query: { path: `/${'a'.repeat(511)}` } }).success).toBe(true)
  })
})

describe('strippedPath', () => {
  it('removes the /ar prefix and keeps the encoding', () => {
    expect(strippedPath('/ar')).toEqual({ path: '/', locale: 'ar' })
    expect(strippedPath('/ar/%D8%A7/')).toEqual({ path: '/%D8%A7', locale: 'ar' })
    expect(strippedPath('/never-was')).toEqual({ path: '/never-was', locale: null })
  })
})

describe('MR-US5-S3 resolveV1', () => {
  it.each(['resolve-page', 'resolve-page.ar', 'resolve-removed', 'resolve-not-found'])('accepts %s', (name) => {
    expect(resolveV1.safeParse(example(name)).success).toBe(true)
  })

  it('refuses an unknown status, an /ar path and a page without a kind', () => {
    expect(resolveV1.safeParse({ status: 'redirect', path: '/a', locale: 'en' }).success).toBe(false)
    expect(resolveV1.safeParse({ status: 'notFound', path: '/ar/a', locale: 'ar' }).success).toBe(false)
    expect(resolveV1.safeParse({ status: 'page', path: '/a', locale: 'en', params: {} }).success).toBe(false)
  })
})
