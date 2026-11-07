import type { Payload } from 'payload'
import { rt, type L } from './localize'

// Quick Match defaults (feature 003). Wording only: no prices, ratings or claims are invented here.
// Prices are business data the owner enters in Prices; demo prices exist only in the opt-in demo seed.

type T = { event: string; audience: 'client' | 'creator' | 'admin'; text: L }
const t = (event: string, audience: T['audience'], en: string, ar: string): T => ({ event, audience, text: { en, ar } })

export const quickMatchTemplates: T[] = [
  t('quoted', 'client', 'Hi {name}, your quotation {reference} ({total}) is ready: {link}', 'مرحباً {name}، عرض السعر {reference} ({total}) جاهز: {link}'),
  t('quoted', 'admin', 'New quotation {reference} for {date}, {total}.', 'عرض سعر جديد {reference} بتاريخ {date}، {total}.'),
  t('accepted', 'client', 'Thanks {name}, you accepted {reference}. We are asking your creator to confirm: {link}', 'شكراً {name}، قبلت العرض {reference}. نطلب الآن من المحترف التأكيد: {link}'),
  t('accepted', 'creator', 'New booking {reference} on {date}. Please confirm or decline: {link}', 'حجز جديد {reference} بتاريخ {date}. يرجى التأكيد أو الاعتذار: {link}'),
  t('accepted', 'admin', '{reference} was accepted ({total}). Waiting for the creator.', 'تم قبول {reference} ({total}). بانتظار تأكيد المحترف.'),
  t('confirmed', 'client', 'Good news {name}: {reference} on {date} is confirmed. Please pay {total} and send us the receipt: {link}', 'خبر سار {name}: تم تأكيد {reference} بتاريخ {date}. يرجى دفع {total} وإرسال الإيصال لنا: {link}'),
  t('confirmed', 'admin', '{reference} is confirmed. Waiting for the payment receipt.', 'تم تأكيد {reference}. بانتظار إيصال الدفع.'),
  t('declined', 'client', 'Your creator cannot make {date}. Choose someone else at the same price: {link}', 'المحترف غير متاح في {date}. اختر محترفاً آخر بالسعر نفسه: {link}'),
  t('declined', 'admin', 'A creator declined {reference}. The client can pick someone else, or reassign.', 'اعتذر محترف عن {reference}. يمكن للعميل اختيار غيره، أو أعد التعيين.'),
  t('lapsed', 'client', 'Your creator did not answer in time for {reference}. Choose someone else: {link}', 'لم يرد المحترف في الوقت المحدد على {reference}. اختر محترفاً آخر: {link}'),
  t('lapsed', 'admin', 'No answer from the creator for {reference}. Reassign or let the client choose.', 'لا رد من المحترف على {reference}. أعد التعيين أو دع العميل يختار.'),
  t('reassigned', 'client', 'We have assigned a new creator to {reference}: {link}', 'عيّنّا محترفاً جديداً للحجز {reference}: {link}'),
  t('reassigned', 'creator', 'You have a booking request {reference} on {date}. Please confirm or decline: {link}', 'لديك طلب حجز {reference} بتاريخ {date}. يرجى التأكيد أو الاعتذار: {link}'),
  t('reassigned', 'admin', '{reference} was reassigned.', 'تمت إعادة تعيين {reference}.'),
  t('adjusted', 'client', 'Your quotation {reference} was updated: {total}. {link}', 'تم تحديث عرض السعر {reference}: {total}. {link}'),
  t('adjusted', 'admin', '{reference} now costs {total}.', 'أصبحت قيمة {reference} {total}.'),
  t('paid', 'client', 'We received your payment for {reference}. See you on {date}.', 'استلمنا دفعتك للحجز {reference}. نراك في {date}.'),
  t('paid', 'creator', '{reference} on {date} is paid. The shoot is on.', 'تم دفع {reference} بتاريخ {date}. التصوير قائم.'),
  t('scheduled', 'client', 'Your shoot {reference} is today.', 'تصويرك {reference} اليوم.'),
  t('scheduled', 'creator', 'Shoot {reference} is today.', 'التصوير {reference} اليوم.'),
  t('delivered', 'client', 'Your files for {reference} are delivered. Please confirm, or tell us if something is wrong: {link}', 'تم تسليم ملفات {reference}. يرجى التأكيد، أو أخبرنا إن كان هناك خطأ: {link}'),
  t('completed', 'creator', '{reference} is complete. Your payout is on its way.', 'اكتمل {reference}. دفعتك في الطريق.'),
  t('completed', 'admin', '{reference} is complete. Pay the creator.', 'اكتمل {reference}. ادفع للمحترف.'),
  t('on-hold', 'client', 'We are looking into {reference} and will reply on WhatsApp.', 'نراجع {reference} وسنرد عليك عبر واتساب.'),
  t('on-hold', 'admin', '{reference} is on hold and needs a review.', '{reference} معلّق ويحتاج إلى مراجعة.'),
  t('cancelled', 'client', '{reference} was cancelled.', 'تم إلغاء {reference}.'),
  t('cancelled', 'creator', '{reference} on {date} was cancelled.', 'تم إلغاء {reference} بتاريخ {date}.'),
  t('cancelled', 'admin', '{reference} was cancelled.', 'تم إلغاء {reference}.'),
  t('expired', 'client', 'Your quotation {reference} has expired. Ask for a fresh one: {link}', 'انتهت صلاحية عرض السعر {reference}. اطلب عرضاً جديداً: {link}'),
  t('delivery-overdue', 'admin', 'The client has not confirmed delivery of {reference}. You may complete it.', 'لم يؤكد العميل استلام {reference}. يمكنك إكماله.'),
]

export const quickMatchSettings = {
  enabled: true,
  quotationValidDays: 7,
  confirmHours: 24,
  deliveryConfirmDays: 7,
  payoutDays: 10,
  quoteLimitPerHour: 5,
  paymentInstructions: rt(
    'Pay by bank transfer to the account we share on WhatsApp, then send us the receipt with your reference.',
    'ادفع بتحويل بنكي إلى الحساب الذي نرسله عبر واتساب، ثم أرسل لنا الإيصال مع رقم المرجع.',
  ),
  quotationTerms: rt(
    'Prices include VAT. The date is held once your creator confirms. Payment is held until you confirm delivery.',
    'الأسعار شاملة ضريبة القيمة المضافة. يُحجز الموعد بعد تأكيد المحترف. يُحتفظ بالدفعة حتى تؤكد الاستلام.',
  ),
  channels: { client: ['whatsapp'], creator: ['in-app', 'whatsapp'], admin: ['in-app'] },
  templates: quickMatchTemplates,
}

/** Occasion → specialty, so matching ranks specialists first (research §5). */
export const occasionCategories: Record<string, string> = {
  'wedding-engagement': 'wedding-engagement',
  event: 'events',
  portrait: 'portrait',
  'fashion-beauty': 'fashion-beauty',
  'brand-corporate': 'corporate-branding',
  property: 'real-estate-architecture',
}

// Demo prices: local/e2e only, seeded with the demo creators (never in a real environment).
const DEMO_HOURS: Record<string, number> = { '1h': 450, '2h': 800, '3h': 1100, '4h': 1400, '8h': 2600 }
const DEMO_TRAVEL: Record<string, number> = { dubai: 0, sharjah: 50, ajman: 75, 'abu-dhabi': 150, 'al-ain': 200, 'ras-al-khaimah': 150, fujairah: 150, 'umm-al-quwain': 150 }

export async function seedDemoPrices(payload: Payload, log: (m: string) => void): Promise<void> {
  const context = { disableRevalidate: true }
  const personas = await payload.find({ collection: 'personas', depth: 0, pagination: false })
  for (const persona of personas.docs) {
    const factor = persona.slug === 'videographer' ? 1.25 : 1
    for (const [duration, aed] of Object.entries(DEMO_HOURS)) {
      const found = await payload.find({ collection: 'service-tiers', where: { and: [{ persona: { equals: persona.id } }, { duration: { equals: duration } }] }, limit: 1, depth: 0 })
      if (found.docs[0]) continue
      const hours = Number.parseInt(duration, 10)
      const created = await payload.create({
        collection: 'service-tiers',
        locale: 'en',
        data: {
          title: `${hours}-hour ${persona.singular.toLowerCase()} shoot (demo price)`,
          persona: persona.id,
          duration,
          price: Math.round(aed * factor),
          deliverables: [{ text: persona.slug === 'videographer' ? `${Math.max(1, hours / 2)} edited film(s)` : `${hours * 30} edited photos` }],
          active: true,
          order: hours,
        },
        context,
      })
      const ar = await payload.findByID({ collection: 'service-tiers', id: created.id, depth: 0, locale: 'en' })
      await payload.update({
        collection: 'service-tiers',
        id: created.id,
        locale: 'ar',
        data: {
          title: `تصوير ${hours} ساعة (سعر تجريبي)`,
          deliverables: (ar.deliverables ?? []).map((d) => ({ id: d.id, text: persona.slug === 'videographer' ? `${Math.max(1, hours / 2)} فيلم معدّل` : `${hours * 30} صورة معدّلة` })),
        },
        context,
      })
    }
  }
  for (const [location, fee] of Object.entries(DEMO_TRAVEL)) {
    const found = await payload.find({ collection: 'travel-fees', where: { location: { equals: location } }, limit: 1, depth: 0 })
    if (!found.docs[0]) await payload.create({ collection: 'travel-fees', data: { location, fee, active: true }, context })
  }
  const extras: { en: string; ar: string; price: number }[] = [
    { en: 'Express delivery in 48 hours (demo)', ar: 'تسليم سريع خلال 48 ساعة (تجريبي)', price: 200 },
    { en: '20 extra edited photos (demo)', ar: '20 صورة معدّلة إضافية (تجريبي)', price: 150 },
  ]
  for (const [index, extra] of extras.entries()) {
    const found = await payload.find({ collection: 'add-ons', where: { order: { equals: index + 1 } }, limit: 1, depth: 0 })
    if (found.docs[0]) continue
    const created = await payload.create({ collection: 'add-ons', locale: 'en', data: { title: extra.en, price: extra.price, active: true, order: index + 1 }, context })
    await payload.update({ collection: 'add-ons', id: created.id, locale: 'ar', data: { title: extra.ar }, context })
  }
  const promo = await payload.find({ collection: 'promo-codes', where: { code: { equals: 'WELCOME20' } }, limit: 1, depth: 0 })
  if (!promo.docs[0]) await payload.create({ collection: 'promo-codes', data: { code: 'WELCOME20', kind: 'percent', value: 20, active: true }, context })
  log('Demo prices: tiers, travel fees, two extras, WELCOME20')
}

/**
 * Demo private pages for Lighthouse (local/test hosts only, with the demo creators): brief B-D2222 and
 * quotation Q-D2222 with a fixed salt, so `lighthouserc.quick-match.cjs` can derive their links from
 * PAYLOAD_SECRET. Never part of the default seed.
 */
export const DEMO_QUICK_MATCH = { brief: 'B-D2222', quote: 'Q-D2222', salt: 'demo-quick-match-salt' } as const

export async function seedDemoQuickMatch(payload: Payload, log: (m: string) => void): Promise<void> {
  const context = { disableRevalidate: true, bookingTransition: true }
  const existing = await payload.find({ collection: 'bookings', where: { reference: { equals: DEMO_QUICK_MATCH.quote } }, limit: 1, depth: 0, overrideAccess: true })
  if (existing.docs[0]) return
  const one = async (collection: 'personas' | 'creator-profiles', where: Record<string, unknown>) =>
    (await payload.find({ collection, where: where as never, limit: 1, depth: 0, draft: true, overrideAccess: true })).docs[0]
  const persona = await one('personas', { slug: { equals: 'photographer' } })
  const creator = await one('creator-profiles', { code: { equals: 'D2222' } })
  if (!persona || !creator) throw new Error('Seed the demo creators before the demo quotation.')
  const date = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)
  const selections = [
    { token: 'persona', value: 'photographer', label: 'photographer', custom: false },
    { token: 'occasion', value: 'event', label: 'an event', custom: false },
    { token: 'date', value: date, label: date, custom: false },
    { token: 'duration', value: '2h', label: '2 hours', custom: false },
    { token: 'location', value: 'dubai', label: 'Dubai', custom: false },
    { token: 'shotBy', value: 'anyone', label: 'anyone', custom: false },
  ]
  const brief = await payload.create({
    collection: 'briefs',
    data: { persona: [persona.id], selections, date, sentence: 'I need a photographer for an event for 2 hours in Dubai, shot by anyone. (demo)', locale: 'en', sourcePath: '/' } as never,
    overrideAccess: true,
    context: { ...context, accessSalt: DEMO_QUICK_MATCH.salt, visitorId: 'demo-seed' },
  })
  await payload.update({ collection: 'briefs', id: brief.id, data: { reference: DEMO_QUICK_MATCH.brief } as never, overrideAccess: true, context })
  const now = new Date()
  const validUntil = new Date(now.getTime() + 365 * 86_400_000).toISOString()
  const booking = await payload.create({
    collection: 'bookings',
    data: {
      reference: DEMO_QUICK_MATCH.quote,
      state: 'quoted',
      revision: 0,
      brief: brief.id,
      accessSalt: DEMO_QUICK_MATCH.salt,
      client: { name: 'Demo Client', whatsapp: '+971500000001', locale: 'en' },
      date,
      location: 'dubai',
      personas: [persona.id],
      assignments: [{ persona: persona.id, creator: creator.id, status: 'pending' }],
      totalFils: 80000,
      quoteValidUntil: validUntil,
    } as never,
    overrideAccess: true,
    context,
  })
  const quotation = await payload.create({
    collection: 'quotations',
    data: {
      reference: DEMO_QUICK_MATCH.quote,
      booking: booking.id,
      brief: brief.id,
      version: 1,
      lines: [{ kind: 'tier', labelEn: '2-hour photographer shoot (demo price)', labelAr: 'تصوير ساعتين (سعر تجريبي)', amountFils: 80000, persona: persona.id, deliverables: { en: ['60 edited photos'], ar: ['60 صورة معدّلة'] } }],
      subtotalFils: 80000,
      discountFils: 0,
      totalFils: 80000,
      validUntil,
      issuedAt: now.toISOString(),
    } as never,
    overrideAccess: true,
    context,
  })
  await payload.update({ collection: 'bookings', id: booking.id, data: { quotation: quotation.id } as never, overrideAccess: true, context })
  log(`Demo quotation: ${DEMO_QUICK_MATCH.quote} for brief ${DEMO_QUICK_MATCH.brief}`)
}
