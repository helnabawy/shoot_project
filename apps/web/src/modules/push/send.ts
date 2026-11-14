import 'server-only'
import type { Payload } from 'payload'
import { env } from '@/shared/lib/env'
import type { Locale } from '@/shared/lib/locale'
import { getPushProvider, type PushProvider } from './providers'
import { pushText } from './push-text'

export interface PushContent {
  title: string
  body: string
  data: Record<string, string>
}

/**
 * Sends one push to every device of a member, each in the device's language (research R8), unless the
 * member switched push off (FR-017). A device the service no longer knows is forgotten (FR-016). Never
 * throws: a failed push must not fail the action that caused it (FR-019). Returns how many were sent.
 */
export async function pushToUser(
  payload: Payload,
  userId: number,
  content: (locale: Locale) => PushContent | null,
  provider: PushProvider = getPushProvider(env()),
): Promise<number> {
  if (provider.name === 'off') return 0
  try {
    const user = await payload.findByID({ collection: 'users', id: userId, depth: 0, overrideAccess: true, select: { pushEnabled: true } })
    if (user.pushEnabled === false) return 0
    const { docs } = await payload.find({ collection: 'push-devices', where: { user: { equals: userId } }, depth: 0, pagination: false, overrideAccess: true })
    let sent = 0
    for (const device of docs) {
      const message = content(device.locale === 'ar' ? 'ar' : 'en')
      if (!message || !message.body) continue
      const result = await provider.send({ token: device.token, title: pushText(message.title, 'title'), body: pushText(message.body, 'body'), data: message.data })
      if (result === 'sent') sent += 1
      if (result === 'gone') await payload.delete({ collection: 'push-devices', id: device.id, overrideAccess: true })
    }
    return sent
  } catch (error) {
    console.warn(`[push] skipped: ${(error as Error).message.slice(0, 80)}`)
    return 0
  }
}
