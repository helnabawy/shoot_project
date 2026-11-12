import { legalDocumentV1, legalVersionsV1, legalVersionV1 } from '@shoot/domain/api/v1'
import { describe, expect, it } from 'vitest'
import { toWireRichText } from '@/shared/api/wire'
import type { LegalView } from './queries'
import { toWireLegalDocument, toWireLegalVersion, toWireLegalVersions } from './wire'

const base = 'https://shoot.example'
const ctx = { locale: 'en' as const, base }
const body = { root: { type: 'root', children: [{ type: 'paragraph', children: [{ type: 'text', text: 'Version two.', format: 0 }] }] } }

const view = (over: Partial<LegalView> = {}): LegalView => ({
  kind: 'terms',
  title: 'Terms & Conditions',
  version: 2,
  effectiveFrom: '2026-06-01T00:00:00.000Z',
  until: null,
  changeSummary: 'Clearer words',
  body,
  fallback: false,
  upcoming: null,
  hasEarlier: true,
  ...over,
})

describe('legal mappers', () => {
  it('MR-US4-S5 maps the version in force with its body as rich text and an upcoming version', () => {
    const wire = legalDocumentV1.parse(toWireLegalDocument(view({ upcoming: { version: 3, effectiveFrom: '2026-12-01T00:00:00.000Z' } }), ctx))
    expect(wire).toMatchObject({ locale: 'en', kind: 'terms', version: 2, until: null, inRequestedLanguage: true, upcoming: { version: 3 } })
    expect(wire.body).toEqual(toWireRichText(body, base))
    expect(wire).not.toHaveProperty('hasEarlier')
    expect(wire).not.toHaveProperty('changeSummary')
  })

  it('MR-US4-S5 a single version has no upcoming field and marks English fallback', () => {
    const wire = legalVersionV1.parse(toWireLegalVersion(view({ version: 1, until: '2026-06-01T00:00:00.000Z', fallback: true }), { ...ctx, locale: 'ar' }))
    expect(wire).toMatchObject({ locale: 'ar', version: 1, until: '2026-06-01T00:00:00.000Z', inRequestedLanguage: false })
    expect(wire).not.toHaveProperty('upcoming')
  })

  it('MR-US4-S5 lists versions with their periods and change summaries', () => {
    const wire = legalVersionsV1.parse(
      toWireLegalVersions(
        'terms',
        {
          title: 'Terms & Conditions',
          versions: [
            { version: 2, from: '2026-06-01T00:00:00.000Z', until: null, changeSummary: 'Clearer words' },
            { version: 1, from: '2026-01-01T00:00:00.000Z', until: '2026-06-01T00:00:00.000Z', changeSummary: '' },
          ],
        },
        ctx,
      ),
    )
    expect(wire.versions).toEqual([
      { version: 2, from: '2026-06-01T00:00:00.000Z', until: null, changeSummary: 'Clearer words' },
      { version: 1, from: '2026-01-01T00:00:00.000Z', until: '2026-06-01T00:00:00.000Z', changeSummary: null },
    ])
  })
})
