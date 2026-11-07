import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { SpecialtyHeader } from './SpecialtyHeader'
import { countsLine } from '../counts'

const t = (key: 'samples' | 'pros', { count }: { count: number }) => `${count} ${key}`

describe('CP-US4-S1 / CP-US4-S2 specialty header', () => {
  it('shows the editor\'s title as the page h1, the introduction and the counts', () => {
    renderWithLocale(<SpecialtyHeader title="Portrait photographers in the UAE" intro="Portraits of people." counts="428 samples · 43 pros" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Portrait photographers in the UAE' })).toBeInTheDocument()
    expect(screen.getByTestId('specialty-intro')).toHaveTextContent('Portraits of people.')
    expect(screen.getByTestId('specialty-counts')).toHaveTextContent('428 samples · 43 pros')
  })

  it('hides the counts line when there is nothing true to say, and the introduction when the editor wrote none', () => {
    renderWithLocale(<SpecialtyHeader title="Food" intro="" counts={null} />)
    expect(screen.queryByTestId('specialty-counts')).toBeNull()
    expect(screen.queryByTestId('specialty-intro')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Food')
  })

  it('is right to left with Arabic text', () => {
    renderWithLocale(<SpecialtyHeader title="مصورو بورتريه" intro="بورتريه للأفراد." counts={null} />, { locale: 'ar' })
    expect(document.querySelector('[dir="rtl"]')).not.toBeNull()
  })
})

describe('CP-US4-S1 counts line', () => {
  it('joins the parts that are above zero and says nothing otherwise', () => {
    expect(countsLine(t, { samples: 3, pros: 2 })).toBe('3 samples · 2 pros')
    expect(countsLine(t, { samples: 0, pros: 2 })).toBe('2 pros')
    expect(countsLine(t, { samples: 3, pros: 0 })).toBe('3 samples')
    expect(countsLine(t, { samples: 0, pros: 0 })).toBeNull()
    expect(countsLine(t, undefined)).toBeNull()
  })
})
