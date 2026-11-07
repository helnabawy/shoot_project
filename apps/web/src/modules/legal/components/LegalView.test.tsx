import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next-intl/server', () => import('../../../../tests/setup/server-intl'))

const { LegalView } = await import('./LegalView')
const { VersionList } = await import('./VersionList')

const body = (text: string) => ({ root: { type: 'root', version: 1, direction: 'ltr', format: '', indent: 0, children: [{ type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, children: [{ type: 'text', text, version: 1, format: 0, detail: 0, mode: 'normal', style: '' }] }] } })

const view = {
  kind: 'terms' as const,
  title: 'Terms & Conditions',
  version: 2,
  effectiveFrom: '2026-11-01T00:00:00.000Z',
  until: null,
  changeSummary: null,
  body: body('The terms text'),
  fallback: false,
  upcoming: null,
  hasEarlier: true,
}

describe('MP-US2-S5 LegalView', () => {
  it('shows the title as the one h1, the version with its localised date and the archive link', async () => {
    render(await LegalView({ view, locale: 'en', basePath: '/terms' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Terms & Conditions' })).toBeInTheDocument()
    expect(screen.getByText(/Version 2 · applies from November 1, 2026/)).toBeInTheDocument()
    expect(screen.getByText('The terms text')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Earlier versions' })).toHaveAttribute('href', '/terms/versions')
  })

  it('MP-US2-S3 announces a version that applies later and keeps the current one in force', async () => {
    render(await LegalView({ view: { ...view, upcoming: { version: 3, effectiveFrom: '2027-01-01T00:00:00.000Z' } }, locale: 'en', basePath: '/terms' }))
    expect(screen.getByRole('note')).toHaveTextContent('Version 3 applies from January 1, 2027. Until then this version stays in force.')
  })

  it('MP-US2-S5 in Arabic without Arabic text it shows the English text, marked as English, under a notice in Arabic', async () => {
    render(await LegalView({ view: { ...view, fallback: true }, locale: 'ar', basePath: '/terms' }))
    const notice = screen.getByRole('note')
    expect(notice).toHaveTextContent('النص العربي غير متاح بعد')
    expect(notice).not.toHaveAttribute('lang')
    expect(screen.getByText('The terms text').closest('[lang="en"]')).toHaveAttribute('dir', 'ltr')
  })

  it('MP-US2-S5 in Arabic with Arabic text it says the English text governs', async () => {
    render(await LegalView({ view, locale: 'ar', basePath: '/terms' }))
    expect(screen.getByRole('note')).toHaveTextContent('يُعتد بالنص الإنجليزي')
  })

  it('MP-US2-S4 an earlier version is shown as it stood, with its period and a way to all versions', async () => {
    render(await LegalView({ view: { ...view, version: 1, until: '2026-11-01T00:00:00.000Z', effectiveFrom: '2026-01-01T00:00:00.000Z' }, locale: 'en', basePath: '/terms', archive: true }))
    expect(screen.getByText(/Version 1 · applied from January 1, 2026 until November 1, 2026/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All versions' })).toHaveAttribute('href', '/terms/versions')
  })

  it('MP-US2-S4 the version list shows every version with its period, newest first', async () => {
    render(
      await VersionList({
        title: 'Terms & Conditions',
        basePath: '/terms',
        locale: 'en',
        versions: [
          { version: 2, from: '2026-11-01T00:00:00.000Z', until: null, changeSummary: 'Shorter' },
          { version: 1, from: '2026-01-01T00:00:00.000Z', until: '2026-11-01T00:00:00.000Z', changeSummary: null },
        ],
      }),
    )
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Version 2')
    expect(items[0]).toHaveTextContent('now')
    expect(items[0]).toHaveTextContent('Shorter')
    expect(screen.getByRole('link', { name: 'Version 1' })).toHaveAttribute('href', '/terms/versions/1')
  })
})
