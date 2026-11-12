import 'server-only'
import { randomUUID } from 'node:crypto'
import { headers } from 'next/headers'
import type { User } from '@/payload-types'
import type { ActorContext } from '@/shared/api/actor'
import { clientAddressOf, visitorKeyOf } from '@/shared/api/negotiate'
import type { Locale } from '@/shared/lib/locale'
import { getPayloadClient } from '@/shared/lib/payload'

/**
 * The website's `ActorContext` for a server action (research R18): the same commands the API runs,
 * with the language from the form and the address from the request. The website has no install id.
 */
export async function webActor(locale: Locale, user: User | null = null): Promise<ActorContext> {
  const clientAddress = clientAddressOf(await headers())
  return {
    payload: await getPayloadClient(),
    user,
    locale,
    installId: null,
    clientAddress,
    visitorKey: visitorKeyOf(null, clientAddress),
    now: () => new Date(),
    requestId: randomUUID(),
  }
}
