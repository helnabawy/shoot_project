/** Every string the brief builder shows, resolved on the server (no i18n runtime in the browser). */
export interface BriefLabels {
  barLabel: string
  filterPlaceholder: string
  topHit: string
  actions: string
  set: string
  pickADate: string
  /** The skip row of an optional date step. */
  anyDate: string
  chooseOne: string
  /** Hint on a group that takes several choices (FR-063). */
  pickAny: string
  orType: string
  submitting: string
  /** Contains "{count}". */
  showMore: string
  /** The field's prompt before anything is chosen (FR-064). */
  searchPrompt: string
  /** The field's prompt once the brief is complete. */
  typeToChange: string
  /** Moves on from a step that takes several choices. */
  continueLabel: string
  /** Contains "{step}" and "{total}". */
  stepOf: string
  /** Shown instead of the field without JavaScript. */
  noJsHint: string
  whatsappInstead: string
  successTitle: string
  successNextTitle: string
  /** Contains "{reference}". */
  successReference: string
  /** Contains "{replyTime}". */
  successNext: string
  successOpenWhatsapp: string
  successAnother: string
  /** Error key → sentence. */
  errors: Record<string, string>
}

export const BRIEF_ERROR_KEYS = [
  'brief.errors.required',
  'brief.errors.dateInvalid',
  'brief.errors.datePast',
  'brief.errors.numberInvalid',
  'brief.errors.tooLong',
  'brief.errors.notAnOption',
  'brief.errors.tooMany',
  'brief.errors.generic',
] as const

type Translate = (key: string) => string

/** `t` returns a plain message; `raw` returns a message template with its {placeholders} intact. */
export function briefLabelsFrom(t: Translate, raw: Translate = t): BriefLabels {
  return {
    barLabel: t('brief.barLabel'),
    filterPlaceholder: t('brief.filterPlaceholder'),
    topHit: t('brief.topHit'),
    actions: t('brief.actions'),
    set: t('brief.set'),
    pickADate: t('brief.pickADate'),
    anyDate: t('brief.anyDate'),
    chooseOne: t('brief.chooseOne'),
    pickAny: t('brief.pickAny'),
    orType: t('brief.orType'),
    submitting: t('brief.submitting'),
    showMore: raw('brief.showMore'),
    searchPrompt: t('brief.searchPrompt'),
    typeToChange: t('brief.typeToChange'),
    continueLabel: t('brief.continue'),
    stepOf: raw('brief.stepOf'),
    noJsHint: t('brief.noJsHint'),
    whatsappInstead: t('contact.whatsappInstead'),
    successTitle: t('brief.successTitle'),
    successNextTitle: t('brief.successNextTitle'),
    successReference: raw('brief.successReference').replace(/<\/?code>/g, ''),
    successNext: raw('brief.successNext'),
    successOpenWhatsapp: t('brief.successOpenWhatsapp'),
    successAnother: t('brief.successAnother'),
    errors: Object.fromEntries(BRIEF_ERROR_KEYS.map((k) => [k, t(k)])),
  }
}

/** Replaces {name} placeholders in a resolved label. */
export const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
