/**
 * Identity documents a creator uploads before review (002 CP-FR-013): every creator working in the UAE
 * sends an Emirates ID and a trade license. Only the verification team ever sees them.
 */
export const IDENTITY_DOCUMENTS = ['emirates-id', 'trade-license'] as const
export type IdentityDocumentKind = (typeof IDENTITY_DOCUMENTS)[number]

export const IDENTITY_STATUSES = ['pending', 'verified', 'rejected'] as const
export type IdentityStatus = (typeof IDENTITY_STATUSES)[number]
/** What the editor shows for one kind: its newest upload's status, or `missing`. */
export type IdentityState = IdentityStatus | 'missing'

// Under the 6 MB server-action body limit (next.config.ts), like portfolio images.
export const MAX_IDENTITY_BYTES = 5 * 1024 * 1024
export const IDENTITY_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const

export const isIdentityDocumentKind = (value: unknown): value is IdentityDocumentKind =>
  typeof value === 'string' && (IDENTITY_DOCUMENTS as readonly string[]).includes(value)

export const isIdentityUploadType = (value: string): boolean => (IDENTITY_UPLOAD_TYPES as readonly string[]).includes(value)

/** One state per kind, from the newest upload of that kind. */
export function identityStanding(
  documents: readonly { kind: string; status?: string | null; createdAt: string }[],
): Record<IdentityDocumentKind, IdentityState> {
  const standing = Object.fromEntries(IDENTITY_DOCUMENTS.map((kind) => [kind, 'missing'])) as Record<IdentityDocumentKind, IdentityState>
  const newest = [...documents].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const doc of newest) {
    if (!isIdentityDocumentKind(doc.kind)) continue
    standing[doc.kind] = (IDENTITY_STATUSES as readonly string[]).includes(doc.status ?? '') ? (doc.status as IdentityStatus) : 'pending'
  }
  return standing
}

/** Whether each document is in hand for review: waiting for the check or verified. */
export function identityProvided(standing: Record<IdentityDocumentKind, IdentityState>): { emiratesId: boolean; tradeLicense: boolean } {
  const ok = (state: IdentityState) => state === 'pending' || state === 'verified'
  return { emiratesId: ok(standing['emirates-id']), tradeLicense: ok(standing['trade-license']) }
}
