import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeAll, describe, expect, it } from 'vitest'
import { renderWithLocale } from '../../../../tests/setup/render'
import { profileView } from '../../../../tests/fixtures/creators'
import { SampleGallery } from './SampleGallery'
import { SampleViewer } from './SampleViewer'

const view = profileView()
const images = view.samples.filter((s) => s.kind === 'image')
const labels = { label: 'Sample {index} of {total}', close: 'Close', previous: 'Previous sample', next: 'Next sample' }

// jsdom has no modal dialog support: stand in for the two methods the viewer relies on.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
  }
})

const setup = (locale: 'en' | 'ar' = 'en') =>
  renderWithLocale(
    <SampleViewer samples={images.map((s) => ({ ...s.large, alt: s.alt, caption: s.caption, specialty: s.specialty }))} labels={labels}>
      <SampleGallery samples={view.samples} />
    </SampleViewer>,
    { locale },
  )

const dialog = () => screen.getByTestId('sample-viewer')

describe('CP-US2-S1 sample viewer', () => {
  it('opens the tapped image large, with its caption and specialty, instead of following the link', async () => {
    const user = userEvent.setup()
    setup()
    expect(dialog()).not.toHaveAttribute('open')
    await user.click(screen.getByRole('link', { name: 'Golden hour' }))
    expect(dialog()).toHaveAttribute('open')
    expect(within(dialog()).getByAltText('A bride at golden hour').getAttribute('src')).toContain('s1-hero.webp')
    expect(dialog()).toHaveTextContent('Golden hour · Wedding & engagement')
    expect(dialog()).toHaveAttribute('aria-label', 'Sample 1 of 2')
  })

  it('moves between samples with the buttons and wraps around', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('link', { name: 'Golden hour' }))
    await user.click(screen.getByRole('button', { name: 'Next sample' }))
    expect(within(dialog()).getByAltText('A portrait by the window')).toBeInTheDocument()
    expect(dialog()).toHaveAttribute('aria-label', 'Sample 2 of 2')
    await user.click(screen.getByRole('button', { name: 'Next sample' }))
    expect(within(dialog()).getByAltText('A bride at golden hour')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Previous sample' }))
    expect(within(dialog()).getByAltText('A portrait by the window')).toBeInTheDocument()
  })

  it('opens the second image from its own tile', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('link', { name: 'A portrait by the window' }))
    expect(within(dialog()).getByAltText('A portrait by the window')).toBeInTheDocument()
  })

  it('follows the arrow keys in the reading direction', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('link', { name: 'Golden hour' }))
    // A real browser focuses the dialog's autofocus Close button when it opens; jsdom does not.
    screen.getByRole('button', { name: 'Close' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(dialog()).toHaveAttribute('aria-label', 'Sample 2 of 2')
    await user.keyboard('{ArrowLeft}')
    expect(dialog()).toHaveAttribute('aria-label', 'Sample 1 of 2')
  })

  it('closes with the Close button', async () => {
    const user = userEvent.setup()
    setup()
    await user.click(screen.getByRole('link', { name: 'Golden hour' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(dialog()).not.toHaveAttribute('open')
  })

  it('leaves modified clicks and video links alone', async () => {
    const user = userEvent.setup()
    setup()
    await user.keyboard('{Control>}')
    await user.click(screen.getByRole('link', { name: 'Golden hour' }))
    await user.keyboard('{/Control}')
    expect(dialog()).not.toHaveAttribute('open')
    const video = screen.getByRole('link', { name: /Watch on YouTube/ })
    video.addEventListener('click', (e) => e.preventDefault())
    await user.click(video)
    expect(dialog()).not.toHaveAttribute('open')
  })

  it('with a single sample the previous and next buttons are disabled', async () => {
    const user = userEvent.setup()
    renderWithLocale(
      <SampleViewer samples={[{ ...images[0]!.large, alt: 'One', caption: '', specialty: '' }]} labels={labels}>
        <SampleGallery samples={[images[0]!]} />
      </SampleViewer>,
    )
    await user.click(screen.getByRole('link', { name: 'Golden hour' }))
    expect(screen.getByRole('button', { name: 'Next sample' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous sample' })).toBeDisabled()
  })
})
