export type Audience = 'client' | 'creator' | 'admin'

/** What a notification template may say; anything else is left out when it is rendered. */
export const NOTIFICATION_PLACEHOLDERS = ['name', 'reference', 'date', 'total', 'link', 'occasion', 'type', 'emirate', 'creator'] as const
export type Channel = 'whatsapp' | 'email' | 'in-app' | 'push'

export const NOTIFICATION_EVENTS = [
  'quoted',
  'accepted',
  'confirmed',
  'declined',
  'lapsed',
  'reassigned',
  'adjusted',
  'paid',
  'scheduled',
  'delivered',
  'completed',
  'on-hold',
  'cancelled',
  'expired',
  'delivery-overdue',
  // Feature 019: a creator said yes to a brief; a new brief matches a creator.
  'brief-accepted',
  'brief-new',
] as const
export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number]

const AUDIENCES: Readonly<Record<NotificationEvent, readonly Audience[]>> = {
  quoted: ['client', 'admin'],
  accepted: ['client', 'creator', 'admin'],
  confirmed: ['client', 'admin'],
  declined: ['client', 'admin'],
  lapsed: ['client', 'admin'],
  reassigned: ['client', 'creator', 'admin'],
  adjusted: ['client', 'admin'],
  paid: ['client', 'creator'],
  scheduled: ['client', 'creator'],
  delivered: ['client'],
  completed: ['creator', 'admin'],
  'on-hold': ['client', 'admin'],
  cancelled: ['client', 'creator', 'admin'],
  expired: ['client'],
  'delivery-overdue': ['admin'],
  'brief-accepted': ['client', 'admin'],
  'brief-new': ['creator'],
}

/** Who hears about an event (FR-006). Channels and wording come from the content area. */
export function notificationsFor(event: NotificationEvent): readonly Audience[] {
  return AUDIENCES[event]
}

/** Fills `{placeholders}`; unknown or empty ones disappear and the spacing is tidied. */
export function renderTemplate(text: string, vars: Readonly<Record<string, string | null | undefined>>): string {
  return text
    .replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ([,.!?،])/g, '$1')
    .trim()
}

/** Makes a repeated transition harmless: one row per booking revision, event, audience and channel. */
export function dedupeKey(bookingId: string | number, revision: number, event: NotificationEvent, audience: Audience, channel: Channel, recipient = ''): string {
  return [bookingId, revision, event, audience, channel, recipient].join(':')
}

/** Brief events (feature 019) have no booking revision: one row per brief, event, audience, channel and recipient. */
export function briefDedupeKey(briefId: string | number, event: NotificationEvent, audience: Audience, channel: Channel, recipient = ''): string {
  return ['brief', briefId, event, audience, channel, recipient].join(':')
}
