import type { Payload } from 'payload'
import { landingPage } from './content'
import { pickLocale, richText, withRowIds, type L } from './localize'

const context = { disableRevalidate: true }

const para = (en: string, ar: string): L<ReturnType<typeof richText>> => ({ en: richText(en), ar: richText(ar, 'rtl') })

/**
 * The Studios page (spec US1). It says only what the service does today — studios are arranged
 * by the team on WhatsApp — and names no studio, price or photo it cannot stand behind.
 * An existing page is never touched: from then on it belongs to the editors.
 */
export async function seedStudiosPage(payload: Payload, log: (message: string) => void): Promise<void> {
  await publishOnce(payload, log, 'Studios', {
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
  })
}

/** A landing seed section by its block type; the How it works page reuses its copy as it is. */
const landingSection = (type: string): Record<string, unknown> => {
  const found = landingPage.sections.find((s) => s.blockType === type)
  if (!found) throw new Error(`The landing seed has no ${type} section`)
  return found as Record<string, unknown>
}

/**
 * The How it works page (015 US: board 35, opened from the app's menu at `/how-it-works`). It
 * reuses the landing's three steps and questions, so the learning steps, the landing and this page
 * say the same thing; the intro is the steps' subheading. No call-to-action section: the app's
 * footer and the steps' own action are "Start a brief". An existing page is never touched.
 */
export async function seedHowItWorksPage(payload: Payload, log: (message: string) => void): Promise<void> {
  const steps = landingSection('howItWorks')
  const faq = landingSection('faq')
  await publishOnce(payload, log, 'How it works', {
    kind: 'standard',
    title: { en: 'How it works', ar: 'كيف نعمل' },
    slug: { en: 'how-it-works', ar: 'كيف-نعمل' },
    placement: { inHeader: false, footerGroup: 'company', order: 5 },
    seo: {
      title: { en: 'How booking a shoot works', ar: 'كيف يعمل حجز جلسة التصوير' },
      description: {
        en: 'Brief in one line, see who is free on your date, and talk to them on WhatsApp.',
        ar: 'اكتب طلبك في سطر واحد، واعرف من المتاح في تاريخك، وتحدّث معه عبر واتساب.',
      },
    },
    sections: [
      {
        blockType: 'howItWorks',
        anchor: 'steps',
        heading: steps.heading,
        subheading: steps.subheading,
        steps: steps.steps,
        cta: { label: { en: 'Start a brief', ar: 'ابدأ طلباً' }, kind: 'link', href: '/' },
      },
      { blockType: 'faq', anchor: 'questions', heading: faq.heading, items: faq.items },
    ],
  })
}

/** Publishes [tree] in English then Arabic, unless a page with its English slug exists already. */
async function publishOnce(payload: Payload, log: (message: string) => void, name: string, page: Record<string, unknown> & { slug: L }): Promise<void> {
  const found = await payload.find({ collection: 'pages', where: { slug: { equals: page.slug.en } }, locale: 'en', fallbackLocale: false, draft: true, limit: 1, depth: 0 })
  if (found.docs[0]) {
    log(`${name} page already exists, left as it is`)
    return
  }
  const tree = { ...page, _status: 'published' }
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
  log(`${name} page published`)
}
