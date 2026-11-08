import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountLink, MemberLink, resetSession, type SessionUser } from './SessionNav'

const props = {
  loginHref: '/login',
  accountHref: '/account',
  loginLabel: 'Log in',
  accountLabel: 'My account',
}

function serve(user: SessionUser | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ user })),
  )
}

beforeEach(() => resetSession())
afterEach(() => vi.unstubAllGlobals())

describe('header session links', () => {
  it('shows "Log in" and no Bookings link to a visitor', async () => {
    serve(null)
    render(
      <>
        <MemberLink href="/account/bookings" label="Bookings" />
        <AccountLink {...props} />
      </>,
    )
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    expect(screen.queryByRole('link', { name: 'Bookings' })).toBeNull()
  })

  it('swaps "Log in" for the member’s avatar and adds Bookings once signed in', async () => {
    serve({ name: 'Mona Ali', avatarUrl: null })
    render(
      <>
        <MemberLink href="/account/bookings" label="Bookings" />
        <AccountLink {...props} />
      </>,
    )
    const avatar = await screen.findByRole('link', { name: 'My account: Mona Ali' })
    expect(avatar).toHaveAttribute('href', '/account')
    expect(avatar).toHaveTextContent('M')
    expect(screen.getByRole('link', { name: 'Bookings' })).toHaveAttribute(
      'href',
      '/account/bookings',
    )
    expect(screen.queryByRole('link', { name: 'Log in' })).toBeNull()
    // Both islands share one request.
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('uses the profile photo as the avatar when there is one', async () => {
    serve({ name: 'Mona Ali', avatarUrl: '/api/media/file/mona-400.webp' })
    const { container } = render(<AccountLink {...props} />)
    await screen.findByRole('link', { name: 'My account: Mona Ali' })
    expect(container.querySelector('img')).toHaveAttribute('src', '/api/media/file/mona-400.webp')
  })

  it('labels the phone-menu row with the account name', async () => {
    serve({ name: 'Mona Ali', avatarUrl: null })
    render(<AccountLink {...props} row />)
    expect(await screen.findByRole('link', { name: /My account/ })).toHaveAttribute(
      'href',
      '/account',
    )
  })
})

describe('visitor-only content', () => {
  it('keeps the join band for visitors and hides it from signed-in members', async () => {
    const { VisitorOnly } = await import('./SessionNav')
    serve(null)
    const { unmount } = render(
      <VisitorOnly>
        <p>Join as a professional</p>
      </VisitorOnly>,
    )
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledOnce())
    expect(screen.getByText('Join as a professional')).toBeInTheDocument()
    unmount()

    resetSession()
    serve({ name: 'Mona Ali', avatarUrl: null })
    render(
      <VisitorOnly>
        <p>Join as a professional</p>
      </VisitorOnly>,
    )
    await vi.waitFor(() => expect(screen.queryByText('Join as a professional')).toBeNull())
  })
})
