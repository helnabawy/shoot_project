import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import type { Locale } from '@/shared/lib/locale'

/**
 * Who is calling and how (008 data-model.md "Server context", research R15). Handlers get it from
 * `defineHandler`; later commands (011–014) take the same type and never read cookies, headers or
 * the clock themselves.
 */
export interface ActorContext {
  payload: Payload
  /** The signed-in member; always `null` for `auth: 'none'`. */
  user: User | null
  locale: Locale
  /** The `X-Shoot-Install` id when it is 32 lower-case hex characters. */
  installId: string | null
  /** The first `x-forwarded-for` address, else `x-real-ip`, else `null`. */
  clientAddress: string | null
  /** `install:<id>`, else the client address, else `anonymous`. */
  visitorKey: string
  now: () => Date
  requestId: string
}
