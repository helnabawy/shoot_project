/** Provider upload and portfolio bounds (research §6). Constants, not settings: they protect the system. */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
export const ACCEPTED_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
/** 30 samples + a photo + slack for replacements. */
export const MAX_FILES_PER_ACCOUNT = 60
export const UPLOADS_PER_ACCOUNT_HOUR = 20
export const UPLOADS_PER_VISITOR_HOUR = 40
export const MAX_SAMPLES = 30
