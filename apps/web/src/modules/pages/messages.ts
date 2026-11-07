/** Editor-facing text for the keys the domain rules and hooks return (the admin is English-first). */
export const PAGE_ERRORS: Record<string, string> = {
  'pages.slug.reserved': 'This address belongs to the site itself (login, guides, terms…). Choose another.',
  'pages.slug.invalid': 'Use lowercase letters, numbers (or Arabic letters) and single dashes, for example "our-studios".',
  'pages.slug.tooLong': 'The address can be at most 80 characters.',
  'pages.slug.duplicate': 'Another page already uses this address in this language.',
  'pages.slug.required': 'Add the English address before publishing.',
  'pages.nav.headerLimit': 'The header has room for 3 pages. Remove one from the header first.',
  'pages.nav.unknownGroup': 'This footer group does not exist. Add it in Site settings → Footer first.',
  'pages.nav.footerLimit': 'The footer has room for 24 links. Remove one first.',
  'pages.sections.required': 'Add at least one section before publishing.',
  'pages.intent.target': 'Choose at least one of: professional type, specialty or location, so the page is about something.',
  'pages.intent.personaInactive': 'This professional type is not offered on the site right now. Switch it on in Site settings → Audience, or choose another.',
  'pages.intent.unknownStep': 'These answers refer to steps the brief does not have.',
  'pages.intent.faq': 'Each question needs both its text and an answer.',
  'pages.sections.anchor': 'Each section needs its own anchor.',
}

export const pageError = (key: string): string => PAGE_ERRORS[key] ?? key
