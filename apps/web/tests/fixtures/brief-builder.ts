import type { BriefBuilderConfig } from '@/modules/brief/types'

const opt = (value: string, label: string, personas: string[] = [], glyph?: string) => ({ value, label, sentenceLabel: label, glyph, personas })

export function briefBuilderFixture(
  locale: 'en' | 'ar' = 'en',
  personas = ['photographer', 'videographer'],
  options: { multiple?: boolean } = {},
): BriefBuilderConfig {
  const ar = locale === 'ar'
  return {
    locale,
    sentence: ar
      ? 'أحتاج {persona} من أجل {occasion} بتاريخ {date} لمدة {duration} في {location}.'
      : 'I need a {persona} for {occasion} on {date} for {duration} in {location}.',
    slots: [
      {
        token: 'persona',
        kind: 'persona',
        groupLabel: ar ? 'المحترف' : 'Professional',
        placeholder: ar ? 'أي محترف' : 'which professional',
        defaultValue: 'photographer',
        required: true,
        allowCustom: false,
        multiple: options.multiple ?? false,
        options: personas.map((p) => ({
          value: p,
          label: { photographer: ar ? 'مصوّر' : 'Photographer', videographer: ar ? 'مصوّر فيديو' : 'Videographer', teacher: ar ? 'معلّم' : 'Teacher' }[p] ?? p,
          sentenceLabel: { photographer: ar ? 'مصوّر' : 'photographer', videographer: ar ? 'مصوّر فيديو' : 'videographer', teacher: ar ? 'معلّم' : 'teacher' }[p] ?? p,
          personas: [],
        })),
      },
      {
        token: 'occasion',
        kind: 'options',
        groupLabel: ar ? 'المناسبة' : 'Occasion',
        placeholder: ar ? 'أي مناسبة' : 'what occasion',
        defaultValue: 'event',
        required: true,
        allowCustom: true, multiple: false,
        options: [
          opt('wedding', ar ? 'زفاف' : 'a wedding', [], 'W'),
          opt('event', ar ? 'فعالية' : 'an event', [], 'E'),
          opt('portrait', ar ? 'بورتريه' : 'a portrait', [], 'P'),
          opt('drone', ar ? 'درون' : 'drone shots', ['videographer'], 'D'),
          opt('maths', ar ? 'رياضيات' : 'maths', ['teacher'], 'M'),
        ],
      },
      { token: 'date', kind: 'date', groupLabel: ar ? 'متى' : 'When', placeholder: ar ? 'مفتوح' : 'any date', defaultValue: '', required: false, allowCustom: false, multiple: false, options: [] },
      {
        token: 'duration',
        kind: 'options',
        groupLabel: ar ? 'المدة' : 'How long',
        placeholder: ar ? 'كم من الوقت' : 'how long',
        defaultValue: '2h',
        required: true,
        allowCustom: false, multiple: false,
        options: [opt('1h', ar ? 'ساعة' : '1 hour'), opt('2h', ar ? 'ساعتين' : '2 hours')],
      },
      {
        token: 'location',
        kind: 'options',
        groupLabel: ar ? 'الإمارة' : 'Emirate',
        placeholder: ar ? 'أي إمارة' : 'which emirate',
        defaultValue: '',
        required: true,
        allowCustom: false, multiple: false,
        options: [opt('dubai', ar ? 'دبي' : 'Dubai'), opt('sharjah', ar ? 'الشارقة' : 'Sharjah')],
      },
    ],
    submitLabel: ar ? 'اعرف من المتاح' : "See who's free",
    helperText: '',
    whatsappTemplate: 'Hi! I need a {persona} for {occasion}.',
    successMessage: '',
    steps: [],
  }
}
