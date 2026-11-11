import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { OtpMessage, OtpProvider, SendResult } from './types'

/** `apps/web/.otp-outbox/` (git-ignored): one JSON file per challenge. */
export const OUTBOX_DIR = join(process.cwd(), '.otp-outbox')

/**
 * The development and test provider (contracts/otp-provider.md). It is a delivery channel, not a log:
 * the code goes to a local file and never to the logger (FR-032). Refused in production by `env()`.
 * Documented test numbers: one ending `0000000` is not on WhatsApp; one ending `9999999` always fails.
 */
export function consoleProvider(dir = OUTBOX_DIR): OtpProvider {
  return {
    name: 'console',
    async send(message: OtpMessage, { signal }): Promise<SendResult> {
      if (signal.aborted) return { ok: false, reason: 'unavailable' }
      if (message.to.endsWith('9999999')) return { ok: false, reason: 'unavailable' }
      if (message.channel === 'whatsapp' && message.to.endsWith('0000000')) return { ok: false, reason: 'unreachable' }
      try {
        await mkdir(dir, { recursive: true })
        const { challengeId, channel, to, code, locale, text } = message
        const file = { challengeId, channel, to, code, locale, text, sentAt: new Date().toISOString() }
        await writeFile(join(dir, `${challengeId}.json`), `${JSON.stringify(file, null, 2)}\n`)
        return { ok: true, ref: null }
      } catch {
        return { ok: false, reason: 'unavailable' }
      }
    },
  }
}
