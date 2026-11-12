import 'server-only'
import { cookies } from 'next/headers'
import { z } from 'zod'

/**
 * The code step's state between the website's number and code pages (US5): which challenge, which
 * number and why. It lives in a short HTTP-only cookie, never in the address bar (no number in a
 * URL). The code itself is never stored; the server checks everything again on verify.
 */
export const PENDING_COOKIE = 'shoot-otp'
const MAX_AGE_S = 10 * 60

const pendingSchema = z.object({
  challengeId: z.uuid(),
  phone: z.string().regex(/^\+9715\d{8}$/),
  channel: z.enum(['sms', 'whatsapp']),
  resendAt: z.string(),
  /** login: sign in or create a client (role rows shown); join: create a creator; link: add the number to the signed-in account. */
  mode: z.enum(['login', 'join', 'link']),
  next: z.string(),
  /** Join as a creator: the professions chosen on the join page (acceptance was given there). */
  personas: z.array(z.string()).default([]),
})
export type PendingChallenge = z.infer<typeof pendingSchema>

export async function readPending(): Promise<PendingChallenge | null> {
  const raw = (await cookies()).get(PENDING_COOKIE)?.value
  if (!raw) return null
  try {
    const parsed = pendingSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export async function writePending(value: PendingChallenge): Promise<void> {
  ;(await cookies()).set(PENDING_COOKIE, JSON.stringify(value), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE_S,
  })
}

export async function clearPending(): Promise<void> {
  ;(await cookies()).delete(PENDING_COOKIE)
}
