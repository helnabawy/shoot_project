import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { item, reasons } from './fixtures'
import { InboxList } from './InboxList'

vi.mock('../actions', () => ({ answerBriefAction: vi.fn(), withdrawBriefAction: vi.fn() }))

describe('BI-US2-S1 the website inbox', () => {
  it('lists waiting briefs with one red "I can do this", then what the creator said yes to and what is not for them', () => {
    renderWithLocale(
      <InboxList
        locale="en"
        inbox={{
          open: [item(), item({ ref: 'B-9QX4M', date: null, dateLabel: '', emirate: 'Abu Dhabi' })],
          accepted: [item({ ref: 'B-ACC01', answer: 'accepted' }), item({ ref: 'B-ACC02', answer: 'accepted', outcome: 'other-creator' })],
          rejected: [item({ ref: 'B-REJ01', answer: 'rejected', reason: 'too-far' })],
          reasons,
        }}
      />,
    )
    const cards = screen.getAllByTestId('inbox-brief')
    expect(cards).toHaveLength(2)
    expect(within(cards[0]!).getByText('Fri 20 Nov · Dubai')).toBeInTheDocument()
    expect(within(cards[1]!).getByText('Date to agree · Abu Dhabi')).toBeInTheDocument()
    const accepts = screen.getAllByTestId('inbox-accept')
    expect(accepts[0]!.tagName).toBe('BUTTON')
    expect(accepts[0]).toHaveTextContent('I can do this')
    expect(accepts[0]!.className).not.toBe(accepts[1]!.className)
    const yes = screen.getAllByTestId('inbox-accepted')
    expect(within(yes[0]!).getByText('Client choosing')).toBeInTheDocument()
    expect(within(yes[0]!).getByTestId('inbox-withdraw')).toBeInTheDocument()
    expect(within(yes[1]!).getByText('Went to someone else')).toBeInTheDocument()
    expect(within(yes[1]!).queryByTestId('inbox-withdraw')).toBeNull()
    expect(within(screen.getByTestId('inbox-rejected')).getByText('Too far')).toBeInTheDocument()
    expect(screen.getByTestId('inbox-undo')).toHaveTextContent('Undo')
  })

  it('an empty inbox says so, in Arabic too', () => {
    renderWithLocale(<InboxList locale="ar" inbox={{ open: [], accepted: [], rejected: [], reasons: [] }} />, { locale: 'ar' })
    expect(screen.getByTestId('inbox-empty')).toHaveTextContent('لا توجد طلبات جديدة تناسبك الآن.')
  })
})
