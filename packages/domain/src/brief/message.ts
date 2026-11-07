export interface CreatorMessage {
  /** Fills the optional {creator} placeholder, e.g. "Sara Khan (CR-7K4Q2)". */
  creator: string
  /** Worded line added on its own when the template has no {creator}, e.g. "Creator: Sara Khan (CR-7K4Q2)". Defaults to `creator`. */
  creatorLine?: string
}

/**
 * Fills a WhatsApp message or sentence template with the chosen labels (FR-049). With a creator
 * (CP-US2-S2) the optional {creator} placeholder is filled; a template without it gets the creator
 * on its own last line, so the owner never has to edit the CMS template for bookings to name them.
 */
export function renderBriefMessage(
  template: string,
  labels: Readonly<Record<string, string | undefined>>,
  options: { creator?: CreatorMessage | undefined } = {},
): string {
  const creator = options.creator
  const withLine = creator && !template.includes('{creator}') ? `${template}\n${creator.creatorLine ?? creator.creator}` : template
  const all = creator ? { ...labels, creator: creator.creator } : labels
  return withLine
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
