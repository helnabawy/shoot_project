import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Page } from '@/payload-types'
import { briefBuilderFixture } from '../../../../tests/fixtures/brief-builder'
import { testBriefLabels } from '../../../../tests/fixtures/labels'
import { renderWithLocale } from '../../../../tests/setup/render'

vi.mock('server-only', () => ({}))
vi.mock('next-intl/server', () => import('../../../../tests/setup/server-intl'))
vi.mock('@/modules/brief/actions', () => ({ submitBrief: async () => ({ status: 'idle' }) }))
vi.mock('@/modules/creators/components/CreatorList', () => ({
  CreatorList: ({ items, testId }: { items: unknown[]; testId: string }) => <ul data-testid={testId}>{items.length}</ul>,
}))

const { IntentView } = await import('./IntentView')

const lexical = (text: string) => ({ root: { type: 'root', version: 1, direction: 'ltr', format: '', indent: 0, children: [{ type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, children: [{ type: 'text', text, version: 1, format: 0, detail: 0, mode: 'normal', style: '' }] }] } })

const page = { id: 1, title: 'Proposal photographer in Dubai', slug: 'p', kind: 'intent', intent: { intro: 'Tell us about the day.' }, sections: [{ blockType: 'richText', anchor: 'more', content: lexical('Extra words'), id: 'a' }] } as unknown as Page
const base = {
  page,
  locale: 'en' as const,
  builder: briefBuilderFixture('en'),
  preset: { persona: 'photographer', location: 'dubai' },
  labels: testBriefLabels('en'),
  creators: [],
  creatorTotal: 0,
  faq: [],
  context: { contact: {}, personas: [], categories: [], locale: 'en' },
  whatsappHref: 'https://wa.me/971500000001',
  sourcePath: '/hire/p',
}

describe('MP-US4-S1 IntentView', () => {
  it('puts the brief first, under the one h1 and the intro, with the preset answers', async () => {
    renderWithLocale(await IntentView(base))
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByText('Tell us about the day.')).toBeInTheDocument()
    const sentence = screen.getByTestId('brief-sentence')
    expect(sentence).toHaveTextContent('I need a photographer')
    expect(sentence).toHaveTextContent('Dubai')
    // the brief comes before everything else on the page
    const view = screen.getByTestId('intent-view')
    expect(view.firstElementChild?.contains(sentence)).toBe(true)
    expect(screen.getByText('Extra words')).toBeInTheDocument()
  })

  it('MP-US4-S4 shows the creators section and their number only when there are creators', async () => {
    const { unmount } = renderWithLocale(await IntentView(base))
    expect(screen.queryByTestId('intent-creators')).toBeNull()
    expect(screen.queryByText(/professional/)).toBeNull()
    unmount()
    renderWithLocale(await IntentView({ ...base, creators: [{}, {}] as never, creatorTotal: 2 }))
    expect(screen.getByTestId('intent-creators')).toHaveTextContent('2')
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
  })

  it('MP-US4-S3 shows the questions and their answers when the editor wrote them', async () => {
    renderWithLocale(await IntentView({ ...base, faq: [{ question: 'How soon?', answer: lexical('Within a day.') }] }))
    expect(screen.getByTestId('intent-faq')).toHaveTextContent('How soon?')
    expect(screen.getByText('Within a day.')).toBeInTheDocument()
  })

  it('still renders when the site has no brief builder configured', async () => {
    renderWithLocale(await IntentView({ ...base, builder: null }))
    expect(screen.queryByTestId('brief-sentence')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
  })
})
