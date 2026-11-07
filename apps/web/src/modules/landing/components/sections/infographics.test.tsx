import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FeaturesBlock, HowItWorksBlock } from '@/payload-types'
import { renderWithLocale } from '../../../../../tests/setup/render'
import { Features } from './Features'
import { HowItWorks } from './HowItWorks'

const contact = { whatsappNumber: '+971500000000', whatsappMessage: 'Hi' }

const steps = (visuals: (HowItWorksBlock['steps'] & object)[number]['visual'][]): HowItWorksBlock => ({
  blockType: 'howItWorks',
  anchor: 'how-it-works',
  heading: 'How it works',
  steps: visuals.map((visual, i) => ({ id: String(i), title: `Step ${i + 1}`, body: 'Body', visual })),
})

const reasons = (points: (FeaturesBlock['items'] & object)[number]['pointsAt'][]): FeaturesBlock => ({
  blockType: 'features',
  anchor: 'why-us',
  heading: 'Why book this way',
  items: points.map((pointsAt, i) => ({ id: String(i), title: `Reason ${i + 1}`, glyph: 'R', pointsAt })),
})

describe('How it works timeline', () => {
  it('draws each step the CMS gives a picture, decoratively, and keeps the numbered order', () => {
    renderWithLocale(<HowItWorks block={steps(['brief', 'none', 'work'])} contact={contact} locale="en" />)
    expect(screen.getByTestId('step-visual-brief')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByTestId('step-visual-match')).toBeNull()
    expect(screen.getByTestId('step-visual-work')).toBeInTheDocument()
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items.map((li) => within(li).getByRole('heading').textContent)).toEqual(['Step 1', 'Step 2', 'Step 3'])
  })
})

describe('Why book this way, the annotated brief', () => {
  it('numbers pointed reasons in the order of the drawing, not the CMS order', () => {
    renderWithLocale(<Features block={reasons(['whatsapp', 'sentence', 'send', 'language'])} />)
    const figure = screen.getByTestId('features-figure')
    const titles = within(figure)
      .getAllByRole('heading')
      .map((h) => h.textContent)
    // sentence, language, send, whatsapp
    expect(titles).toEqual(['Reason 2', 'Reason 4', 'Reason 3', 'Reason 1'])
  })

  it('lists reasons that point at nothing, or at a part already taken, in the cell grid', () => {
    renderWithLocale(<Features block={reasons(['sentence', 'sentence', 'none'])} />)
    const figure = screen.getByTestId('features-figure')
    expect(within(figure).getAllByRole('heading').map((h) => h.textContent)).toEqual(['Reason 1'])
    expect(screen.getByRole('heading', { name: 'Reason 2' }).closest('[data-testid=features-figure]')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Reason 3' })).toBeInTheDocument()
  })

  it('falls back to the cell grid alone when no reason points at the drawing', () => {
    renderWithLocale(<Features block={reasons(['none', null])} />)
    expect(screen.queryByTestId('features-figure')).toBeNull()
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2)
  })
})
