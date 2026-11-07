import type { Payload } from 'payload'
import { pickLocale, richText, withRowIds, type L } from './localize'

const context = { disableRevalidate: true }

const para = (en: string, ar: string): L<ReturnType<typeof richText>> => ({ en: richText(en), ar: richText(ar, 'rtl') })

/**
 * The Studios page (spec US1). It says only what the service does today — studios are arranged
 * by the team on WhatsApp — and names no studio, price or photo it cannot stand behind.
 * An existing page is never touched: from then on it belongs to the editors.
 */
export async function seedStudiosPage(payload: Payload, log: (message: string) => void): Promise<void> {
  const found = await payload.find({ collection: 'pages', where: { slug: { equals: 'studios' } }, locale: 'en', fallbackLocale: false, draft: true, limit: 1, depth: 0 })
  if (found.docs[0]) {
    log('Studios page already exists, left as it is')
    return
  }
  const tree = {
    kind: 'standard',
    title: { en: 'Studios', ar: 'الاستوديوهات' },
    slug: { en: 'studios', ar: 'استوديوهات' },
    placement: { inHeader: false, footerGroup: 'company', order: 10 },
    seo: {
      title: { en: 'Studios for photo and video shoots', ar: 'استوديوهات للتصوير الفوتوغرافي والفيديو' },
      description: {
        en: 'Tell us what you are shooting and we find a studio that fits. We reply on WhatsApp.',
        ar: 'أخبرنا بما ستصوّره ونجد لك استوديو مناسباً. نردّ عليك عبر واتساب.',
      },
    },
    sections: [
      {
        blockType: 'richText',
        content: para(
          'Some shoots need a studio: product work, portraits, a podcast or a small set. Tell us in your brief what you are shooting and how many people will be there.',
          'بعض جلسات التصوير تحتاج إلى استوديو: تصوير منتجات أو بورتريه أو بودكاست أو ديكور صغير. أخبرنا في طلبك بما ستصوّره وكم شخصاً سيحضر.',
        ),
      },
      {
        blockType: 'callToAction',
        anchor: 'studio-brief',
        heading: { en: 'Need a studio?', ar: 'تحتاج إلى استوديو؟' },
        body: { en: 'Send a brief and we will come back on WhatsApp with options.', ar: 'أرسل طلباً وسنعود إليك على واتساب بالخيارات المتاحة.' },
        primary: { label: { en: 'Start a brief', ar: 'ابدأ طلباً' }, kind: 'link', href: '/' },
        secondary: { label: { en: 'WhatsApp us', ar: 'راسلنا على واتساب' }, kind: 'whatsapp' },
      },
    ],
    _status: 'published',
  }
  const en = await payload.create({ collection: 'pages', data: pickLocale(tree, 'en') as never, locale: 'en', draft: false, depth: 0, context })
  await payload.update({
    collection: 'pages',
    id: en.id,
    data: withRowIds(pickLocale(tree, 'ar'), en) as never,
    locale: 'ar',
    draft: false,
    depth: 0,
    context,
  })
  log('Studios page published')
}
