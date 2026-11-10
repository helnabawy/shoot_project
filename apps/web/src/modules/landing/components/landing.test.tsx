import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { briefBuilderFixture } from '../../../../tests/fixtures/brief-builder'
import { testBriefLabels } from '../../../../tests/fixtures/labels'
import {
  personasFixture,
  sectionsFixture,
  settingsFixture,
} from '../../../../tests/fixtures/landing'
import type { LandingPage, Media } from '@/payload-types'
import { creatorSummary } from '../../../../tests/fixtures/creators'
import { renderWithLocale } from '../../../../tests/setup/render'
import { Hero } from './Hero'
import { RenderBlocks } from './RenderBlocks'

vi.mock('@/modules/brief/actions', () => ({ submitBrief: vi.fn() }))
// The network section is an async server component that reads the database (covered by the
// creators-landing integration test); here only RenderBlocks' wiring of the block type is checked.
vi.mock('./sections/CreatorNetwork', () => ({
  CreatorNetwork: ({
    block,
    locale,
  }: {
    block: { heading?: string; count?: number }
    locale: string
  }) => (
    <div data-testid="creator-network-stub" data-locale={locale}>
      {block.heading}:{block.count}
    </div>
  ),
}))

const contact = { whatsappNumber: '+971500000000', whatsappMessage: 'Hi' }
const categories = [
  {
    id: '1',
    slug: 'portrait',
    name: 'Portrait',
    order: 1,
    active: true,
    personas: ['1'],
    glyph: 'P',
  },
]

describe('US1 hero', () => {
  it('US1-S1 FR-066 puts the headline as the title above the brief builder on the stage', () => {
    renderWithLocale(
      <Hero
        hero={{
          headline: 'You brief. We shoot.',
          subheadline: 'One line.',
          trustChips: [{ text: 'No account needed' }, { text: 'Reply on WhatsApp' }],
          layout: 'briefBuilder',
        }}
        builder={briefBuilderFixture()}
        briefLabels={testBriefLabels()}
        settings={settingsFixture}
        personas={personasFixture}
        contact={contact}
        locale="en"
      />,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'You brief. We shoot.' }),
    ).toBeInTheDocument()
    // The stage carries the title, the CMS subheadline under it and the bar (design 41 · Landing · 1440).
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveClass('sr-only')
    expect(screen.getByText('One line.')).toBeInTheDocument()
    expect(screen.getByTestId('brief-builder')).toBeInTheDocument()
    // The stage holds only the title and the bar: trust chips are not shown (owner, 2026-11-07).
    expect(screen.queryByText('No account needed')).toBeNull()
    expect(screen.getByRole('link', { name: "I'm a Photographer" })).toHaveAttribute(
      'href',
      '/register?type=provider&persona=photographer',
    )
  })

  it('the "two buttons" layout renders CMS calls to action instead of the builder', () => {
    renderWithLocale(
      <Hero
        hero={{
          headline: 'Hi',
          layout: 'ctas',
          primaryCta: { label: 'Chat', kind: 'whatsapp' },
          secondaryCta: { label: 'Join', kind: 'link', href: '/register' },
        }}
        builder={briefBuilderFixture()}
        briefLabels={testBriefLabels('ar')}
        settings={settingsFixture}
        personas={[]}
        contact={contact}
        locale="ar"
      />,
      { locale: 'ar' },
    )
    expect(screen.queryByTestId('brief-builder')).toBeNull()
    expect(screen.getByRole('link', { name: /Chat/ })).toHaveAttribute(
      'href',
      'https://wa.me/971500000000?text=Hi',
    )
    // Internal links stay in the page's language.
    expect(screen.getByRole('link', { name: /Join/ })).toHaveAttribute('href', '/ar/register')
  })

  const media = (id: number, name: string, width = 1600, height = 900) =>
    ({ id, alt: name, url: `/api/media/file/${name}`, width, height, updatedAt: '', createdAt: '' }) as Media
  const heroCreator = (n: number) => {
    const creator = creatorSummary({ id: String(n), code: `C${n}`, displayName: `Creator ${n}`, photo: n % 2 ? null : creatorSummary().photo })
    return {
      creator,
      href: `/creators/C${n}`,
      view: { name: creator.displayName, displayCode: `SH-C${n}`, initials: `C${n}`, types: 'Photographer', place: 'Dubai', specialties: '' },
    }
  }
  const renderStage = (hero: Partial<NonNullable<LandingPage['hero']>>, creators: ReturnType<typeof heroCreator>[] = []) =>
    renderWithLocale(
      <Hero
        hero={{ headline: 'You brief. We shoot.', layout: 'briefBuilder', ...hero }}
        builder={briefBuilderFixture()}
        briefLabels={testBriefLabels()}
        settings={settingsFixture}
        personas={personasFixture}
        contact={contact}
        locale="en"
        creators={creators}
      />,
    )

  it('draws the golden-hour scene behind the bar until the CMS has a photo', () => {
    renderStage({})
    expect(screen.getByTestId('hero-scene')).toHaveAttribute('aria-hidden', 'true')
  })

  it('sets real creators in columns at the end of the stage, each card a link to the profile', () => {
    renderStage({}, [1, 2, 3, 4, 5].map(heroCreator))
    const list = screen.getByRole('list', { name: 'Creators' })
    const links = within(list).getAllByRole('link')
    expect(links).toHaveLength(5)
    expect(links[0]).toHaveAttribute('href', '/creators/C1')
    expect(links[0]).toHaveTextContent('Creator 1')
    expect(links[0]).toHaveTextContent('SH-C1')
    // The loop's copies are hidden from assistive tech and out of the tab order.
    const copies = screen.getByTestId('hero-creators').querySelectorAll('[aria-hidden="true"] a')
    expect(copies.length).toBeGreaterThan(0)
  })

  it('shows no creator columns until there are enough real creators to fill them (no invented cards)', () => {
    renderStage({}, [1, 2, 3].map(heroCreator))
    expect(screen.queryByTestId('hero-creators')).toBeNull()
    expect(screen.queryByRole('list', { name: 'Creators' })).toBeNull()
  })

  it('one Pause control stops every loop on the page (WCAG 2.2.2)', () => {
    renderStage({})
    const pause = screen.getByRole('button', { name: 'Pause the motion on this page' })
    expect(pause).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(pause)
    expect(pause).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement).toHaveAttribute('data-motion', 'paused')
    fireEvent.click(pause)
    expect(document.documentElement).not.toHaveAttribute('data-motion')
  })

  it('draws the CMS overlay (the UAE outline) faintly over the backdrop, at the CMS opacity', () => {
    renderStage({ overlay: media(9, 'uae-map.svg'), overlayOpacity: 12 })
    const overlay = screen.getByTestId('hero-overlay')
    expect(overlay).toHaveAttribute('aria-hidden', 'true')
    expect(overlay.style.opacity).toBe('0.12')
    expect(overlay.style.getPropertyValue('--overlay-src')).toBe('url("/api/media/file/uae-map.svg")')
  })

  it('shows no overlay until the CMS sets one', () => {
    renderStage({})
    expect(screen.queryByTestId('hero-overlay')).toBeNull()
  })

  it('uses the CMS background photo, with the phone crop as an art-directed source', () => {
    const { container } = renderStage({ image: media(1, 'wide.jpg'), imageMobile: media(2, 'tall.jpg', 800, 1200) })
    const sources = container.querySelectorAll('picture source')
    expect(sources[0]).toHaveAttribute('media', '(max-width: 639px)')
    expect(sources[0]?.getAttribute('srcset')).toContain('tall.jpg')
    expect(container.querySelector('picture img')).toHaveAttribute('alt', 'wide.jpg')
  })
})

describe('US1 sections', () => {
  const renderSections = () =>
    renderWithLocale(
      <RenderBlocks
        sections={sectionsFixture}
        context={{ contact, personas: personasFixture, categories, locale: 'en' }}
      />,
    )

  it('renders each section with its anchor and an h2, skipping empty and unknown blocks', () => {
    renderSections()
    for (const id of ['how-it-works', 'why-us', 'specialties', 'faq']) {
      expect(screen.getByTestId(`section-${id}`)).toHaveAttribute('id', id)
    }
    expect(screen.queryByTestId('section-empty-steps')).toBeNull()
    expect(screen.queryByTestId('section-trusted-by')).toBeNull()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
      'How it works',
      'Why us',
      'Specialties',
      'Are you a photographer, videographer or teacher?',
      'Questions',
      'Ready',
    ])
  })

  it('numbers the steps and lists the audience categories', () => {
    renderSections()
    const steps = within(screen.getByTestId('section-how-it-works')).getAllByRole('listitem')
    expect(steps.map((s) => s.textContent)).toEqual(['1BriefOne line.', '2Match'])
    // Tiles are the list; the names ticker above them is decorative.
    expect(
      within(within(screen.getByTestId('section-specialties')).getByRole('list')).getByText('Portrait'),
    ).toBeInTheDocument()
  })

  it('US5 the persona band interpolates the active audience, one row per persona', () => {
    renderSections()
    const band = screen.getByTestId('section-for-professionals')
    expect(within(band).getByText("I'm a Teacher")).toBeInTheDocument()
    expect(within(band).getByRole('link', { name: /Join/ })).toHaveAttribute('href', '/register')
  })

  it('FAQ answers expand from <details> rows', () => {
    renderSections()
    const question = screen.getByText('Do I need an account?')
    expect(question.closest('details')).not.toHaveAttribute('open')
    expect(screen.getByText('No.')).toBeInTheDocument()
  })

  it('the closing call to action has a Top Hit and a WhatsApp row', () => {
    renderSections()
    expect(screen.getByRole('link', { name: /Start a brief/ })).toHaveAttribute('href', '#brief')
    expect(screen.getByRole('link', { name: /WhatsApp us/ })).toHaveAttribute('target', '_blank')
  })

  it('CP-US1-S1 hands a creatorNetwork block to the network section with its settings and the page language', () => {
    renderWithLocale(
      <RenderBlocks
        sections={[
          {
            id: 'n1',
            blockType: 'creatorNetwork',
            anchor: 'our-network',
            heading: 'Our network',
            count: 6,
            rule: 'featuredThenNewest',
          },
        ]}
        context={{ contact, personas: [], categories: [], locale: 'ar' }}
      />,
      { locale: 'ar' },
    )
    expect(screen.getByTestId('creator-network-stub')).toHaveTextContent('Our network:6')
    expect(screen.getByTestId('creator-network-stub')).toHaveAttribute('data-locale', 'ar')
  })

  it('the persona band disappears when no persona is active', () => {
    renderWithLocale(
      <RenderBlocks
        sections={sectionsFixture}
        context={{ contact, personas: [], categories: [], locale: 'en' }}
      />,
    )
    expect(screen.queryByTestId('section-for-professionals')).toBeNull()
    expect(screen.queryByTestId('section-specialties')).toBeNull()
  })
})
