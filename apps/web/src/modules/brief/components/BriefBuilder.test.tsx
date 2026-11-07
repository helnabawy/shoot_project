import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { briefBuilderFixture } from '../../../../tests/fixtures/brief-builder'
import { testBriefLabels } from '../../../../tests/fixtures/labels'
import { renderWithLocale } from '../../../../tests/setup/render'
import { BriefBuilder } from './BriefBuilder'

const submitBrief = vi.fn(async () => ({ status: 'idle' as const }))
vi.mock('../actions', () => ({ submitBrief: (...args: unknown[]) => submitBrief(...(args as [])) }))

const props = (locale: 'en' | 'ar' = 'en', personas?: string[]) => ({
  config: briefBuilderFixture(locale, personas),
  whatsappHref: 'https://wa.me/971500000000',
  providerHref: '/register?type=provider',
  providerLabel: "I'm a photographer",
  sourcePath: '/',
  labels: testBriefLabels(locale),
})

const sentence = () => screen.getByTestId('brief-sentence').textContent

describe('US8 brief builder', () => {
  beforeEach(() => {
    submitBrief.mockClear()
    window.open = vi.fn(() => null)
  })

  it('US8-S1 renders the sentence with defaults and one labelled group per slot', () => {
    renderWithLocale(<BriefBuilder {...props()} />)
    // The optional date is left out until it is set; its row invites the visitor instead.
    expect(sentence()).toContain('I need a photographer for an event for 2 hours in choose one')
    expect(screen.getByRole('group', { name: 'Occasion' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Professional' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /an event/ })).toBeChecked()
    expect(screen.getByRole('button', { name: /See who's free/ })).toBeInTheDocument()
  })

  it('reprints the sentence when a row is picked', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await user.click(screen.getByRole('radio', { name: /a wedding/ }))
    expect(sentence()).toContain('for a wedding for 2 hours')
  })

  it('US8-S2 changing the persona re-filters options and clears an invalid choice', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    const occasion = () => screen.getByRole('group', { name: 'Occasion' })
    expect(within(occasion()).queryByRole('radio', { name: /drone/ })).toBeNull()
    await user.click(screen.getByRole('radio', { name: /Videographer/ }))
    await user.type(screen.getByRole('searchbox'), 'drone')
    await user.click(within(occasion()).getByRole('radio', { name: /drone shots/ }))
    expect(sentence()).toContain('drone shots')
    await user.click(screen.getByRole('radio', { name: /Photographer/ }))
    // "drone shots" is videographer-only, so the occasion falls back to the default.
    expect(sentence()).toContain('for an event')
  })

  it('US8-S4 blocks submission and marks the missing slot', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await user.click(screen.getByRole('button', { name: /See who's free/ }))
    expect(submitBrief).not.toHaveBeenCalled()
    const emirate = screen.getByRole('group', { name: 'Emirate' })
    expect(within(emirate).getByText('Choose this part of the brief.')).toBeInTheDocument()
  })

  it('submits a complete brief to the server action', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await user.click(screen.getByRole('radio', { name: /Sharjah/ }))
    await user.click(screen.getByRole('button', { name: /See who's free/ }))
    expect(submitBrief).toHaveBeenCalledTimes(1)
    const form = (submitBrief.mock.calls[0] as unknown as [unknown, FormData])[1]
    expect(form.get('location')).toBe('sharjah')
    expect(form.get('occasion')).toBe('event')
  })

  it('filters rows live and offers the typed words where custom text is allowed', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    const search = screen.getByRole('searchbox')
    await user.type(search, 'graduation')
    expect(screen.queryByRole('group', { name: 'Emirate' })).toBeNull()
    await user.click(screen.getByRole('radio', { name: /“graduation”/ }))
    expect(sentence()).toContain('graduation')
    await user.type(search, 'xyz{Escape}')
    expect(search).toHaveValue('')
  })

  it('US8-S6 renders an unknown sentence token verbatim', () => {
    const p = props()
    p.config = { ...p.config, sentence: `${p.config.sentence} {subject}` }
    renderWithLocale(<BriefBuilder {...p} />)
    expect(sentence()).toContain('{subject}')
  })

  it('US5 three active personas all appear as options', () => {
    renderWithLocale(<BriefBuilder {...props('en', ['photographer', 'videographer', 'teacher'])} />)
    const group = screen.getByRole('group', { name: 'Professional' })
    expect(within(group).getAllByRole('radio')).toHaveLength(3)
  })

  it('US8-S7 renders Arabic labels inside a right-to-left page', () => {
    const { container } = renderWithLocale(<BriefBuilder {...props('ar')} />, { locale: 'ar' })
    expect(container).toHaveAttribute('dir', 'rtl')
    expect(screen.getByRole('group', { name: 'المناسبة' })).toBeInTheDocument()
    expect(sentence()).toContain('أحتاج مصوّر')
  })

  it('keeps the WhatsApp alternative and the provider action', () => {
    renderWithLocale(<BriefBuilder {...props()} />)
    expect(screen.getByTestId('whatsapp-secondary')).toHaveAttribute(
      'href',
      'https://wa.me/971500000000',
    )
    expect(screen.getByRole('link', { name: /I'm a photographer/ })).toHaveAttribute(
      'href',
      '/register?type=provider',
    )
  })

  it('FR-056 the date row invites a choice and prints the chosen date into the sentence', async () => {
    renderWithLocale(<BriefBuilder {...props()} />)
    const date = screen.getByLabelText('When')
    expect(date.closest('label')).toHaveTextContent('pick a date')
    await userEvent.type(date, '2099-11-21')
    expect(date.closest('label')).toHaveTextContent('Sat 21 Nov')
    expect(sentence()).toContain('on Sat 21 Nov for 2 hours')
  })

  it('US8-S10 a multiple persona slot ticks several types, joins them and filters by either', async () => {
    const user = userEvent.setup()
    const p = props()
    p.config = briefBuilderFixture('en', ['photographer', 'videographer'], { multiple: true })
    renderWithLocale(<BriefBuilder {...p} />)
    // Filtering can hide the group and mount it again, so look it up each time.
    const group = () => screen.getByRole('group', { name: 'Professional · pick one or more' })
    expect(within(group()).queryAllByRole('radio')).toHaveLength(0)
    expect(within(group()).getByRole('checkbox', { name: /Photographer/ })).toBeChecked()

    await user.click(within(group()).getByRole('checkbox', { name: /Videographer/ }))
    expect(sentence()).toContain('I need a photographer and videographer for an event')
    await user.type(screen.getByRole('searchbox'), 'drone')
    await user.click(screen.getByRole('radio', { name: /drone shots/ }))
    expect(sentence()).toContain('for drone shots')

    // Unticking the videographer drops the videographer-only occasion back to the default.
    await user.click(within(group()).getByRole('checkbox', { name: /Videographer/ }))
    expect(sentence()).toContain('I need a photographer for an event')

    await user.click(screen.getByRole('radio', { name: /Sharjah/ }))
    await user.click(within(group()).getByRole('checkbox', { name: /Videographer/ }))
    await user.click(screen.getByRole('button', { name: /See who's free/ }))
    const form = (submitBrief.mock.calls[0] as unknown as [unknown, FormData])[1]
    expect(form.getAll('persona')).toEqual(['photographer', 'videographer'])
  })

  it('US8-S10 unticking every type asks for one before sending', async () => {
    const user = userEvent.setup()
    const p = props()
    p.config = briefBuilderFixture('en', ['photographer', 'videographer'], { multiple: true })
    renderWithLocale(<BriefBuilder {...p} />)
    await user.click(screen.getByRole('checkbox', { name: /Photographer/ }))
    expect(sentence()).toContain('I need a choose one for')
    await user.click(screen.getByRole('radio', { name: /Sharjah/ }))
    await user.click(screen.getByRole('button', { name: /See who's free/ }))
    expect(submitBrief).not.toHaveBeenCalled()
    expect(
      within(screen.getByRole('group', { name: /Professional/ })).getByText(
        'Choose this part of the brief.',
      ),
    ).toBeInTheDocument()
  })
})

describe('US8 folded options drawer (FR-064, FR-065)', () => {
  const drawer = () => screen.getByTestId('brief-builder').querySelector('.bar-drawer')!
  const toggleButton = () => screen.getByTestId('brief-toggle')

  it('FR-064 / US8-S11 starts folded, with the sentence and the Top Hit still in reach', () => {
    renderWithLocale(<BriefBuilder {...props()} />)
    expect(drawer()).toHaveAttribute('data-open', 'false')
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'false')
    expect(toggleButton()).toHaveAccessibleName('Show options')
    expect(toggleButton()).toHaveAttribute('aria-controls', drawer().id)
    expect(screen.getByRole('button', { name: /See who's free/ })).toBeInTheDocument()
  })

  it('FR-064 the toggle opens and folds the options', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await user.click(toggleButton())
    expect(drawer()).toHaveAttribute('data-open', 'true')
    expect(toggleButton()).toHaveAccessibleName('Hide options')
    await user.click(toggleButton())
    expect(drawer()).toHaveAttribute('data-open', 'false')
  })

  it('FR-064 / US8-S11 tapping a sentence part opens its group with every value shown and focus on the choice', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await user.click(
      within(screen.getByTestId('brief-sentence')).getByRole('link', { name: 'an event' }),
    )
    expect(drawer()).toHaveAttribute('data-open', 'true')
    const occasion = screen.getByRole('group', { name: 'Occasion' })
    await waitFor(() =>
      expect(within(occasion).getByRole('radio', { name: /an event/ })).toHaveFocus(),
    )
    expect(occasion.scrollIntoView).toHaveBeenCalled()
    expect(
      occasion.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked ?? true,
    ).toBe(true)
  })

  it('FR-065 / US8-S12 Cmd/Ctrl+K opens the options into the filter, and Escape folds them again', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await user.keyboard('{Control>}k{/Control}')
    expect(drawer()).toHaveAttribute('data-open', 'true')
    expect(screen.getByRole('searchbox')).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(drawer()).toHaveAttribute('data-open', 'false')
    await user.keyboard('{Meta>}k{/Meta}')
    expect(drawer()).toHaveAttribute('data-open', 'true')
    await user.keyboard('{Meta>}k{/Meta}')
    expect(drawer()).toHaveAttribute('data-open', 'false')
  })

  it('FR-064 typing in the filter opens the options', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await user.type(screen.getByRole('searchbox'), 'wed')
    expect(drawer()).toHaveAttribute('data-open', 'true')
  })

  it('FR-064 a missing part opens the options on its group', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await user.click(screen.getByRole('button', { name: /See who's free/ }))
    expect(drawer()).toHaveAttribute('data-open', 'true')
  })

  it('FR-066 wears the glass tone when asked', () => {
    renderWithLocale(<BriefBuilder {...props()} tone="glass" />)
    expect(screen.getByTestId('brief-builder').className).toContain('bar-glass')
  })

  it('chosen words in the sentence are tinted tokens; an unset required word is an invitation', () => {
    renderWithLocale(<BriefBuilder {...props()} />)
    const field = within(screen.getByTestId('brief-sentence'))
    const chosen = field.getByRole('link', { name: 'an event' })
    expect(chosen).toHaveAttribute('data-state', 'set')
    expect(chosen.className).toContain('bg-selected')
    const unset = field.getByRole('link', { name: 'choose one' })
    expect(unset).toHaveAttribute('data-state', 'open')
    expect(unset.className).not.toContain('bg-selected')
  })
})
