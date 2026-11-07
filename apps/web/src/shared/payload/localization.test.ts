import { describe, expect, it } from 'vitest'
import { findUntranslatedFields, LOCALES } from './localization'

describe('FR-038 untranslated field detection', () => {
  it('lists English-only leaves by dotted path, through groups, arrays and blocks', () => {
    const doc = {
      id: 1,
      hero: { headline: { en: 'You brief.', ar: 'أنت تحدّد.' }, subheadline: { en: 'Sub', ar: '' } },
      sections: [
        { id: 'a', blockType: 'faq', heading: { en: 'FAQ', ar: null }, items: [{ question: { en: 'Q?', ar: 'س؟' } }] },
      ],
      answer: { en: { root: { children: [{ text: 'Yes' }] } }, ar: { root: { children: [{ text: ' ' }] } } },
      untranslatedEmpty: { en: '', ar: '' },
      shared: 'not localised',
      _status: 'published',
    }
    expect(findUntranslatedFields(doc, 'ar')).toEqual(['hero.subheadline', 'sections.0.heading', 'answer'])
    expect(LOCALES).toContain('ar')
  })

  it('returns nothing for fully translated or non-localised values', () => {
    expect(findUntranslatedFields({ a: { en: 'x', ar: 'y' }, b: 3 }, 'ar')).toEqual([])
    expect(findUntranslatedFields(null, 'ar')).toEqual([])
  })
})
