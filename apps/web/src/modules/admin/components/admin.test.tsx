import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ activePersonas: [] as unknown[], doc: { globalSlug: 'landing-page' } as Record<string, unknown> }))
vi.mock('@payloadcms/ui', () => ({
  useFormFields: (select: (args: [Record<string, { value: unknown }>]) => unknown) =>
    select([{ activePersonas: { value: state.activePersonas } }]),
  useDocumentInfo: () => state.doc,
}))

const { ActivePersonasWarning } = await import('./ActivePersonasWarning')
const { UntranslatedFields } = await import('./UntranslatedFields')
const { BriefsExport } = await import('./BriefsExport')
const { PersonasNote } = await import('./PersonasNote')

afterEach(() => vi.unstubAllGlobals())

describe('admin helpers', () => {
  it('FR-027 warns when no persona is active and stays quiet otherwise', () => {
    state.activePersonas = []
    const { rerender } = render(<ActivePersonasWarning />)
    expect(screen.getByRole('status')).toHaveTextContent('No persona is active')
    state.activePersonas = [1]
    rerender(<ActivePersonasWarning />)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('FR-038 lists fields with English but no Arabic', async () => {
    state.doc = { globalSlug: 'landing-page' }
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ hero: { headline: { en: 'You brief.', ar: '' } } }) }))
    vi.stubGlobal('fetch', fetchMock)
    render(<UntranslatedFields />)
    await waitFor(() => expect(screen.getByText(/show English on the Arabic site/)).toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/globals/landing-page?locale=all'), expect.anything())
    expect(screen.getByText('hero.headline')).toBeInTheDocument()
  })

  it('FR-038 confirms when every field is translated, for a collection document', async () => {
    state.doc = { collectionSlug: 'personas', id: 4 }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ singular: { en: 'Teacher', ar: 'معلّم' } }) })))
    render(<UntranslatedFields />)
    await waitFor(() => expect(screen.getByText(/also has Arabic/)).toBeInTheDocument())
  })

  it('renders nothing before a document exists', () => {
    state.doc = { collectionSlug: 'personas' }
    const { container } = render(<UntranslatedFields />)
    expect(container).toBeEmptyDOMElement()
  })

  it('FR-052 links the CSV export and explains persona activation', () => {
    render(
      <>
        <BriefsExport />
        <PersonasNote />
      </>,
    )
    expect(screen.getByRole('link', { name: 'Download CSV' })).toHaveAttribute('href', '/api/briefs/export.csv')
    expect(screen.getByRole('link', { name: /Site settings/ })).toHaveAttribute('href', '/admin/globals/site-settings')
  })
})
