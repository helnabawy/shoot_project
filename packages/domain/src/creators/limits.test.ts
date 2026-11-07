import { describe, expect, it } from 'vitest'
import {
  ACCEPTED_UPLOAD_TYPES,
  MAX_FILES_PER_ACCOUNT,
  MAX_SAMPLES,
  MAX_UPLOAD_BYTES,
  UPLOADS_PER_ACCOUNT_HOUR,
  UPLOADS_PER_VISITOR_HOUR,
} from './limits'

// Pinned so that changing a limit is a deliberate, reviewed edit (research §6, CP-FR-008).
describe('CP-FR-008 provider upload limits', () => {
  it('pins every limit', () => {
    expect(MAX_UPLOAD_BYTES).toBe(5 * 1024 * 1024)
    expect(ACCEPTED_UPLOAD_TYPES).toEqual(['image/jpeg', 'image/png', 'image/webp'])
    expect(MAX_FILES_PER_ACCOUNT).toBe(60)
    expect(UPLOADS_PER_ACCOUNT_HOUR).toBe(20)
    expect(UPLOADS_PER_VISITOR_HOUR).toBe(40)
    expect(MAX_SAMPLES).toBe(30)
  })

  it('leaves room for replacements: more files per account than samples plus the photo', () => {
    expect(MAX_FILES_PER_ACCOUNT).toBeGreaterThan(MAX_SAMPLES + 1)
  })
})
