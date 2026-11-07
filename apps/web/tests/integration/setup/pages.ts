import type { Payload } from 'payload'
import { createUser, getTestPayload, quiet, resetDatabase } from './payload'

export type TestUser = Awaited<ReturnType<typeof createUser>>

export interface PagesWorld {
  payload: Payload
  editor: TestUser
  admin: TestUser
  member: TestUser
}

/** A Lexical editor state with one paragraph. */
export const lexical = (text: string) =>
  ({
    root: {
      type: 'root',
      version: 1,
      direction: 'ltr',
      format: '',
      indent: 0,
      children: [
        { type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, children: [{ type: 'text', text, version: 1, format: 0, detail: 0, mode: 'normal', style: '' }] },
      ],
    },
  }) as never

export const section = (anchor = 'intro', text = 'Hello') => ({ blockType: 'richText' as const, anchor, content: lexical(text) })

/** An empty database with an editor, an admin, a member and two footer groups. */
export async function pagesWorld(): Promise<PagesWorld> {
  await resetDatabase()
  const payload = await getTestPayload()
  const [editor, admin, member] = await Promise.all([createUser(['editor']), createUser(['admin']), createUser(['member'])])
  await payload.updateGlobal({
    slug: 'site-settings',
    data: {
      siteName: 'Shoot',
      whatsappNumber: '+971500000001',
      footerGroups: [
        { key: 'company', label: 'Company' },
        { key: 'help', label: 'Help' },
      ],
    },
    context: quiet,
  })
  return { payload, editor, admin, member }
}

/** The editor creates (and publishes) a page through the access rules, as the admin UI would. */
export async function createPage(world: PagesWorld, data: Record<string, unknown> = {}, context: Record<string, unknown> = quiet) {
  return world.payload.create({
    collection: 'pages',
    data: { title: 'Studios', slug: 'studios', sections: [section()], _status: 'published', ...data } as never,
    draft: false,
    user: world.editor,
    overrideAccess: false,
    context,
  })
}

/** Writes the Arabic text of a page as the editor. */
export async function translatePage(world: PagesWorld, id: number, data: Record<string, unknown>, status: 'draft' | 'published' = 'published') {
  return world.payload.update({
    collection: 'pages',
    id,
    locale: 'ar',
    data: { ...data, _status: status } as never,
    draft: status === 'draft',
    user: world.editor,
    overrideAccess: false,
    context: quiet,
  })
}

/** Asserts a write was refused, matching the pattern against the message and Payload's field errors. */
export async function refused(call: Promise<unknown>, pattern: RegExp): Promise<void> {
  try {
    await call
  } catch (error) {
    const data = (error as { data?: unknown }).data
    const text = `${(error as Error).message} ${data ? JSON.stringify(data) : ''}`
    if (!pattern.test(text)) throw new Error(`Refused, but not as expected. Wanted ${pattern}, got: ${text}`)
    return
  }
  throw new Error(`Expected the write to be refused (${pattern}) but it succeeded`)
}

export type LegalKindName = 'terms' | 'professional-terms' | 'privacy'

/** The admin creates a legal document with the given version rows. */
export async function createLegal(world: PagesWorld, kind: LegalKindName, versions: Record<string, unknown>[], extra: Record<string, unknown> = {}) {
  return world.payload.create({
    collection: 'legal-documents',
    data: { kind, title: kind === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions', versions, ...extra } as never,
    user: world.admin,
    overrideAccess: false,
    context: quiet,
  })
}

export const version = (text: string, extra: Record<string, unknown> = {}) => ({
  state: 'published',
  effectiveFrom: '2026-01-01T00:00:00.000Z',
  changeSummary: `Summary of ${text}`,
  body: lexical(text),
  ...extra,
})

export const NOW = new Date('2026-11-07T12:00:00Z')

export interface GuidesWorld extends PagesWorld {
  image: { id: number }
  author: { id: number; slug: string }
  categories: { wedding: { id: number }; corporate: { id: number } }
}

/** An editor's world with one image, one author and two categories. */
export async function guidesWorld(): Promise<GuidesWorld> {
  const world = await pagesWorld()
  const { default: sharp } = await import('sharp')
  const data = await sharp({ create: { width: 16, height: 16, channels: 3, background: '#888888' } }).png().toBuffer()
  const image = await world.payload.create({ collection: 'media', data: { alt: 'A cover' }, file: { data, mimetype: 'image/png', name: 'cover.png', size: data.length }, user: world.editor, overrideAccess: false, context: quiet })
  const author = await world.payload.create({ collection: 'authors', data: { slug: 'sara', name: 'Sara Khan', bio: 'Writes about shoots.' } as never, user: world.editor, overrideAccess: false, context: quiet })
  const wedding = await world.payload.create({ collection: 'article-categories', data: { slug: 'weddings', name: 'Weddings' } as never, user: world.editor, overrideAccess: false, context: quiet })
  const corporate = await world.payload.create({ collection: 'article-categories', data: { slug: 'corporate', name: 'Corporate' } as never, user: world.editor, overrideAccess: false, context: quiet })
  return { ...world, image, author, categories: { wedding, corporate } }
}

/** The editor publishes a guide (published a month before NOW unless said otherwise). */
export async function createGuide(g: GuidesWorld, data: Record<string, unknown> = {}) {
  return g.payload.create({
    collection: 'articles',
    data: {
      title: 'How to brief a wedding photographer',
      slug: 'brief-a-wedding-photographer',
      summary: 'What to say before the day.',
      body: lexical('Start with the date, the place and the people who matter.'),
      cover: g.image.id,
      author: g.author.id,
      categories: [g.categories.wedding.id],
      publishedAt: '2026-10-01T00:00:00.000Z',
      _status: 'published',
      ...data,
    } as never,
    draft: data._status === 'draft',
    user: g.editor,
    overrideAccess: false,
    context: quiet,
  })
}

/** The editor writes the Arabic text of a guide. */
export async function translateGuide(g: GuidesWorld, id: number, data: Record<string, unknown>) {
  return g.payload.update({ collection: 'articles', id, locale: 'ar', data: { ...data, _status: 'published' } as never, draft: false, user: g.editor, overrideAccess: false, context: quiet })
}
