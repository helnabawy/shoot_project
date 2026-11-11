import type { OtpChannel } from '@shoot/domain/auth'

/** How a code reaches a phone (contracts/otp-provider.md). Providers only deliver. */
export type { OtpChannel }

export interface OtpMessage {
  /** The public uuid, for correlation (not personal data). */
  challengeId: string
  channel: OtpChannel
  /** E.164, `+9715XXXXXXXX`. */
  to: string
  /** Six digits. */
  code: string
  locale: 'en' | 'ar'
  /** The rendered SMS body; unused for WhatsApp (Meta's template carries the code). */
  text: string
}

export type SendFailure = 'unreachable' | 'rejected' | 'unavailable'

export type SendResult = { ok: true; ref: string | null } | { ok: false; reason: SendFailure }

/**
 * `send` always resolves: a delivery failure (timeout included) is a result, never a throw. It never
 * logs `to`, `code` or `text` and never puts them in an error.
 */
export interface OtpProvider {
  readonly name: 'console' | 'unifonic' | (string & {})
  send(message: OtpMessage, options: { signal: AbortSignal }): Promise<SendResult>
}
