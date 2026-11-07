import { NextRequest } from 'next/server'
import { describe, expect, it, vi } from 'vitest'

const seen: Request[] = []
vi.mock('next-intl/middleware', () => ({
  default: () => (request: Request) => {
    seen.push(request)
    return new Response(null, { status: 200 })
  },
}))

const { default: proxy, config } = await import('./proxy')

describe('MP-US5-S2 proxy', () => {
  it('forwards the requested path to the page as x-pathname and still hands the request to locale negotiation', () => {
    proxy(new NextRequest('http://localhost:3000/ar/studios?x=1', { headers: { 'accept-language': 'ar' } }))
    proxy(new NextRequest('http://localhost:3000/studios'))
    expect(seen.map((r) => r.headers.get('x-pathname'))).toEqual(['/ar/studios', '/studios'])
    expect(seen[0]?.headers.get('accept-language')).toBe('ar')
  })

  it('keeps skipping Payload, previews, internals and files', () => {
    const matcher = new RegExp(`^${config.matcher[0]}$`)
    for (const path of ['/studios', '/ar/guides', '/hire/x', '/']) expect(matcher.test(path), path).toBe(true)
    for (const path of ['/admin/x', '/api/pages', '/next/preview', '/_next/static/a.js', '/robots.txt', '/guides/feed.xml']) expect(matcher.test(path), path).toBe(false)
  })
})
