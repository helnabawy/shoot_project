export interface CreatorMessage {
  /** Fills the optional {creator} placeholder, e.g. "Sara Khan (CR-7K4Q2)". */
  creator: string
  /** Worded line added on its own when the template has no {creator}, e.g. "Creator: Sara Khan (CR-7K4Q2)". Defaults to `creator`. */
  creatorLine?: string
}

export interface ReferenceMessage {
  /** Fills the optional {reference} placeholder, e.g. "B-7K4Q2". */
  reference: string
  /** Worded line added on its own when the template has no {reference}, e.g. "Brief ID: B-7K4Q2". Defaults to `reference`. */
  referenceLine?: string
}

/**
 * Fills a WhatsApp message or sentence template with the chosen labels (FR-049). With a creator
 * (CP-US2-S2) the optional {creator} placeholder is filled; with a brief reference (FR-055) the optional
 * {reference} placeholder is. A template without a placeholder gets that value on its own last line
 * (creator first, then the brief ID), so the owner never has to edit the CMS template for them to appear.
 */
export function renderBriefMessage(
  template: string,
  labels: Readonly<Record<string, string | undefined>>,
  options: { creator?: CreatorMessage | undefined; reference?: ReferenceMessage | undefined } = {},
): string {
  const { creator, reference } = options
  const lines = [template]
  if (creator && !template.includes('{creator}')) lines.push(creator.creatorLine ?? creator.creator)
  if (reference && !template.includes('{reference}')) lines.push(reference.referenceLine ?? reference.reference)
  const all: Readonly<Record<string, string | undefined>> = {
    ...labels,
    ...(creator ? { creator: creator.creator } : {}),
    ...(reference ? { reference: reference.reference } : {}),
  }
  return lines
    .join('\n')
    .replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (_match, token: string) => all[token] ?? '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ([,.،])/g, '$1')
    .trim()
}

/** A human date for messages, e.g. "Fri 21 Nov" / "الجمعة 21 نوفمبر". Input is YYYY-MM-DD. */
export function formatBriefDate(isoDate: string, locale: string): string {
  const date = new Date(`${isoDate}T12:00:00Z`)
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(date)
}
