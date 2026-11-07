/**
 * The translation key each server-side error uses (`creators.err.*`). The actions return the keys the
 * domain schemas, hooks and media rules raise; anything not listed shows the generic message.
 */
export const ERROR_MESSAGES = {
  'creators.errors.nameLength': 'nameLength',
  'creators.errors.bioLength': 'bioLength',
  'creators.errors.personasRange': 'personasRange',
  'creators.errors.duplicate': 'duplicate',
  'creators.errors.tooMany': 'tooMany',
  'creators.errors.languageInvalid': 'languageInvalid',
  'creators.errors.genderInvalid': 'genderInvalid',
  'creators.errors.nationalityInvalid': 'nationalityInvalid',
  'creators.nationality.invalid': 'nationalityInvalid',
  'creators.errors.experienceRange': 'experienceRange',
  'creators.errors.socialInvalid': 'socialInvalid',
  'creators.errors.socialPlatform': 'socialPlatform',
  'creators.errors.videoHost': 'videoHost',
  'creators.errors.captionLength': 'captionLength',
  'creators.errors.sampleKind': 'sampleKind',
  'creators.errors.required': 'required',
  'creators.errors.notProvider': 'notProvider',
  'creators.errors.noProfile': 'noProfile',
  'creators.errors.generic': 'generic',
  'creators.errors.mustBeDraft': 'mustBeDraft',
  'creators.persona.inactive': 'personaInactive',
  'creators.specialty.notInPersona': 'specialtyNotInPersona',
  'creators.samples.limit': 'samplesLimit',
  'creators.samples.image': 'samplesImage',
  'creators.samples.poster': 'samplesPoster',
  'creators.samples.category': 'samplesCategory',
  'creators.submit.incomplete': 'submitIncomplete',
  'creators.media.notYours': 'mediaNotYours',
  'media.upload.type': 'uploadType',
  'media.upload.size': 'uploadSize',
  'media.upload.quota': 'uploadQuota',
  'media.upload.tooMany': 'uploadTooMany',
  // Collection-level validators raise these names for the same problems as the form checks.
  'creators.languages.invalid': 'languageInvalid',
  'creators.social.invalid': 'socialInvalid',
  'creators.samples.host': 'videoHost',
} as const satisfies Record<string, string>

/** The `creators.err.*` message for a server error key; unknown keys say the generic thing. */
export function errorMessageKey(key: string | undefined): string {
  return (ERROR_MESSAGES as Record<string, string>)[key ?? ''] ?? 'generic'
}
