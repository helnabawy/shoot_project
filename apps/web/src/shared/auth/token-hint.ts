/**
 * Feature 023 (research R1): a routing hint read from Payload's session cookie, so `/` can show a creator
 * the creator home while the landing stays statically generated for everyone else.
 *
 * The hint is NOT authentication. The token's payload is decoded without checking its signature and with
 * no database call; the page it routes to verifies the real session and shows the landing when the hint
 * was wrong. Nothing is trusted, logged or stored here.
 */

export const PAYLOAD_TOKEN_COOKIE = 'payload-token'

/** A session token is well under 1 KB; anything this big is not one. */
const MAX_TOKEN_LENGTH = 4_096

/** "provider" when the token's payload says so, otherwise `null`. Never throws. */
export function accountTypeHint(cookieValue: string | undefined): 'provider' | null {
  if (!cookieValue || cookieValue.length > MAX_TOKEN_LENGTH) return null
  const payload = cookieValue.split('.')[1]
  if (!payload) return null
  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '='))
    const claims: unknown = JSON.parse(json)
    return claims !== null && typeof claims === 'object' && (claims as { accountType?: unknown }).accountType === 'provider' ? 'provider' : null
  } catch {
    return null
  }
}
