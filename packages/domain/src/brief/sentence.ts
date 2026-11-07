export type SentencePart = { type: 'text'; value: string } | { type: 'token'; name: string; known: boolean }

const TOKEN = /\{([a-zA-Z][a-zA-Z0-9]*)\}/g

/** Splits a brief sentence template into text and slot tokens, in order (FR-046). */
export function parseSentence(template: string, knownTokens?: readonly string[]): SentencePart[] {
  const parts: SentencePart[] = []
  let last = 0
  for (const match of template.matchAll(TOKEN)) {
    const index = match.index ?? 0
    if (index > last) parts.push({ type: 'text', value: template.slice(last, index) })
    const name = match[1] as string
    parts.push({ type: 'token', name, known: knownTokens ? knownTokens.includes(name) : true })
    last = index + match[0].length
  }
  if (last < template.length) parts.push({ type: 'text', value: template.slice(last) })
  return parts
}

/** Tokens used by a sentence, in order of first appearance. */
export function sentenceTokens(template: string): string[] {
  return [...new Set([...template.matchAll(TOKEN)].map((m) => m[1] as string))]
}

/**
 * Checks that a sentence and its slot definitions agree: every token has a slot and every slot
 * appears in the sentence. Returns the problems found (empty when consistent).
 */
export function checkSentenceSlots(template: string, slotTokens: readonly string[]): {
  missingSlots: string[]
  unusedSlots: string[]
} {
  const tokens = sentenceTokens(template)
  return {
    missingSlots: tokens.filter((t) => !slotTokens.includes(t)),
    unusedSlots: slotTokens.filter((t) => !tokens.includes(t)),
  }
}

/**
 * Leaves out tokens the visitor did not set, together with the joining words just before them
 * ("on {date}" → ""), so an unset optional part is not printed as if it were a choice. Leading
 * punctuation of the joining text (", shot by") is kept.
 */
export function omitTokens(parts: readonly SentencePart[], omit: (name: string) => boolean): SentencePart[] {
  const out: SentencePart[] = []
  for (const part of parts) {
    if (part.type === 'token' && omit(part.name)) {
      const prev = out[out.length - 1]
      if (prev?.type === 'text') {
        const punctuation = /^\s*([,.،؛;:])/.exec(prev.value)?.[1] ?? ''
        out[out.length - 1] = { type: 'text', value: `${punctuation} ` }
      }
      continue
    }
    const prev = out[out.length - 1]
    if (part.type === 'text' && prev?.type === 'text') {
      // Join the text around a removed token and collapse the doubled space.
      out[out.length - 1] = { type: 'text', value: (prev.value + part.value).replace(/\s{2,}/g, ' ').replace(/[,،؛;:]\s*([.,،؛;:])/g, '$1') }
    } else {
      out.push(part)
    }
  }
  return out
}

/** Turns parts back into a template string ("I need a {persona}…"). */
export const joinSentence = (parts: readonly SentencePart[]): string =>
  parts.map((p) => (p.type === 'text' ? p.value : `{${p.name}}`)).join('')
