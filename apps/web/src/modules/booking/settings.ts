import type { Payload, PayloadRequest } from 'payload'

export interface QuickMatchSettings {
  enabled: boolean
  quotationValidDays: number
  confirmHours: number
  deliveryConfirmDays: number
  payoutDays: number
  quoteLimitPerHour: number
  /** 019: days a brief without a date stays open in the creator inbox. */
  inboxDays: number
}

/** The Quick match settings with their defaults (data-model "site-settings.quickMatch"). Uncached: used in writes. */
export async function readQuickMatch(payload: Payload, req?: PayloadRequest): Promise<QuickMatchSettings> {
  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true, req })) as { quickMatch?: Partial<Record<keyof QuickMatchSettings, unknown>> | null }
  const q = settings.quickMatch ?? {}
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d)
  return {
    enabled: q.enabled === true,
    quotationValidDays: num(q.quotationValidDays, 7),
    confirmHours: num(q.confirmHours, 24),
    deliveryConfirmDays: num(q.deliveryConfirmDays, 7),
    payoutDays: num(q.payoutDays, 10),
    quoteLimitPerHour: num(q.quoteLimitPerHour, 5),
    inboxDays: num(q.inboxDays, 30),
  }
}

const DAY = 24 * 60 * 60 * 1000
export const payoutDue = (completedAt: Date, payoutDays: number) => new Date(completedAt.getTime() + payoutDays * DAY).toISOString()
