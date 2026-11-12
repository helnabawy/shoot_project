import { describe, expect, it } from 'vitest'
import { resolveBrief } from '../submit'
import type { BriefBuilderConfig } from '../types'
import { PROBLEM_FOR, toAnswers } from './brief-answers'

const opt = (value: string, personas: string[] = []) => ({ value, label: value, sentenceLabel: value, glyph: null, personas })
const config = {
  locale: 'en',
  sentence: 'I need {persona} for {occasion} on {date}.',
  whatsappTemplate: 'Hi {persona} {occasion} {date}',
  slots: [
    { token: 'persona', kind: 'persona', placeholder: 'who', required: true, multiple: true, allowCustom: false, groupLabel: 'p', defaultValue: '', options: [opt('photographer'), opt('videographer')] },
    { token: 'occasion', kind: 'options', placeholder: 'what', required: true, multiple: false, allowCustom: false, groupLabel: 'o', defaultValue: '', options: [opt('wedding')] },
    { token: 'date', kind: 'date', placeholder: 'any date', required: false, multiple: false, allowCustom: false, groupLabel: 'd', defaultValue: '', options: [] },
  ],
} as unknown as BriefBuilderConfig

const sel = (token: string, value: string) => ({ token, value })

describe('ML-US1-S6 toAnswers', () => {
  it('joins a multiple slot in pick order and maps the date', () => {
    const r = toAnswers(config, { selections: [sel('persona', 'videographer'), sel('persona', 'photographer'), sel('occasion', 'wedding')], date: '2999-01-01' })
    expect(r.ok && r.answers.values).toEqual({ persona: 'videographer,photographer', occasion: 'wedding', date: '2999-01-01' })
  })

  it('reports an unknown token', () => {
    expect(toAnswers(config, { selections: [sel('mood', 'x')], date: null })).toEqual({ ok: false, token: 'mood' })
  })

  it('the shared validator accepts a complete brief and the result is recordable', () => {
    const r = toAnswers(config, { selections: [sel('persona', 'photographer'), sel('occasion', 'wedding')], date: null })
    expect(r.ok && resolveBrief(config, r.answers).ok).toBe(true)
  })
})

describe('ML-US1-S5 and S7 problem codes', () => {
  it('a missing required step is `required`', () => {
    const r = toAnswers(config, { selections: [sel('persona', 'photographer')], date: null })
    const parsed = r.ok ? resolveBrief(config, r.answers) : null
    expect(parsed && !parsed.ok && PROBLEM_FOR[parsed.errors.occasion as string]).toBe('brief.errors.required')
  })

  it('ML-US1-S7 a past date is `pastDate`', () => {
    const r = toAnswers(config, { selections: [sel('persona', 'photographer'), sel('occasion', 'wedding')], date: '2000-01-01' })
    const parsed = r.ok ? resolveBrief(config, r.answers) : null
    expect(parsed && !parsed.ok && PROBLEM_FOR[parsed.errors.date as string]).toBe('brief.errors.pastDate')
  })

  it('ML-US1-S6 an option that is no longer offered is `optionGone`', () => {
    const r = toAnswers(config, { selections: [sel('persona', 'photographer'), sel('occasion', 'funeral')], date: null })
    const parsed = r.ok ? resolveBrief(config, r.answers) : null
    expect(parsed && !parsed.ok && PROBLEM_FOR[parsed.errors.occasion as string]).toBe('brief.errors.optionGone')
  })
})
