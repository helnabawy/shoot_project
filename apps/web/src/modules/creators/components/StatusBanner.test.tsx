import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'

const setProfileActive = vi.fn(async (_prev: unknown, _form: FormData) => ({ status: 'saved' as const, published: false }))
vi.mock('../actions', () => ({ setProfileActive: (prev: unknown, form: FormData) => setProfileActive(prev, form) }))

const { StatusBanner } = await import('./StatusBanner')

const props = { autoPublish: false, reviewNote: '', displayCode: 'CR-7K4Q2', viewHref: '/creators/7k4q2', whatsappHref: 'https://wa.me/971500000000', locale: 'en' }
const render = (over: Partial<Parameters<typeof StatusBanner>[0]> = {}, locale: 'en' | 'ar' = 'en') =>
  renderWithLocale(<StatusBanner status="live" {...props} {...over} locale={locale} />, { locale })

describe('CP-US3-S2 status banner', () => {
  beforeEach(() => setProfileActive.mockClear())

  it.each([
    ['draft', 'Draft', 'Only you can see this'],
    ['in-review', 'Waiting for review', 'Our team will look at it'],
    ['live', 'Live', 'The public sees this profile.'],
    ['live-with-changes', 'Live, with changes waiting', 'Your newer changes are waiting for review'],
    ['paused', 'Hidden by you', 'Nobody can see your profile until you show it again'],
    ['suspended', 'Hidden by our team', 'Message us if you have questions'],
  ] as const)('says in words what the public sees: %s', (status, title, body) => {
    render({ status })
    const banner = screen.getByTestId('profile-status')
    expect(banner).toHaveAttribute('data-status', status)
    expect(banner).toHaveTextContent(title)
    expect(banner).toHaveTextContent(body)
  })

  it('a live profile that goes live on every save says so', () => {
    render({ status: 'live', autoPublish: true })
    expect(screen.getByTestId('profile-status')).toHaveTextContent('Your changes go live as soon as you save.')
  })

  it('shows the admin\'s note, and the code to quote to us', () => {
    render({ reviewNote: 'Please add a wedding sample' })
    expect(screen.getByTestId('profile-review-note')).toHaveTextContent('From the team')
    expect(screen.getByTestId('profile-review-note')).toHaveTextContent('Please add a wedding sample')
    expect(screen.getByText('CR-7K4Q2').closest('bdi')).toHaveAttribute('dir', 'ltr')
  })

  it('omits the note and the code when there are none', () => {
    render({ reviewNote: '', displayCode: null })
    expect(screen.queryByTestId('profile-review-note')).toBeNull()
    expect(screen.queryByText('Your code')).toBeNull()
  })

  it('a live profile can be viewed publicly; hiding asks once in place, then posts "off"', async () => {
    const user = userEvent.setup()
    render({ status: 'live-with-changes' })
    expect(screen.getByTestId('profile-view-public')).toHaveAttribute('href', '/creators/7k4q2')
    // The disclosure is closed: nothing has been hidden and the question is not yet asked.
    expect(screen.getByTestId('profile-pause-details')).not.toHaveAttribute('open')
    await user.click(screen.getByTestId('profile-pause'))
    expect(screen.getByTestId('profile-pause-details')).toHaveAttribute('open')
    expect(setProfileActive).not.toHaveBeenCalled()
    expect(screen.getByText('Hide your profile from the site now?')).toBeInTheDocument()
    await user.click(screen.getByTestId('profile-pause-confirm'))
    const form = setProfileActive.mock.calls[0]![1] as FormData
    expect(form.get('active')).toBe('false')
    expect(form.get('locale')).toBe('en')
  })

  it('a hidden profile offers to show it again and has no public link', async () => {
    const user = userEvent.setup()
    render({ status: 'paused', viewHref: null })
    expect(screen.queryByTestId('profile-view-public')).toBeNull()
    await user.click(screen.getByTestId('profile-pause'))
    expect(screen.getByTestId('profile-pause')).toHaveTextContent('Show my profile')
    expect((setProfileActive.mock.calls[0]![1] as FormData).get('active')).toBe('true')
  })

  it('a draft or one in review has nothing to hide or view', () => {
    for (const status of ['draft', 'in-review'] as const) {
      const { unmount } = render({ status, viewHref: null })
      expect(screen.queryByTestId('profile-pause')).toBeNull()
      expect(screen.queryByTestId('profile-view-public')).toBeNull()
      unmount()
    }
  })

  it('a suspended profile offers no action but WhatsApp', () => {
    render({ status: 'suspended', viewHref: null })
    expect(screen.queryByTestId('profile-pause')).toBeNull()
    expect(screen.getByRole('link', { name: 'Message us on WhatsApp' })).toHaveAttribute('href', 'https://wa.me/971500000000')
  })

  it('a suspended profile without a WhatsApp number shows no contact row', () => {
    render({ status: 'suspended', viewHref: null, whatsappHref: null })
    expect(screen.queryByRole('link', { name: /WhatsApp/ })).toBeNull()
  })

  it('is fully Arabic in Arabic', () => {
    render({ status: 'in-review', viewHref: null }, 'ar')
    expect(screen.getByTestId('profile-status')).toHaveTextContent('بانتظار المراجعة')
    expect(document.querySelector('[dir="rtl"]')).not.toBeNull()
  })
})
