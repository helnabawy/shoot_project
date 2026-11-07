import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { briefBuilderFixture } from '../../../../tests/fixtures/brief-builder'
import { testBriefLabels } from '../../../../tests/fixtures/labels'
import { renderWithLocale } from '../../../../tests/setup/render'
import { BriefBuilder } from './BriefBuilder'

const submitBrief = vi.fn(async () => ({ status: 'idle' as const }))
vi.mock('../actions', () => ({ submitBrief: (...args: unknown[]) => submitBrief(...(args as [])) }))

function setup(preset: Record<string, string> | undefined, { multiple = false, locale = 'en' as 'en' | 'ar' } = {}) {
  return renderWithLocale(
    <BriefBuilder
      config={briefBuilderFixture(locale, ['photographer', 'videographer'], { multiple })}
      preset={preset}
      whatsappHref="https://wa.me/971500000000"
      providerHref="/register?type=provider"
      sourcePath="/hire/proposal-photographer-dubai"
      labels={testBriefLabels(locale)}
    />,
    { locale },
  )
}
const sentence = () => screen.getByTestId('brief-sentence').textContent ?? ''

describe('MP-US4-S1 brief builder with answers preset by an intent page', () => {
  beforeEach(() => {
    submitBrief.mockClear()
    window.open = vi.fn(() => null)
  })

  it('starts with the preset answers in the sentence and posts them with the form', () => {
    setup({ persona: 'videographer', location: 'dubai' })
    expect(sentence()).toContain('I need a videographer for')
    expect(sentence()).toContain('Dubai')
    expect(document.querySelector('input[name=\"persona\"]:checked')?.getAttribute('value')).toBe('videographer')
    expect(document.querySelector('input[name=\"location\"]:checked')?.getAttribute('value')).toBe('dubai')
  })

  it('treats a preset answer of a step that waits for Continue as answered (several professionals allowed)', () => {
    setup({ persona: 'photographer' }, { multiple: true })
    expect(sentence()).toContain('I need a photographer for')
    // the first open step is the next one, not the professional list
    expect(screen.queryByRole('group', { name: /Professional/ })).toBeNull()
    expect(screen.getByRole('group', { name: /Occasion/ })).toBeInTheDocument()
  })

  it('is not locked: the visitor can reopen the step and choose differently', async () => {
    const user = userEvent.setup()
    setup({ persona: 'photographer' })
    const word = screen.getByRole('link', { name: /photographer/i })
    await user.click(word)
    await user.click(screen.getByRole('radio', { name: /Videographer/ }))
    expect(sentence()).toContain('I need a videographer for')
    expect(document.querySelector('input[name=\"persona\"]:checked')?.getAttribute('value')).toBe('videographer')
  })

  it('without a preset it behaves exactly as before: nothing pre-filled', () => {
    setup(undefined)
    expect(sentence()).not.toContain('photographer')
    expect(document.querySelector('input[name="persona"]:checked')).toBeNull()
  })
})
