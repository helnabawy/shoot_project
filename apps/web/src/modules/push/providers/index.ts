import type { Env } from '@/shared/lib/env'
import { consoleProvider, offProvider } from './console'
import { fcmProvider, parseServiceAccount } from './fcm'
import type { PushProvider } from './types'

export type { PushMessage, PushProvider, PushResult } from './types'
export { consoleProvider, offProvider } from './console'

let cached: PushProvider | undefined
let override: PushProvider | undefined

/** Integration tests swap in a recording provider; `undefined` restores the configured one. */
export function setPushProvider(provider: PushProvider | undefined): void {
  override = provider
}

/** The provider `PUSH_PROVIDER` names: `off` when unset (research R7). */
export function getPushProvider(e: Pick<Env, 'PUSH_PROVIDER' | 'FCM_SERVICE_ACCOUNT'>): PushProvider {
  if (override) return override
  if (cached) return cached
  switch (e.PUSH_PROVIDER) {
    case 'fcm':
      cached = fcmProvider(parseServiceAccount(e.FCM_SERVICE_ACCOUNT ?? ''))
      break
    case 'console':
      cached = consoleProvider()
      break
    default:
      cached = offProvider
  }
  return cached
}
