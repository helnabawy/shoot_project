import { describe, expect, it } from 'vitest'
import {
  IDENTITY_DOCUMENTS,
  identityProvided,
  identityStanding,
  isIdentityDocumentKind,
  isIdentityUploadType,
  MAX_IDENTITY_BYTES,
} from './identity'

describe('CP-FR-013 identity documents', () => {
  it('asks every creator for an Emirates ID and a trade license, in that order', () => {
    expect(IDENTITY_DOCUMENTS).toEqual(['emirates-id', 'trade-license'])
  })

  it('accepts images and PDFs up to 5 MB, and nothing else', () => {
    expect(MAX_IDENTITY_BYTES).toBe(5 * 1024 * 1024)
    expect(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].every(isIdentityUploadType)).toBe(true)
    expect(isIdentityUploadType('image/gif')).toBe(false)
    expect(isIdentityUploadType('text/plain')).toBe(false)
  })

  it('knows only the two kinds', () => {
    expect(isIdentityDocumentKind('emirates-id')).toBe(true)
    expect(isIdentityDocumentKind('trade-license')).toBe(true)
    expect(isIdentityDocumentKind('passport')).toBe(false)
    expect(isIdentityDocumentKind(undefined)).toBe(false)
  })

  it('reads one state per kind from the newest upload; nothing uploaded is missing', () => {
    expect(identityStanding([])).toEqual({ 'emirates-id': 'missing', 'trade-license': 'missing' })
    expect(
      identityStanding([
        { kind: 'emirates-id', status: 'rejected', createdAt: '2026-11-01T00:00:00.000Z' },
        { kind: 'emirates-id', status: 'pending', createdAt: '2026-11-05T00:00:00.000Z' },
        { kind: 'trade-license', status: 'verified', createdAt: '2026-11-02T00:00:00.000Z' },
        { kind: 'passport', status: 'verified', createdAt: '2026-11-09T00:00:00.000Z' },
      ]),
    ).toEqual({ 'emirates-id': 'pending', 'trade-license': 'verified' })
  })

  it('an unknown status is read as waiting for the check', () => {
    expect(identityStanding([{ kind: 'trade-license', status: null, createdAt: '2026-11-02T00:00:00.000Z' }])['trade-license']).toBe('pending')
  })

  it('a document counts as provided while it waits or once verified, never when missing or rejected', () => {
    expect(identityProvided({ 'emirates-id': 'pending', 'trade-license': 'verified' })).toEqual({ emiratesId: true, tradeLicense: true })
    expect(identityProvided({ 'emirates-id': 'missing', 'trade-license': 'rejected' })).toEqual({ emiratesId: false, tradeLicense: false })
  })
})
