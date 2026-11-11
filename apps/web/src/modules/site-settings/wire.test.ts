import { siteV1 } from '@shoot/domain/api/v1'
import type { Persona } from '@shoot/domain/personas'
import { describe, expect, it } from 'vitest'
import type { SiteSetting } from '@/payload-types'
import { toWireSite } from './wire'

const ctx = { locale: 'en' as const, base: 'https://shoot.example' }
const personas: Persona[] = [
  { id: '1', slug: 'photographer', singular: 'Photographer', plural: 'Photographers', order: 1, active: true },
  { id: '2', slug: 'videographer', singular: 'Videographer', plural: 'Videographers', order: 2, active: true },
]

function settings(over: Partial<SiteSetting> = {}): SiteSetting {
  return {
    id: 1,
    siteName: 'Shoot Project',
    logo: {
      id: 4,
      alt: 'Shoot',
      url: '/api/media/file/logo.png',
      width: 400,
      height: 100,
      uploadedBy: 9,
      updatedAt: '',
      createdAt: '',
    },
    logoDark: null,
    whatsappNumber: '+971500000000',
    whatsappDefaultMessage: "Hi! I'd like to book a shoot.",
    expectedReplyTime: 'shortly',
    phoneNumber: '+97141234567',
    contactEmail: 'hello@shoot.example',
    social: [
      { platform: 'instagram', url: 'https://instagram.com/shoot' },
      { platform: 'x', url: 'javascript:alert(1)' },
    ],
    activePersonas: [1, 2],
    labels: { seekerLabel: 'I need a {persona.singular}', providerLabel: "I'm a {persona.singular}" },
    footerGroups: [{ key: 'company', label: 'Company' }],
    creatorCodePrefix: 'SH',
    autoPublishEdits: true,
    directoryPageSize: 24,
    briefLimitPerHour: 5,
    quickMatch: {
      enabled: true,
      quotationValidDays: 7,
      quoteLimitPerHour: 3,
      channels: { client: ['whatsapp'], creator: ['email'], admin: ['in-app'] },
      templates: [{ event: 'quoted', audience: 'client', text: 'Your quote {reference}' }],
    },
    ...over,
  }
}

describe('toWireSite', () => {
  it('MR-US1-S6 sends no internal setting and keeps quickMatchEnabled', () => {
    const doc = { ...settings(), translationStatus: 'complete' } as SiteSetting
    const wire = siteV1.parse(toWireSite(doc, personas, ctx))
    const json = JSON.stringify(wire)
    for (const name of ['briefLimitPerHour', 'autoPublishEdits', 'translationStatus', 'templates', 'channels', 'directoryPageSize', 'activePersonas', 'footerGroups', 'quoteLimitPerHour', 'uploadedBy']) {
      expect(json).not.toContain(name)
    }
    expect(json).not.toContain('Your quote')
    expect(wire.quickMatchEnabled).toBe(true)
    expect(Object.keys(wire).sort()).toEqual(Object.keys(siteV1.shape).sort())
  })

  it('MR-US1-S1 maps contact details, social links and the brand', () => {
    const wire = siteV1.parse(toWireSite(settings(), personas, ctx))
    expect(wire.whatsapp).toEqual({ number: '+971500000000', defaultMessage: "Hi! I'd like to book a shoot.", expectedReplyTime: 'shortly' })
    expect(wire.phone).toBe('+97141234567')
    expect(wire.social).toEqual([{ label: 'instagram', url: 'https://instagram.com/shoot' }])
    expect(wire.creatorCodePrefix).toBe('SH')
    expect(wire.logo?.sizes[0]?.url).toBe('https://shoot.example/api/media/file/logo.png')
    expect(wire.logoDark).toBeNull()
  })

  it('MR-US1-S4 fills the persona placeholders in the account labels', () => {
    const wire = toWireSite(settings(), personas, ctx)
    expect(wire.labels).toEqual({ seeker: 'I need a Photographer', provider: "I'm a Photographer" })
  })

  it('sends null for unset or invalid values, and labels null without an audience', () => {
    const wire = siteV1.parse(
      toWireSite(
        settings({ whatsappNumber: '0500', whatsappDefaultMessage: '', expectedReplyTime: null, phoneNumber: null, contactEmail: null, social: null, labels: {}, creatorCodePrefix: null, quickMatch: {} }),
        [],
        ctx,
      ),
    )
    expect(wire.whatsapp).toEqual({ number: null, defaultMessage: null, expectedReplyTime: null })
    expect(wire.phone).toBeNull()
    expect(wire.social).toEqual([])
    expect(wire.labels).toEqual({ seeker: null, provider: null })
    expect(wire.creatorCodePrefix).toBe('CR')
    expect(wire.quickMatchEnabled).toBe(false)
    expect(toWireSite(settings(), [], ctx).labels).toEqual({ seeker: null, provider: null })
  })
})
