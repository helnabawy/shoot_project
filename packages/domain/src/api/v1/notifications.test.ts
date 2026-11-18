import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { endpoints } from './endpoints'
import { noticeIdParamV1, noticesV1, noticeV1 } from './notifications'

const example = (name: string): unknown => JSON.parse(readFileSync(join(import.meta.dirname, 'examples', `${name}.json`), 'utf8'))
const notice = { id: '7', event: 'accepted', audience: 'creator', ref: 'B-1', path: '/account/bookings', createdAt: '2026-11-12T07:00:00.000Z', read: false }

describe('NT-US1-S1 a member’s notices', () => {
  it('read the examples, newest first, read and unread', () => {
    const list = noticesV1.parse(example('notices'))
    expect(list.items.map((n) => n.read)).toEqual([false, false, true])
    expect(list.unread).toBe(2)
    expect(noticesV1.parse(example('notices-read')).unread).toBe(0)
  })

  it('carry a site path or none, never an absolute address', () => {
    expect(noticeV1.safeParse(notice).success).toBe(true)
    expect(noticeV1.safeParse({ ...notice, path: null, ref: null }).success).toBe(true)
    expect(noticeV1.safeParse({ ...notice, path: 'https://shoot.ae/account' }).success).toBe(false)
  })

  it('are a client’s or a creator’s, never an admin’s', () => {
    expect(noticeV1.safeParse({ ...notice, audience: 'client' }).success).toBe(true)
    expect(noticeV1.safeParse({ ...notice, audience: 'admin' }).success).toBe(false)
  })

  it('are marked read by a numeric id', () => {
    expect(noticeIdParamV1.safeParse({ id: '12' }).success).toBe(true)
    expect(noticeIdParamV1.safeParse({ id: 'x' }).success).toBe(false)
  })

  it('are signed-in, never cached reads', () => {
    expect(endpoints.notices).toMatchObject({ method: 'GET', auth: 'required', cache: 'no-store', path: '/api/mobile/v1/me/notifications' })
    expect(endpoints.noticeRead).toMatchObject({ method: 'POST', auth: 'required', path: '/api/mobile/v1/me/notifications/{id}/read' })
  })
})
