import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import proxy from './proxy'

const b64url = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
const token = (claims: Record<string, unknown>) => `${b64url({ alg: 'HS256' })}.${b64url(claims)}.sig`

function request(path: string, cookies: Record<string, string> = {}) {
  const cookie = Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ')
  return new NextRequest(`http://localhost${path}`, { headers: cookie ? { cookie } : {} })
}
const provider = { 'payload-token': token({ id: 1, collection: 'users', accountType: 'provider', roles: ['member'] }) }
const rewriteOf = (res: Response) => res.headers.get('x-middleware-rewrite')?.replace('http://localhost', '') ?? null

describe('CH-US2-S1 a creator’s home address shows the creator home', () => {
  it('swaps / for the creator home, and /ar for its Arabic one, keeping the visitor’s address', () => {
    expect(rewriteOf(proxy(request('/', provider)))).toBe('/en/creator-home')
    expect(rewriteOf(proxy(request('/ar', provider)))).toBe('/ar/creator-home')
  })

  it('carries the query to the creator home: the open reason step and a refused answer', () => {
    expect(rewriteOf(proxy(request('/?decline=B-1%3A1', provider)))).toBe('/en/creator-home?decline=B-1%3A1')
    expect(rewriteOf(proxy(request('/ar?error=booking.errors.not-allowed', provider)))).toBe('/ar/creator-home?error=booking.errors.not-allowed')
  })

  it('tells the page which path the visitor asked for', () => {
    const res = proxy(request('/', provider))
    expect(res.headers.get('x-middleware-override-headers')).toContain('x-pathname')
    expect(res.headers.get('x-middleware-request-x-pathname')).toBe('/')
    expect(proxy(request('/ar', provider)).headers.get('x-middleware-request-x-pathname')).toBe('/ar')
  })

  it('keeps the alternate-language links of the address the visitor asked for', () => {
    for (const path of ['/', '/ar']) {
      const link = proxy(request(path, provider)).headers.get('link') ?? ''
      expect(link, path).not.toContain('creator-home')
      expect(link, path).toBe(proxy(request(path, {})).headers.get('link') ?? '')
    }
  })

  it('treats an editor who is also a creator as a creator', () => {
    const both = { 'payload-token': token({ accountType: 'provider', roles: ['member', 'editor'] }) }
    expect(rewriteOf(proxy(request('/', both)))).toBe('/en/creator-home')
  })
})

describe('CH-US2-S2 everyone else keeps the landing untouched', () => {
  const landing = (path: string, cookies: Record<string, string>) => rewriteOf(proxy(request(path, cookies)))

  it('does not swap for a guest, a client, an editor or an admin', () => {
    expect(landing('/', {})).toBe('/en')
    expect(landing('/', { 'payload-token': token({ accountType: 'seeker', roles: ['member'] }) })).toBe('/en')
    expect(landing('/', { 'payload-token': token({ roles: ['editor'] }) })).toBe('/en')
    expect(landing('/', { 'payload-token': token({ accountType: 'seeker', roles: ['admin'] }) })).toBe('/en')
    expect(landing('/ar', {})).toBeNull()
  })

  it('does not swap for a malformed token', () => {
    expect(landing('/', { 'payload-token': 'not-a-token' })).toBe('/en')
    expect(landing('/', { 'payload-token': 'a.b.c' })).toBe('/en')
  })

  it('does not swap when the client page is asked for', () => {
    expect(landing('/?view=client', provider)).toBe('/en?view=client')
    expect(landing('/ar?view=client', provider)).toBeNull()
  })

  it('CH-US2-S5 does not swap any other path, so a link or a push to a page still opens that page', () => {
    expect(landing('/account', provider)).toBe('/en/account')
    expect(landing('/creators', provider)).toBe('/en/creators')
    expect(landing('/creator-home', provider)).toBe('/en/creator-home')
    expect(landing('/ar/account', provider)).toBeNull()
    expect(landing('/ar/creator-home', provider)).toBeNull()
  })

  it('leaves a locale redirect to next-intl: a creator who prefers Arabic is sent to /ar first', () => {
    const res = proxy(request('/', { ...provider, NEXT_LOCALE: 'ar' }))
    expect(res.status).toBeGreaterThanOrEqual(300)
    expect(res.status).toBeLessThan(400)
    expect(res.headers.get('location')).toContain('/ar')
  })
})
