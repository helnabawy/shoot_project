import type { Env } from '@/shared/lib/env'
import { consoleProvider } from './console'
import type { OtpProvider } from './types'

export type { OtpMessage, OtpProvider, SendResult } from './types'
export { consoleProvider } from './console'

let cached: OtpProvider | undefined
let override: OtpProvider | undefined

/** Integration tests swap in a recording provider; `undefined` restores the configured one. */
export function useOtpProvider(provider: OtpProvider | undefined): void {
  override = provider
}

/**
 * The provider `OTP_PROVIDER` names; `console` when unset (allowed only outside production, see
 * `env()`). Tests inject a provider into the command instead of reading the environment.
 */
export function getOtpProvider(e: Pick<Env, 'OTP_PROVIDER'>): OtpProvider {
  if (override) return override
  if (cached) return cached
  switch (e.OTP_PROVIDER) {
    case 'unifonic':
      // The vendor adapter lands after the owner approves it (tasks T006, T056); env() already
      // refuses a production start without a real provider.
      throw new Error('OTP_PROVIDER=unifonic: the vendor adapter is not built yet (pending owner approval, research R10)')
    default:
      cached = consoleProvider()
      return cached
  }
}
