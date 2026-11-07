import { describe, expect, it } from 'vitest'
import { faqJsonLd, jsonLdScript } from './structured-data'

describe('MP-US4-S3 faqJsonLd', () => {
  it('returns null when no item has both a question and an answer', () => {
    expect(faqJsonLd({ items: [], locale: 'en' })).toBeNull()
    expect(faqJsonLd({ items: [{ question: 'Q?', answer: ' ' }, { question: null, answer: 'A' }], locale: 'en' })).toBeNull()
  })

  it('builds a FAQPage from the complete items only', () => {
    expect(
      faqJsonLd({ items: [{ question: ' How? ', answer: ' Like this. ' }, { question: 'Skipped?', answer: '' }], locale: 'ar' }),
    ).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: 'ar',
      mainEntity: [{ '@type': 'Question', name: 'How?', acceptedAnswer: { '@type': 'Answer', text: 'Like this.' } }],
    })
  })
})

describe('jsonLdScript', () => {
  it('escapes < so content cannot close the script tag', () => {
    const out = jsonLdScript({ text: '</script><b>' })
    expect(out).not.toContain('<')
    expect(JSON.parse(out)).toEqual({ text: '</script><b>' })
  })
})
