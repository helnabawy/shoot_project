import type { Payload } from 'payload'

/**
 * The only way `modules/auth/otp` and the auth commands log (FR-032): the fields are fixed, so a
 * number, a code, a token or a message body cannot reach the logger.
 */
export interface OtpLogFields {
  challengeId?: string
  provider?: string
  reason?: string
  status?: number
  requestId?: string
}

export function logOtp(payload: Payload, level: 'info' | 'warn' | 'error', fields: OtpLogFields, message: string): void {
  const { challengeId, provider, reason, status, requestId } = fields
  const entry: OtpLogFields = {}
  if (challengeId !== undefined) entry.challengeId = challengeId
  if (provider !== undefined) entry.provider = provider
  if (reason !== undefined) entry.reason = reason
  if (status !== undefined) entry.status = status
  if (requestId !== undefined) entry.requestId = requestId
  payload.logger[level](entry, message)
}
