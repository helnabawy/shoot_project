import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ id: 7 as number | undefined, profile: 3 as unknown }))
vi.mock('@payloadcms/ui', () => ({
  useDocumentInfo: () => ({ id: state.id, lastUpdateTime: 1 }),
  useFormFields: (select: (args: [Record<string, { value: unknown }>]) => unknown) => select([{ profile: { value: state.profile } }]),
}))

const { CreatorProfilesNote } = await import('./CreatorProfilesNote')
const { CreatorListingsNote } = await import('./CreatorListingsNote')
const { ProfileListingLink, ListingProfileLink } = await import('./CreatorLinks')

afterEach(() => vi.unstubAllGlobals())

describe('CP-US3-S2 / T062 admin review experience', () => {
  it('the profiles list says Publish verifies and Unpublish hides, and points to the review queue', () => {
    render(<CreatorProfilesNote />)
    const note = screen.getByTestId('profiles-note')
    expect(note).toHaveTextContent('Publish verifies a profile; Unpublish hides it.')
    expect(screen.getByRole('link', { name: 'Creator listings' })).toHaveAttribute('href', '/admin/collections/creator-listings')
    expect(screen.getByRole('link', { name: 'Awaiting review' }).getAttribute('href')).toContain('[submittedAt][exists]=true')
  })

  it('the listings list has the four filters and says standing never publishes pending edits', () => {
    render(<CreatorListingsNote />)
    expect(screen.getByTestId('listings-note')).toHaveTextContent('never publish a creator’s pending edits')
    const hrefs = Object.fromEntries(screen.getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href')]))
    expect(hrefs['Awaiting review']).toContain('[submittedAt][exists]=true')
    expect(hrefs['Suspended']).toContain('[suspended][equals]=true')
    expect(hrefs['Featured']).toContain('[featured][equals]=true')
    expect(hrefs['Paused by the creator']).toContain('[active][equals]=false')
    expect(hrefs['Everyone']).toBe('/admin/collections/creator-listings')
    expect(hrefs['Creator profiles']).toBe('/admin/collections/creator-profiles')
  })

  it('a profile links to its listing once it is found, and shows nothing before that', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ docs: [{ id: 42 }] }) }))
    vi.stubGlobal('fetch', fetchMock)
    render(<ProfileListingLink />)
    expect(screen.queryByTestId('profile-listing-link')).toBeNull()
    await waitFor(() => expect(screen.getByRole('link', { name: /Open this creator’s listing/ })).toHaveAttribute('href', '/admin/collections/creator-listings/42'))
    expect(fetchMock).toHaveBeenCalledWith('/api/creator-listings?where[profile][equals]=7&limit=1&depth=0', { credentials: 'include' })
  })

  it('a new, unsaved profile or a failed lookup shows no link', async () => {
    state.id = undefined
    const unsaved = vi.fn()
    vi.stubGlobal('fetch', unsaved)
    const first = render(<ProfileListingLink />)
    expect(unsaved).not.toHaveBeenCalled()
    expect(first.container).toBeEmptyDOMElement()
    first.unmount()

    state.id = 7
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, json: async () => ({}) })))
    const second = render(<ProfileListingLink />)
    await waitFor(() => expect(second.container).toBeEmptyDOMElement())
  })

  it('a listing links back to its profile, from an id or a populated relation', () => {
    state.profile = 3
    const first = render(<ListingProfileLink />)
    expect(screen.getByRole('link', { name: /Open the profile/ })).toHaveAttribute('href', '/admin/collections/creator-profiles/3')
    first.unmount()
    state.profile = { id: 9 }
    const second = render(<ListingProfileLink />)
    expect(screen.getByRole('link', { name: /Open the profile/ })).toHaveAttribute('href', '/admin/collections/creator-profiles/9')
    second.unmount()
    state.profile = null
    expect(render(<ListingProfileLink />).container).toBeEmptyDOMElement()
  })
})
