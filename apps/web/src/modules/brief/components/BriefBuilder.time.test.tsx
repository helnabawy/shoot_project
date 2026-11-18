import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { briefBuilderFixture } from '../../../../tests/fixtures/brief-builder'
import { testBriefLabels } from '../../../../tests/fixtures/labels'
import { renderWithLocale } from '../../../../tests/setup/render'
import type { OptionSet } from '@/payload-types'
import { withBriefTime } from '../config'
import { BriefBuilder } from './BriefBuilder'

const submitBrief = vi.fn(async () => ({ status: 'idle' as const }))
vi.mock('../actions', () => ({ submitBrief: (...args: unknown[]) => submitBrief(...(args as [])) }))

const times = {
  id: 7,
  name: 'Start times',
  slug: 'start-times',
  options: [
    { value: '09-00', label: '09:00', order: 1, active: true },
    { value: '16-00', label: '4 pm', order: 2, active: true },
  ],
} as unknown as OptionSet

const props = (locale: 'en' | 'ar' = 'en', required = false) => ({
  config: withBriefTime(briefBuilderFixture(locale), {
    enabled: true,
    required,
    times,
    groupLabel: locale === 'ar' ? 'وقت البدء' : 'Start time',
    anyTime: locale === 'ar' ? 'أي وقت' : 'any time',
    connector: locale === 'ar' ? 'الساعة' : 'at',
  }),
  whatsappHref: 'https://wa.me/971500000000',
  providerHref: '/register?type=provider',
  sourcePath: '/',
  labels: testBriefLabels(locale),
})

type User = ReturnType<typeof userEvent.setup>
const sentence = () => screen.getByTestId('brief-sentence').textContent ?? ''
const group = (name: string | RegExp) => screen.getByRole('group', { name })
const noGroup = (name: string | RegExp) => screen.queryByRole('group', { name })
const pick = (user: User, name: RegExp) => user.click(screen.getByRole('radio', { name }))
const stepCount = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('[data-step-count]')].filter((el) => !el.closest('[hidden]')).map((el) => el.textContent)

async function toDate(user: User, date: string | null) {
  await pick(user, /Photographer/)
  await pick(user, /a wedding/)
  if (date) await user.type(screen.getByLabelText('When'), date)
  else await user.click(screen.getByRole('button', { name: /any date/ }))
}

describe('026 the start time step on the website', () => {
  beforeEach(() => {
    submitBrief.mockClear()
    window.open = vi.fn(() => null)
  })

  it('BT-US1-S1 after the date the next step lists the owner’s times, counted in the steps', async () => {
    const user = userEvent.setup()
    const { container } = renderWithLocale(<BriefBuilder {...props()} />)
    await pick(user, /Photographer/)
    expect(stepCount(container)).toEqual(['2 of 6'])
    await pick(user, /a wedding/)
    await user.type(screen.getByLabelText('When'), '2099-11-19')
    expect(group(/Start time/)).toBeInTheDocument()
    expect(noGroup(/How long/)).toBeNull()
    expect(stepCount(container)).toEqual(['4 of 6'])
    expect(screen.getByRole('searchbox')).toHaveAttribute('placeholder', 'pick a time')
    expect(within(group(/Start time/)).getAllByRole('radio').map((r) => (r as HTMLInputElement).value)).toEqual(['09-00', '16-00'])
  })

  it('BT-US1-S2 a picked time joins the sentence after the date as a token that reopens its step', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await toDate(user, '2099-11-19')
    await pick(user, /4 pm/)
    expect(sentence()).toContain('on Thu 19 Nov at 4 pm for')
    expect(group(/How long/)).toBeInTheDocument()
    const time = within(screen.getByTestId('brief-sentence')).getByRole('link', { name: '4 pm' })
    expect(time).toHaveAttribute('dir', 'ltr')
    await user.click(time)
    expect(group(/Start time/)).toBeInTheDocument()
  })

  it('BT-US1-S2 in Arabic the time reads left to right in the sentence and the list', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props('ar')} />, { locale: 'ar' })
    await pick(user, /مصوّر$/)
    await pick(user, /زفاف/)
    await user.type(screen.getByLabelText('متى'), '2099-11-19')
    const row = within(group(/وقت البدء/)).getByText('4 pm')
    expect(row.closest('bdi')).toHaveAttribute('dir', 'ltr')
    await pick(user, /4 pm/)
    expect(sentence()).toContain('الساعة \u20664 pm\u2069')
  })

  it('BT-US1-S3 "any time" moves on and leaves the time out of the sentence and the form', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await toDate(user, '2099-11-19')
    await user.click(screen.getByRole('button', { name: /any time/ }))
    expect(group(/How long/)).toBeInTheDocument()
    await pick(user, /2 hours/)
    await pick(user, /Sharjah/)
    expect(sentence()).toContain('on Thu 19 Nov for 2 hours in Sharjah.')
    await user.click(screen.getByRole('button', { name: /See who's free/ }))
    const form = (submitBrief.mock.calls[0] as unknown as [unknown, FormData])[1]
    expect(form.get('time')).toBeNull()
  })

  it('BT-US1-S3 a required time has no "any time" row', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props('en', true)} />)
    await toDate(user, '2099-11-19')
    expect(screen.queryByRole('button', { name: /any time/ })).toBeNull()
  })

  it('BT-US1-S4 with any date the time step is not asked nor counted, and a time picked before is dropped', async () => {
    const user = userEvent.setup()
    const { container } = renderWithLocale(<BriefBuilder {...props('en', true)} />)
    await toDate(user, '2099-11-19')
    await pick(user, /4 pm/)
    // Back to the date: "any date" drops the time and skips its step.
    await user.click(within(screen.getByTestId('brief-sentence')).getByRole('link', { name: 'Thu 19 Nov' }))
    await user.click(screen.getByRole('button', { name: /any date/ }))
    expect(noGroup(/Start time/)).toBeNull()
    expect(sentence()).not.toContain('4 pm')
    expect(group(/How long/)).toBeInTheDocument()
    expect(stepCount(container)).toEqual(['4 of 5'])
    await pick(user, /2 hours/)
    await pick(user, /Sharjah/)
    await user.click(screen.getByRole('button', { name: /See who's free/ }))
    const form = (submitBrief.mock.calls[0] as unknown as [unknown, FormData])[1]
    expect(form.get('time')).toBeNull()
    expect(form.get('date')).toBe('')
  })
})
