export interface Selection {
  token: string
  value: string
}

/**
 * Stable fingerprint of a submission (selections + visitor), used to ignore an identical brief
 * sent again within a minute (FR-050). FNV-1a 32-bit; collision resistance is not a goal here.
 */
export function briefFingerprint(selections: readonly Selection[], visitorId: string): string {
  const canonical = [...selections]
    .sort((a, b) => a.token.localeCompare(b.token))
    .map((s) => `${s.token}=${s.value.trim().toLowerCase()}`)
    .join('&')
  let hash = 0x811c9dc5
  for (const char of `${visitorId}|${canonical}`) {
    hash ^= char.codePointAt(0) as number
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}
