import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Page } from '@/payload-types'
import { renderWithLocale } from '../../../../tests/setup/render'

vi.mock('server-only', () => ({}))
vi.mock('next-intl/server', () => import('../../../../tests/setup/server-intl'))

const { PageView } = await import('./PageView')

const lexical = (text: string) => ({
  root: { type: 'root', version: 1, direction: 'ltr', format: '', indent: 0, children: [{ type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, children: [{ type: 'text', text, version: 1, format: 0, detail: 0, mode: 'normal', style: '' }] }] },
})

const context = { contact: { whatsappNumber: '+971500000001' }, personas: [], categories: [], locale: 'en' }

describe('MP-US1-S1 PageView', () => {
  it('renders the title as the one h1 and the sections below it', () => {
    const page = { id: 1, title: 'Studios', slug: 'studios', sections: [{ blockType: 'richText', anchor: 'intro', content: lexical('Hello studio'), id: 'a' }] } as unknown as Page
    renderWithLocale(<PageView page={page} context={context} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Studios' })).toBeInTheDocument()
    expect(screen.getByText('Hello studio')).toBeInTheDocument()
  })

  it('renders only the title for a page with no sections yet (a draft in preview)', () => {
    renderWithLocale(<PageView page={{ id: 1, title: 'Empty', slug: 'empty', sections: [] } as unknown as Page} context={context} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Empty' })).toBeInTheDocument()
  })
})
