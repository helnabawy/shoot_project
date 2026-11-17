import { describe, expect, it } from 'vitest'
import { briefDedupeKey, dedupeKey, NOTIFICATION_EVENTS, NOTIFICATION_PLACEHOLDERS, notificationsFor, renderTemplate } from './notifications'

describe('QM-FR-006 notifications per state change', () => {
  it.each([
    ['quoted', ['client', 'admin']],
    ['accepted', ['client', 'creator', 'admin']],
    ['confirmed', ['client', 'admin']],
    ['declined', ['client', 'admin']],
    ['lapsed', ['client', 'admin']],
    ['paid', ['client', 'creator']],
    ['scheduled', ['client', 'creator']],
    ['delivered', ['client']],
    ['completed', ['creator', 'admin']],
    ['on-hold', ['client', 'admin']],
    ['cancelled', ['client', 'creator', 'admin']],
    ['expired', ['client']],
    ['delivery-overdue', ['admin']],
  ] as const)('%s → %j', (event, audiences) => {
    expect(notificationsFor(event)).toEqual(audiences)
  })

  it('every event has at least one audience', () => {
    for (const event of NOTIFICATION_EVENTS) expect(notificationsFor(event).length).toBeGreaterThan(0)
  })

  it('renders known placeholders and drops unknown or empty ones', () => {
    expect(renderTemplate('Hi {name}, your quotation {reference} is ready.', { name: 'Sara', reference: 'Q-22222' })).toBe('Hi Sara, your quotation Q-22222 is ready.')
    expect(renderTemplate('Hi {name}, {missing} see {link}', { name: undefined, link: 'https://x' })).toBe('Hi, see https://x')
    expect(renderTemplate('{a} {b}', { a: null })).toBe('')
  })

  it('documents the placeholders a template may use', () => {
    expect(NOTIFICATION_PLACEHOLDERS).toEqual(['name', 'reference', 'date', 'total', 'link', 'occasion', 'type', 'emirate', 'creator', 'reason', 'price', 'area'])
  })

  it('dedupe keys are stable and distinguish every part', () => {
    expect(dedupeKey(1, 3, 'paid', 'client', 'whatsapp')).toBe('1:3:paid:client:whatsapp:')
    expect(dedupeKey('1', 3, 'paid', 'creator', 'in-app', '7')).toBe('1:3:paid:creator:in-app:7')
  })
})

describe('BI-US4-S6 brief notifications are keyed by brief, not booking revision', () => {
  it('who hears about brief events', () => {
    expect(notificationsFor('brief-accepted')).toEqual(['client', 'admin'])
    expect(notificationsFor('brief-new')).toEqual(['creator'])
    // PY-US3-S3: an unexpected online payment alerts the team only.
    expect(notificationsFor('payment-attention')).toEqual(['admin'])
  })

  it('one key per brief, event, audience, channel and recipient', () => {
    expect(briefDedupeKey(7, 'brief-new', 'creator', 'push', '12')).toBe('brief:7:brief-new:creator:push:12')
    expect(briefDedupeKey(7, 'brief-accepted', 'admin', 'in-app')).toBe('brief:7:brief-accepted:admin:in-app:')
  })
})

describe('022 offer events', () => {
  it('offer-new goes to the client; declined and lost to the creator', () => {
    expect(notificationsFor('offer-new')).toEqual(['client'])
    expect(notificationsFor('offer-declined')).toEqual(['creator'])
    expect(notificationsFor('offer-lost')).toEqual(['creator'])
  })
  it('each offer change has its own brief dedupe key', () => {
    expect(briefDedupeKey(7, 'offer-new', 'client', 'push', '3', { answerId: 11, revisions: 2 })).toBe('brief:7:offer-new:client:push:3:11:2')
    expect(briefDedupeKey(7, 'brief-new', 'creator', 'push', '3')).toBe('brief:7:brief-new:creator:push:3')
  })
})
