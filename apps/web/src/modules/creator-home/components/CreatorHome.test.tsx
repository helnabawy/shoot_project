import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { CreatorHome } from './CreatorHome'
import { hrefs, liveHome, reasons, view } from './fixtures'

vi.mock('../actions', () => ({ answerBookingFromHome: vi.fn(), answerBriefFromHome: vi.fn() }))

const show = (v = view(), opts: { error?: string | null; declining?: string | null; locale?: 'en' | 'ar' } = {}) =>
  renderWithLocale(<CreatorHome view={v} locale={opts.locale ?? 'en'} hrefs={hrefs} error={opts.error ?? null} declining={opts.declining ?? null} />, { locale: opts.locale ?? 'en' })

describe('CH-US1-S1 the request card', () => {
  it('shows the booking request first, with its kind, deadline, title and labelled lines, and the position', () => {
    show()
    const card = screen.getByTestId('request-card')
    expect(card).toHaveAttribute('data-kind', 'booking')
    expect(within(card).getByText('Booking request')).toBeInTheDocument()
    expect(screen.getByTestId('card-deadline')).toHaveTextContent('Answer by 18:00')
    expect(screen.getByTestId('card-title')).toHaveTextContent('Wedding in Dubai')
    const lines = within(screen.getByTestId('card-lines'))
    for (const [label, value] of [['Date', 'Sat 28 Nov, 16:00'], ['Length', '4 hours'], ['Client', 'Sara M.'], ['Reference', 'Q-2026-0142']] as const) {
      expect(lines.getByText(label)).toBeInTheDocument()
      expect(lines.getByText(value)).toBeInTheDocument()
    }
    expect(screen.getByTestId('position')).toHaveTextContent('1 of 3')
  })

  it('has exactly two actions, Accept and Decline, and Accept is the page’s only red element', () => {
    const { container } = show()
    const card = within(screen.getByTestId('request-card'))
    expect(card.getAllByRole('button')).toHaveLength(1)
    expect(card.getByTestId('accept').tagName).toBe('BUTTON')
    expect(card.getByTestId('accept')).toHaveTextContent('Accept')
    expect(card.getByTestId('decline')).toHaveTextContent('Decline')
    expect(card.getByTestId('decline').tagName).toBe('A')
    expect(container.querySelectorAll('[class*="bg-primary "], [class*="bg-primary"]:not([class*="bg-primary-"])')).toHaveLength(1)
  })

  it('lists the following requests as plain rows marked Next, with no buttons', () => {
    show()
    const rows = screen.getAllByTestId('next-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Birthday party in Dubai')
    expect(rows[0]).toHaveTextContent('New brief')
    expect(rows[0]).toHaveTextContent('Next')
    for (const row of rows) expect(within(row).queryByRole('button')).toBeNull()
  })

  it('shows a brief as the card with its date, what is needed and when it was sent, never a client', () => {
    show(view({ queue: liveHome.queue.slice(1) }))
    const card = screen.getByTestId('request-card')
    expect(card).toHaveAttribute('data-kind', 'brief')
    expect(within(card).getByText('Needs')).toBeInTheDocument()
    expect(within(card).getByText('Sent')).toBeInTheDocument()
    expect(within(card).queryByText('Client')).toBeNull()
    expect(screen.queryByTestId('card-deadline')).toBeNull()
  })

  it('shows "To agree" for a brief with no date', () => {
    show(view({ queue: [liveHome.queue[2]!] }))
    expect(within(screen.getByTestId('card-lines')).getByText('To agree')).toBeInTheDocument()
  })

  it('offers a link to see all when more requests wait than the rows show', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ ...liveHome.queue[1]!, ref: `B-${i}` }))
    show(view({ queue: many, counts: { toAnswer: 9, comingUp: 0, completed: 0 } }))
    expect(screen.getAllByTestId('next-row')).toHaveLength(5)
    expect(within(screen.getByTestId('see-all')).getByRole('link')).toHaveAttribute('href', '/account/inbox')
    expect(screen.getByTestId('see-all')).toHaveTextContent('+3')
  })
})

describe('CH-US1-S5 what Accept does', () => {
  it('says so for a booking request', () => {
    show()
    expect(screen.getByTestId('card-note')).toHaveTextContent('Accepting adds the date to your calendar.')
  })

  it('says so for a brief, and for a brief with the client’s price it names the price and points to the inbox', () => {
    show(view({ queue: liveHome.queue.slice(1) }))
    expect(screen.getByTestId('card-note')).toHaveTextContent('shows you first when the client chooses')
    show(view({ queue: [{ ...liveHome.queue[1]!, budgetFils: 90_000 } as never] }))
    const note = screen.getAllByTestId('card-note')[1]!
    expect(note).toHaveTextContent('offers the client’s price'.replace('’', "'"))
    expect(within(note).getByRole('link')).toHaveAttribute('href', '/account/inbox')
    expect(within(screen.getAllByTestId('card-lines')[1]!).getByText('Client\'s price')).toBeInTheDocument()
  })
})

describe('CH-US1-S4 the reason step', () => {
  it('Decline links to the same page with the request’s step open', () => {
    show()
    expect(screen.getByTestId('decline')).toHaveAttribute('href', '/?decline=Q-2026-0142#answer')
    show(view({ queue: liveHome.queue.slice(1) }))
    expect(screen.getAllByTestId('decline')[1]).toHaveAttribute('href', '/?decline=B-7K2QX:1#answer')
  })

  it('for a booking it asks one optional reason, up to 200 characters, and offers Back without recording anything', () => {
    show(view(), { declining: 'Q-2026-0142' })
    const step = screen.getByTestId('decline-step')
    const reason = within(step).getByLabelText('Reason (optional)')
    expect(reason).toHaveAttribute('maxlength', '200')
    expect(reason).not.toBeRequired()
    expect(within(step).getByTestId('decline-confirm')).toHaveTextContent('Decline')
    expect(within(step).getByTestId('decline-back')).toHaveAttribute('href', '/')
    expect(screen.queryByTestId('accept')).toBeNull()
    expect(step.querySelector('input[name="decision"]')).toHaveValue('decline')
  })

  it('for a brief it lists the content reasons and an optional note, and rejects', () => {
    show(view({ queue: liveHome.queue.slice(1) }), { declining: 'B-7K2QX:1' })
    const step = screen.getByTestId('decline-step')
    for (const r of reasons) expect(within(step).getByLabelText(r.label)).toHaveAttribute('value', r.value)
    expect(within(step).getByLabelText('A note for our team (optional)')).toHaveAttribute('maxlength', '300')
    expect(step.querySelector('input[name="decision"]')).toHaveValue('reject')
    expect(step.querySelector('input[name="persona"]')).toHaveValue('1')
    expect(step.querySelector('input[name="ref"]')).toHaveValue('B-7K2QX')
  })

  it('opens only for the request it was asked for', () => {
    show(view(), { declining: 'Q-other' })
    expect(screen.queryByTestId('decline-step')).toBeNull()
    expect(screen.getByTestId('accept')).toBeInTheDocument()
  })

  it('shows a problem from the last answer', () => {
    show(view(), { error: 'That is not possible at this stage.' })
    expect(screen.getByRole('alert')).toHaveTextContent('not possible')
  })
})

describe('CH-US1-S7 nothing waiting', () => {
  it('says "You are up to date" with no Accept or Decline', () => {
    show(view({ queue: [], counts: { toAnswer: 0, comingUp: 1, completed: 4 } }))
    expect(screen.getByTestId('up-to-date')).toHaveTextContent('You are up to date')
    expect(screen.getByTestId('up-to-date')).toHaveTextContent('New requests show here as they arrive.')
    expect(screen.queryByTestId('accept')).toBeNull()
    expect(screen.queryByTestId('decline')).toBeNull()
    expect(screen.queryByTestId('position')).toBeNull()
  })
})

describe('CH-US3-S1 CH-US3-S6 who and the counts', () => {
  it('shows the name, professions, code and Live, and the three counts as links', () => {
    show()
    const summary = within(screen.getByTestId('home-summary'))
    expect(summary.getByRole('heading', { level: 1 })).toHaveTextContent('Omar K.')
    expect(summary.getByText(/Photographer/)).toBeInTheDocument()
    expect(summary.getByText('SH-0087')).toBeInTheDocument()
    expect(screen.getByTestId('home-status')).toHaveTextContent('Live')
    expect(screen.getByTestId('count-toAnswer')).toHaveAttribute('href', '#answer')
    expect(screen.getByTestId('count-comingUp')).toHaveAttribute('href', '/account/bookings')
    expect(screen.getByTestId('count-completed')).toHaveAttribute('href', '/account/bookings')
    expect(screen.getByTestId('count-toAnswer')).toHaveTextContent('3')
    expect(screen.getByTestId('count-completed')).toHaveTextContent('4')
  })

  it('shows zeros as 0 and invents nothing', () => {
    show(view({ queue: [], next: null, counts: { toAnswer: 0, comingUp: 0, completed: 0 } }))
    for (const key of ['toAnswer', 'comingUp', 'completed']) expect(screen.getByTestId(`count-${key}`)).toHaveTextContent('0')
    expect(screen.queryByTestId('next-shoot')).toBeNull()
  })

  it('shows a photo when there is one', () => {
    show(view({ photo: { alt: 'Omar', width: 480, height: 480, sizes: [{ url: 'https://shoot.example/o.jpg', width: 480, height: 480 }] } as never }))
    expect(within(screen.getByTestId('home-summary')).getByRole('img', { name: 'Omar' })).toHaveAttribute('src', 'https://shoot.example/o.jpg')
  })
})

describe('CH-US3-S3 CH-US3-S4 CH-US3-S5 next shoot and manage', () => {
  it('shows the nearest booking as one row that opens it, with its payment state', () => {
    show()
    const next = within(screen.getByTestId('next-shoot'))
    expect(next.getByTestId('next-shoot-link')).toHaveAttribute('href', '/account/bookings/Q-2026-0131')
    expect(next.getByText('Product shoot in Sharjah')).toBeInTheDocument()
    expect(next.getByText('Thu 19 Nov, 10:00 · 2 hours')).toBeInTheDocument()
    expect(next.getByText('Paid')).toBeInTheDocument()
  })

  it('leaves the section out when there is no upcoming booking', () => {
    show(view({ next: null }))
    expect(screen.queryByTestId('next-shoot')).toBeNull()
  })

  it('lists Bookings, Availability with today, and My profile', () => {
    show()
    const manage = within(screen.getByTestId('manage-rows'))
    expect(manage.getByTestId('manage-bookings')).toHaveAttribute('href', '/account/bookings')
    expect(manage.getByTestId('manage-availability')).toHaveTextContent('Free today')
    expect(manage.getByTestId('manage-profile')).toHaveAttribute('href', '/account/profile')
  })

  it('says Busy today for a blocked day and Booked today for a shoot day', () => {
    show(view({ today: 'blocked' }))
    expect(screen.getByTestId('manage-availability')).toHaveTextContent('Busy today')
    show(view({ today: 'booked' }))
    expect(screen.getAllByTestId('manage-availability')[1]).toHaveTextContent('Booked today')
  })
})

describe('CH-US4 a creator who is not live', () => {
  const notLive = (mode: 'incomplete' | 'review' | 'paused') =>
    view({ mode, counts: undefined, queue: [], next: null, needs: mode === 'incomplete' ? [{ step: 'samples', required: ['samples'], recommended: [] }, { step: 'places', required: [], recommended: ['cities'] }] : [] })

  it('CH-US4-S1 an incomplete profile: Not live yet, the missing steps and the one red action', () => {
    show(notLive('incomplete'))
    expect(screen.getByTestId('home-status')).toHaveTextContent('Not live yet')
    expect(screen.getByText('Clients can\'t find you yet')).toBeInTheDocument()
    const needs = within(screen.getByTestId('needs'))
    expect(needs.getByText('Work samples')).toBeInTheDocument()
    expect(needs.getByText('Missing')).toBeInTheDocument()
    expect(screen.getAllByText('6 of 7 steps done').length).toBeGreaterThan(0)
    expect(screen.getByTestId('steps-track')).toHaveAttribute('aria-label', '6 of 7 steps done')
    expect(screen.getByTestId('finish-profile')).toHaveAttribute('href', '/account/profile')
    expect(screen.getByTestId('finish-profile')).toHaveTextContent('Finish my profile')
  })

  it('CH-US4-S2 in review: the message and no primary action', () => {
    show(notLive('review'))
    expect(screen.getByTestId('home-status')).toHaveTextContent('In review')
    expect(screen.getByText('Our team is reviewing your profile')).toBeInTheDocument()
    expect(screen.queryByTestId('finish-profile')).toBeNull()
    expect(screen.queryByTestId('open-profile')).toBeNull()
  })

  it('CH-US4-S5 hidden: the message, a link to the profile, no queue and no primary action', () => {
    show(notLive('paused'))
    expect(screen.getByTestId('home-status')).toHaveTextContent('Hidden')
    expect(screen.getByText('Your profile is hidden')).toBeInTheDocument()
    expect(screen.getByTestId('open-profile')).toHaveAttribute('href', '/account/profile')
    expect(screen.queryByTestId('finish-profile')).toBeNull()
  })

  it('CH-US4-S3 shows no queue, counts or answers, and leaves Bookings out of Manage', () => {
    for (const mode of ['incomplete', 'review', 'paused'] as const) {
      const { unmount } = show(notLive(mode))
      expect(screen.queryByTestId('home-counts')).toBeNull()
      expect(screen.queryByTestId('request-card')).toBeNull()
      expect(screen.queryByTestId('accept')).toBeNull()
      expect(screen.queryByTestId('up-to-date')).toBeNull()
      expect(screen.queryByTestId('manage-bookings')).toBeNull()
      expect(screen.getByTestId('manage-availability')).toBeInTheDocument()
      expect(screen.getByTestId('manage-profile')).toBeInTheDocument()
      unmount()
    }
  })
})

describe('CH-US1-S1 in Arabic', () => {
  it('reads right to left with Arabic labels and Western digits', () => {
    show(view({ professions: ['مصوّر'], queue: [{ ...liveHome.queue[0]!, occasion: 'حفل زفاف', emirate: 'دبي', profession: 'مصوّر' } as never] }, 'ar'), { locale: 'ar' })
    expect(screen.getByTestId('accept')).toHaveTextContent('قبول')
    expect(screen.getByTestId('decline')).toHaveTextContent('اعتذار')
    expect(screen.getByTestId('card-title')).toHaveTextContent('حفل زفاف في دبي')
    expect(screen.getByTestId('position')).toHaveTextContent('1 من 1')
    expect(screen.getByTestId('home-status')).toHaveTextContent('منشور')
    expect(screen.getByTestId('count-toAnswer')).toHaveTextContent('بانتظار ردّك')
    expect(screen.getByTestId('card-note')).toHaveTextContent('تقويمك')
    expect(screen.getByTestId('card-deadline').textContent).toMatch(/ردّ قبل/)
  })
})
