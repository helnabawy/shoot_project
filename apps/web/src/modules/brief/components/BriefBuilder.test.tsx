import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { briefBuilderFixture } from '../../../../tests/fixtures/brief-builder'
import { testBriefLabels } from '../../../../tests/fixtures/labels'
import { renderWithLocale } from '../../../../tests/setup/render'
import { BriefBuilder } from './BriefBuilder'

const submitBrief = vi.fn(async () => ({ status: 'idle' as const }))
vi.mock('../actions', () => ({ submitBrief: (...args: unknown[]) => submitBrief(...(args as [])) }))

const props = (locale: 'en' | 'ar' = 'en', personas?: string[], options: { multiple?: boolean } = {}) => ({
  config: briefBuilderFixture(locale, personas, options),
  whatsappHref: 'https://wa.me/971500000000',
  providerHref: '/register?type=provider',
  providerLabel: "I'm a photographer",
  sourcePath: '/',
  labels: testBriefLabels(locale),
})

type User = ReturnType<typeof userEvent.setup>

const sentence = () => screen.getByTestId('brief-sentence').textContent ?? ''
const field = () => screen.getByRole('searchbox')
const group = (name: string | RegExp) => screen.getByRole('group', { name })
const noGroup = (name: string | RegExp) => screen.queryByRole('group', { name })
const topHit = () => screen.queryByRole('button', { name: /See who's free/ })
const token = (name: string) => within(screen.getByTestId('brief-sentence')).getByRole('link', { name })
const pick = (user: User, name: RegExp) => user.click(screen.getByRole('radio', { name }))

/** Answers every step of the fixture: photographer, a wedding, any date, 2 hours, Sharjah. */
async function walk(user: User) {
  await pick(user, /Photographer/)
  await pick(user, /a wedding/)
  await user.click(screen.getByRole('button', { name: /any date/ }))
  await pick(user, /2 hours/)
  await pick(user, /Sharjah/)
}

describe('US8 step-by-step brief (FR-067)', () => {
  beforeEach(() => {
    submitBrief.mockClear()
    window.open = vi.fn(() => null)
  })

  it('US8-S1 / US8-S11 opens with one search field and only the professional list', () => {
    renderWithLocale(<BriefBuilder {...props()} />)
    expect(field()).toHaveAttribute('placeholder', "Type what you're looking for")
    expect(group(/Professional/)).toBeInTheDocument()
    expect(noGroup(/Occasion/)).toBeNull()
    expect(noGroup(/Emirate/)).toBeNull()
    expect(topHit()).toBeNull()
    // Nothing is pre-selected and the sentence has not started.
    expect(screen.queryAllByRole('radio', { checked: true })).toHaveLength(0)
    expect(sentence()).not.toContain('I need a')
  })

  it('US8-S1 / US8-S13 picking a professional prints it and shows only the next list', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await pick(user, /Photographer/)
    expect(sentence()).toContain('I need a photographer for')
    expect(noGroup(/Professional/)).toBeNull()
    expect(group(/Occasion/)).toBeInTheDocument()
    expect(field()).toHaveAttribute('placeholder', 'what occasion')
    expect(token('photographer')).toHaveAttribute('data-state', 'set')
    expect(token('photographer').className).toContain('bg-selected')
  })

  it('US8-S3 walks every step, then shows the one primary action and sends the brief', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await walk(user)
    expect(sentence()).toContain('I need a photographer for a wedding for 2 hours in Sharjah.')
    expect(noGroup(/Emirate/)).toBeNull()
    expect(field()).toHaveAccessibleName('type to change any part')
    await user.click(topHit()!)
    expect(submitBrief).toHaveBeenCalledTimes(1)
    const form = (submitBrief.mock.calls[0] as unknown as [unknown, FormData])[1]
    expect(Object.fromEntries(['persona', 'occasion', 'date', 'duration', 'location'].map((k) => [k, form.get(k)]))).toEqual({
      persona: 'photographer',
      occasion: 'wedding',
      date: '',
      duration: '2h',
      location: 'sharjah',
    })
  })

  it('shows the step count beside the asked list', async () => {
    const user = userEvent.setup()
    const { container } = renderWithLocale(<BriefBuilder {...props()} />)
    await pick(user, /Photographer/)
    const shown = [...container.querySelectorAll<HTMLElement>('[data-step-count]')].filter((el) => !el.closest('[hidden]'))
    expect(shown.map((el) => el.textContent)).toEqual(['2 of 5'])
  })

  it('US8-S11 / US8-S13 tapping a chosen word reopens its step with focus on the current choice', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await pick(user, /Photographer/)
    await pick(user, /a wedding/)
    await user.click(token('photographer'))
    expect(group(/Professional/)).toBeInTheDocument()
    expect(noGroup(/Occasion/)).toBeNull()
    await waitFor(() => expect(screen.getByRole('radio', { name: /Photographer/ })).toHaveFocus())
    // Picking the same answer again moves on to the first open step.
    await pick(user, /Photographer/)
    expect(group(/When/)).toBeInTheDocument()
  })

  it('US8-S13 Backspace in the empty field takes back the last answer', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await pick(user, /Photographer/)
    await pick(user, /a wedding/)
    await user.click(field())
    await user.keyboard('{Backspace}')
    expect(sentence()).not.toContain('a wedding')
    expect(group(/Occasion/)).toBeInTheDocument()
  })

  it('FR-065 / US8-S12 Cmd/Ctrl+K moves focus to the field; Escape clears the search, then leaves a reopened step', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await pick(user, /Photographer/)
    await user.keyboard('{Control>}k{/Control}')
    expect(field()).toHaveFocus()
    await user.type(field(), 'wed')
    await user.keyboard('{Escape}')
    expect(field()).toHaveValue('')
    await user.click(token('photographer'))
    expect(group(/Professional/)).toBeInTheDocument()
    await user.click(field())
    await user.keyboard('{Escape}')
    expect(noGroup(/Professional/)).toBeNull()
    expect(group(/Occasion/)).toBeInTheDocument()
  })

  it('typing searches every list at once and a pick lands in its own place in the sentence', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await pick(user, /Photographer/)
    await user.type(field(), 'shar')
    expect(group(/Emirate/)).toBeInTheDocument()
    expect(noGroup(/Occasion/)).toBeNull()
    await pick(user, /Sharjah/)
    expect(sentence()).toContain('in Sharjah')
    // The occasion is still the step being asked.
    expect(group(/Occasion/)).toBeInTheDocument()
    expect(field()).toHaveValue('')
  })

  it('Return in the field picks the first match', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await user.type(field(), 'video{Enter}')
    expect(sentence()).toContain('I need a videographer')
  })

  it('offers the typed words where custom text is allowed', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await pick(user, /Photographer/)
    await user.type(field(), 'graduation')
    await pick(user, /“graduation”/)
    expect(sentence()).toContain('for graduation')
    expect(group(/When/)).toBeInTheDocument()
  })

  it('US8-S2 changing the professional sends the visitor back to a step it no longer offers', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await pick(user, /Videographer/)
    expect(within(group(/Occasion/)).getByRole('radio', { name: /drone shots/ })).toBeInTheDocument()
    await pick(user, /drone shots/)
    await user.click(screen.getByRole('button', { name: /any date/ }))
    await user.click(token('videographer'))
    await pick(user, /Photographer/)
    expect(sentence()).not.toContain('drone')
    expect(within(group(/Occasion/)).queryByRole('radio', { name: /drone/ })).toBeNull()
  })

  it('FR-056 the date step prints a chosen date and moves on', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await pick(user, /Photographer/)
    await pick(user, /a wedding/)
    await user.type(screen.getByLabelText('When'), '2099-11-21')
    expect(sentence()).toContain('on Sat 21 Nov')
    expect(group(/How long/)).toBeInTheDocument()
  })

  it('US8-S4 Return does not send an unfinished brief', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props()} />)
    await pick(user, /Photographer/)
    await user.click(field())
    await user.keyboard('{Enter}')
    expect(submitBrief).not.toHaveBeenCalled()
  })

  it('FR-064 a server error reopens the step it concerns', async () => {
    const user = userEvent.setup()
    submitBrief.mockResolvedValueOnce({ status: 'error', errors: { location: 'brief.errors.notAnOption' } } as never)
    renderWithLocale(<BriefBuilder {...props()} />)
    await walk(user)
    await user.click(topHit()!)
    await waitFor(() => expect(group(/Emirate/)).toBeInTheDocument())
    expect(within(group(/Emirate/)).getByText('Choose one of the options.')).toBeInTheDocument()
  })

  it('US8-S6 renders an unknown sentence token verbatim', async () => {
    const user = userEvent.setup()
    const p = props()
    p.config = { ...p.config, sentence: `${p.config.sentence} {subject}` }
    renderWithLocale(<BriefBuilder {...p} />)
    await pick(user, /Photographer/)
    expect(sentence()).toContain('{subject}')
  })

  it('US5 three active personas all appear in the first list', () => {
    renderWithLocale(<BriefBuilder {...props('en', ['photographer', 'videographer', 'teacher'])} />)
    expect(within(group(/Professional/)).getAllByRole('radio')).toHaveLength(3)
  })

  it('US8-S7 the Arabic bar is right-to-left with Arabic prompts and words', async () => {
    const user = userEvent.setup()
    const { container } = renderWithLocale(<BriefBuilder {...props('ar')} />, { locale: 'ar' })
    expect(container).toHaveAttribute('dir', 'rtl')
    expect(field()).toHaveAttribute('placeholder', 'اكتب ما تبحث عنه')
    await user.click(screen.getByRole('radio', { name: /^مصوّر$/ }))
    expect(sentence()).toContain('أحتاج مصوّر')
    expect(group(/المناسبة/)).toBeInTheDocument()
    expect(field()).toHaveAttribute('placeholder', 'أي مناسبة')
  })

  it('keeps the WhatsApp alternative and the provider action', () => {
    renderWithLocale(<BriefBuilder {...props()} />)
    expect(screen.getByTestId('whatsapp-secondary')).toHaveAttribute('href', 'https://wa.me/971500000000')
    expect(screen.getByRole('link', { name: /I'm a photographer/ })).toHaveAttribute('href', '/register?type=provider')
  })

  it('US8-S10 a step that takes several professionals moves on with Continue', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props('en', undefined, { multiple: true })} />)
    const professional = () => group(/Professional · pick one or more/)
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull()
    await user.click(within(professional()).getByRole('checkbox', { name: /Photographer/ }))
    await user.click(within(professional()).getByRole('checkbox', { name: /Videographer/ }))
    expect(sentence()).toContain('I need a photographer and videographer')
    await user.click(screen.getByRole('button', { name: /Continue/ }))
    expect(noGroup(/Professional/)).toBeNull()
    // Options of either professional are offered.
    expect(within(group(/Occasion/)).getByRole('radio', { name: /drone shots/ })).toBeInTheDocument()
    await pick(user, /a wedding/)
    await user.click(screen.getByRole('button', { name: /any date/ }))
    await pick(user, /2 hours/)
    await pick(user, /Sharjah/)
    await user.click(topHit()!)
    const form = (submitBrief.mock.calls[0] as unknown as [unknown, FormData])[1]
    expect(form.getAll('persona')).toEqual(['photographer', 'videographer'])
  })

  it('US8-S10 Continue waits for at least one professional', async () => {
    const user = userEvent.setup()
    renderWithLocale(<BriefBuilder {...props('en', undefined, { multiple: true })} />)
    await user.click(screen.getByRole('checkbox', { name: /Photographer/ }))
    expect(screen.getByRole('button', { name: /Continue/ })).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: /Photographer/ }))
    expect(screen.queryByRole('button', { name: /Continue/ })).toBeNull()
  })

  it('FR-066 wears the glass tone when asked', () => {
    renderWithLocale(<BriefBuilder {...props()} tone="glass" />)
    expect(screen.getByTestId('brief-builder').className).toContain('bar-glass')
  })
})
