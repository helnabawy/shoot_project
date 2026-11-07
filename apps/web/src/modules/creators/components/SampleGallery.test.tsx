import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { profileView } from '../../../../tests/fixtures/creators'
import { SampleGallery } from './SampleGallery'

describe('CP-US2-S1 sample gallery', () => {
  it('shows each image with its alt text, the sized card variant, and loads it lazily', () => {
    renderWithLocale(<SampleGallery samples={profileView().samples} />)
    const img = screen.getByAltText('A bride at golden hour')
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img.getAttribute('src')).toContain('s1-card.webp')
    expect(img).toHaveAttribute('width', '800')
    expect(img).toHaveAttribute('height', '1000')
    expect(img).toHaveAttribute('sizes')
    // Never an unlabelled or eager image.
    for (const el of screen.getByTestId('sample-gallery').querySelectorAll('img')) {
      expect(el.getAttribute('alt')).toBeTruthy()
      expect(el).toHaveAttribute('loading', 'lazy')
    }
  })

  it('an image links to its large file (works without JavaScript) and counts images only for the viewer', () => {
    renderWithLocale(<SampleGallery samples={profileView().samples} />)
    const links = within(screen.getByTestId('sample-gallery')).getAllByRole('link')
    const images = links.filter((l) => l.hasAttribute('data-sample-index'))
    expect(images.map((l) => l.getAttribute('href'))).toEqual(['/api/media/file/s1-hero.webp', '/api/media/file/s3-hero.webp'])
    expect(images.map((l) => l.getAttribute('data-sample-index'))).toEqual(['0', '1'])
  })

  it('a video sample links out to its site in a new tab, names the site, and has no viewer index', () => {
    renderWithLocale(<SampleGallery samples={profileView().samples} />)
    const video = screen.getByRole('link', { name: 'Watch on YouTube: Showreel' })
    expect(video).toHaveAttribute('href', 'https://www.youtube.com/watch?v=abc')
    expect(video).toHaveAttribute('target', '_blank')
    expect(video).toHaveAttribute('rel', 'noopener noreferrer')
    expect(video).not.toHaveAttribute('data-sample-index')
    expect(within(screen.getByTestId('sample-1')).getByText('YouTube')).toBeInTheDocument()
  })

  it('names an image link by its caption, else its alt text', () => {
    renderWithLocale(<SampleGallery samples={profileView().samples} />)
    expect(screen.getByRole('link', { name: 'Golden hour' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'A portrait by the window' })).toBeInTheDocument()
  })

  it('names the video action in Arabic', () => {
    renderWithLocale(<SampleGallery samples={profileView().samples} />, { locale: 'ar' })
    expect(screen.getByRole('link', { name: 'شاهد على YouTube: Showreel' })).toBeInTheDocument()
  })
})
