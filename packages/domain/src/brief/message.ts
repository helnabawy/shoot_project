/** Fills a WhatsApp message or sentence template with the chosen labels (FR-049). */
export function renderBriefMessage(template: string, labels: Readonly<Record<string, string | undefined>>): string {
  return template
    .replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (_match, token: string) => labels[token] ?? '')
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
