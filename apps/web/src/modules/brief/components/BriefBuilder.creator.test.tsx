import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { briefBuilderFixture } from '../../../../tests/fixtures/brief-builder'
import { testBriefLabels } from '../../../../tests/fixtures/labels'
import { renderWithLocale } from '../../../../tests/setup/render'
import { configForCreator, type CreatorBooking } from '../creator'
import { BriefBuilder } from './BriefBuilder'

const submitBrief = vi.fn(async () => ({ status: 'idle' as const }))
vi.mock('../actions', () => ({ submitBrief: (...args: unknown[]) => submitBrief(...(args as [])) }))

const creator = (over: Partial<CreatorBooking> = {}): CreatorBooking => ({
  code: '7K4Q2',
  displayCode: 'CR-7K4Q2',
  name: 'Sara Khan',
  initials: 'SK',
  photo: null,
  changeHref: '/',
  changeLabel: 'Change',
  ...over,
})

function setup(personaSlugs: string[], locale: 'en' | 'ar' = 'en', booking: CreatorBooking = creator(), multiple = false) {
  const base = briefBuilderFixture(locale, ['photographer', 'videographer', 'teacher'], { multiple })
  const { config, locked } = configForCreator(base, personaSlugs)!
  return renderWithLocale(
    <BriefBuilder
      config={config}
      locked={locked}
      creator={booking}
      whatsappHref="https://wa.me/971500000000"
      providerHref="/register?type=provider"
      sourcePath="/book/7k4q2"
      labels={testBriefLabels(locale)}
    />,
    { locale },
  )
}

const sentence = () => screen.getByTestId('brief-sentence').textContent ?? ''
const field = () => screen.getByRole('searchbox')

describe('CP-US2-S2 brief builder with a creator fixed', () => {
  beforeEach(() => {
    submitBrief.mockClear()
    window.open = vi.fn(() => null)
  })

  it('shows the creator as a set row with their code and a way back, and posts their code', () => {
    setup(['videographer'])
    const chip = screen.getByTestId('brief-creator-chip')
    expect(chip).toHaveTextContent('Sara Khan')
    expect(within(chip).getByText('CR-7K4Q2').closest('bdi')).toHaveAttribute('dir', 'ltr')
    expect(within(chip).getByRole('link', { name: 'Change' })).toHaveAttribute('href', '/')
    expect(document.querySelector('input[name="creator"]')).toHaveValue('7K4Q2')
  })

  it('a single-type creator: the professional step is answered, locked and never asked', async () => {
    const user = userEvent.setup()
    setup(['videographer'])
    expect(sentence()).toContain('I need a videographer for')
    // The first list is the next step, and the professional list is not offered.
    expect(screen.queryByRole('group', { name: /Professional/ })).toBeNull()
    expect(screen.getByRole('group', { name: /Occasion/ })).toBeInTheDocument()
    expect(field()).toHaveAttribute('placeholder', 'what occasion')
    // The answer still travels with the form.
    expect(document.querySelector('input[type="hidden"][name="persona"]')).toHaveValue('videographer')
    // The word is a plain token: it cannot be reopened, and Backspace does not take it back.
    const locked = within(screen.getByTestId('brief-sentence')).getByText('videographer')
    expect(locked.tagName).toBe('SPAN')
    expect(locked).toHaveAttribute('data-state', 'locked')
    await user.click(field())
    await user.keyboard('{Backspace}')
    expect(sentence()).toContain('I need a videographer for')
  })

  it('the site\'s real setup (the professional step takes several choices): a locked step still starts answered', () => {
    setup(['videographer'], 'en', creator(), true)
    expect(sentence()).toContain('I need a videographer for')
    expect(screen.getByRole('group', { name: /Occasion/ })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: /Professional/ })).toBeNull()
    expect(field()).toHaveAttribute('placeholder', 'what occasion')
  })

  it('a multi-type creator on the site\'s real setup lets the visitor tick any of their types', () => {
    setup(['photographer', 'teacher'], 'en', creator(), true)
    const list = screen.getByRole('group', { name: /Professional/ })
    expect(within(list).getAllByRole('checkbox').map((r) => r.getAttribute('value'))).toEqual(['photographer', 'teacher'])
  })

  it('a single-type creator: steps are numbered without the locked one, and options follow the creator\'s type', () => {
    setup(['videographer'])
    // Occasion is the first asked step of four, not the second of five.
    const label = screen.getByRole('group', { name: /Occasion/ })
    expect(label.querySelector('[data-step-count]')).toHaveTextContent('1 of 4')
    expect(screen.getByRole('radio', { name: /drone shots/ })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /maths/ })).toBeNull()
  })

  it('a multi-type creator: the professional step lists only their types and nothing is pre-selected', () => {
    setup(['photographer', 'teacher'])
    const list = screen.getByRole('group', { name: /Professional/ })
    expect(within(list).getAllByRole('radio').map((r) => r.getAttribute('value'))).toEqual(['photographer', 'teacher'])
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0)
    expect(document.querySelector('input[type="hidden"][name="persona"]')).toBeNull()
    expect(field()).toHaveAttribute('placeholder', "Type what you're looking for")
  })

  it('the empty field uses the creator\'s short prompt, which fits a phone, instead of the long default', () => {
    setup(['photographer', 'teacher'], 'en', creator({ prompt: 'Who do you need?' }))
    expect(field()).toHaveAttribute('placeholder', 'Who do you need?')
  })

  it('the "Change" link is a 44 px target', () => {
    setup(['videographer'])
    expect(within(screen.getByTestId('brief-creator-chip')).getByRole('link', { name: 'Change' }).className).toContain('min-h-11')
  })

  it('walks the remaining steps to the one primary action with the creator still on the form', async () => {
    const user = userEvent.setup()
    setup(['videographer'])
    await user.click(screen.getByRole('radio', { name: /a wedding/ }))
    await user.click(screen.getByRole('button', { name: /any date/ }))
    await user.click(screen.getByRole('radio', { name: /2 hours/ }))
    await user.click(screen.getByRole('radio', { name: /Sharjah/ }))
    expect(screen.getByRole('button', { name: /See who's free/ })).toBeInTheDocument()
    expect(sentence()).toContain('I need a videographer for a wedding')
    expect(document.querySelector('input[name="creator"]')).toHaveValue('7K4Q2')
  })

  it('renders in Arabic right to left with the code kept left to right', () => {
    setup(['videographer'], 'ar', creator({ name: 'سارة خان', changeLabel: 'تغيير' }))
    expect(document.querySelector('[dir="rtl"]')).not.toBeNull()
    const chip = screen.getByTestId('brief-creator-chip')
    expect(chip).toHaveTextContent('سارة خان')
    expect(within(chip).getByRole('link', { name: 'تغيير' })).toBeInTheDocument()
    expect(within(chip).getByText('CR-7K4Q2').closest('bdi')).toHaveAttribute('dir', 'ltr')
  })

  it('without a creator the builder is unchanged: no chip, no creator field, the professional step is asked', () => {
    renderWithLocale(
      <BriefBuilder config={briefBuilderFixture('en')} whatsappHref="x" providerHref="/r" sourcePath="/" labels={testBriefLabels('en')} />,
    )
    expect(screen.queryByTestId('brief-creator-chip')).toBeNull()
    expect(document.querySelector('input[name="creator"]')).toBeNull()
    expect(screen.getByRole('group', { name: /Professional/ })).toBeInTheDocument()
  })
})
