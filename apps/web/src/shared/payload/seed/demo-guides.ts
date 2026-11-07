import type { Payload } from 'payload'
import sharp from 'sharp'
import { assertDemoHostAllowed } from './demo-creators'
import { richText } from './localize'

const context = { disableRevalidate: true }

const TOPICS = [
  'How to brief a photographer',
  'What to prepare before a shoot day',
  'Choosing between photo and video',
  'How long does a shoot take',
  'Planning a shoot in the heat',
  'What to wear on camera',
  'Working with a small budget',
  'Shooting at home or in a studio',
  'Delivery: what you receive and when',
  'How many photos do you need',
]

/** A flat colour rectangle: obviously a placeholder, never mistaken for photography. */
async function cover(n: number): Promise<Buffer> {
  const colour = ['#B9A58F', '#8FA8B9', '#A8B98F', '#B98F9C'][n % 4]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="${colour}"/></svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

/**
 * Local, e2e and Lighthouse only (refused on any other host): two authors, three categories, thirty guides
 * (three scheduled for the future, six with Arabic text) and one intent page. Obvious demo text, no names,
 * numbers or quotes that could pass for real (Principle IX). Running it twice changes nothing.
 */
export async function seedDemoGuides(payload: Payload, options: { siteUrl?: string; log: (message: string) => void }): Promise<void> {
  assertDemoHostAllowed(options.siteUrl)
  if ((await payload.count({ collection: 'articles' })).totalDocs > 0) {
    options.log('Demo guides already exist, left as they are')
    return
  }

  const image = async (n: number) => {
    const data = await cover(n)
    return payload.create({ collection: 'media', data: { alt: `Demo cover ${n}, not a real photograph` }, file: { data, mimetype: 'image/png', name: `demo-guide-${n}.png`, size: data.length }, context })
  }
  const author = async (slug: string, en: string, ar: string) => {
    const created = await payload.create({ collection: 'authors', data: { slug, name: en, bio: 'Demo author.' } as never, locale: 'en', context })
    await payload.update({ collection: 'authors', id: created.id, data: { name: ar, bio: 'كاتب تجريبي.' } as never, locale: 'ar', context })
    return created
  }
  const category = async (slug: string, en: string, ar: string) => {
    const created = await payload.create({ collection: 'article-categories', data: { slug, name: en } as never, locale: 'en', context })
    await payload.update({ collection: 'article-categories', id: created.id, data: { name: ar } as never, locale: 'ar', context })
    return created
  }
  const [sara, omar] = [await author('demo-sara', 'Sara Demo', 'سارة (تجريبي)'), await author('demo-omar', 'Omar Demo', 'عمر (تجريبي)')]
  const categories = [await category('planning', 'Planning', 'التخطيط'), await category('on-the-day', 'On the day', 'يوم التصوير'), await category('after-the-shoot', 'After the shoot', 'بعد التصوير')]
  const covers = [await image(0), await image(1), await image(2), await image(3)]

  const DAY = 24 * 60 * 60 * 1000
  const now = Date.now()
  for (let n = 1; n <= 30; n += 1) {
    const title = `${TOPICS[(n - 1) % TOPICS.length]}${n > TOPICS.length ? ` (${Math.ceil(n / TOPICS.length)})` : ''}`
    const future = n > 27
    const created = await payload.create({
      collection: 'articles',
      data: {
        title,
        slug: `demo-guide-${String(n).padStart(2, '0')}`,
        summary: `Demo guide ${n}: a short, plain summary of what this guide covers.`,
        body: richText(`Demo guide ${n}. This is sample text for local development and tests, not advice.\nIt only shows how a guide reads.`),
        cover: covers[n % covers.length]!.id,
        author: (n % 2 ? sara : omar).id,
        categories: [categories[n % categories.length]!.id],
        publishedAt: new Date(future ? now + (n - 27) * 30 * DAY : now - (31 - n) * DAY).toISOString(),
        _status: 'published',
      } as never,
      locale: 'en',
      draft: false,
      context,
    })
    if (n <= 6) {
      await payload.update({
        collection: 'articles',
        id: created.id,
        locale: 'ar',
        data: { title: `دليل تجريبي ${n}`, summary: `دليل تجريبي ${n}: ملخص قصير وواضح.`, body: richText('نص تجريبي للتطوير والاختبار وليس نصيحة.', 'rtl'), _status: 'published' } as never,
        draft: false,
        context,
      })
    }
  }
  options.log('Demo guides: 30 guides (3 scheduled), 2 authors, 3 categories')

  const bySlug = async (collection: 'personas' | 'categories' | 'locations', slug: string) =>
    (await payload.find({ collection, where: { slug: { equals: slug } }, limit: 1, depth: 0 })).docs[0]?.id
  const persona = await bySlug('personas', 'photographer')
  const location = await bySlug('locations', 'dubai')
  if (!persona || !location) throw new Error('Seed the default content first: the photographer persona and Dubai are missing.')
  const intent = {
    kind: 'intent',
    title: { en: 'Proposal photographer in Dubai', ar: 'مصور خطوبة في دبي' },
    slug: { en: 'proposal-photographer-dubai', ar: 'proposal-photographer-dubai' },
    intent: {
      persona,
      location,
      presets: [{ token: 'occasion', value: 'event' }],
      intro: { en: 'Tell us about the day and we find someone who shoots proposals.', ar: 'أخبرنا عن اليوم ونجد لك من يصوّر الخطوبة.' },
      faq: [
        {
          question: { en: 'How far ahead should I book?', ar: 'قبل كم من الوقت يجب أن أحجز؟' },
          answer: { en: richText('As early as you know the date. We reply on WhatsApp with who is free.'), ar: richText('بأسرع ما تعرف الموعد. نردّ على واتساب بمن هو متاح.', 'rtl') },
        },
        {
          question: { en: 'Can I change the plan later?', ar: 'هل يمكنني تغيير الخطة لاحقاً؟' },
          answer: { en: richText('Yes. Message us and we adjust it with the professional.'), ar: richText('نعم. راسلنا ونعدّلها مع المحترف.', 'rtl') },
        },
      ],
    },
    sections: [{ blockType: 'richText', content: { en: richText('Demo page for local development.'), ar: richText('صفحة تجريبية للتطوير المحلي.', 'rtl') } }],
    _status: 'published',
  }
  const { pickLocale, withRowIds } = await import('./localize')
  const en = await payload.create({ collection: 'pages', data: pickLocale(intent, 'en') as never, locale: 'en', draft: false, depth: 0, context })
  await payload.update({ collection: 'pages', id: en.id, data: withRowIds(pickLocale(intent, 'ar'), en) as never, locale: 'ar', draft: false, depth: 0, context })
  options.log('Demo intent page: /hire/proposal-photographer-dubai')
}
