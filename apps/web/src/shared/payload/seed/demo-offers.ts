import type { Payload } from 'payload'
import { assertDemoHostAllowed } from './demo-creators'

/**
 * Local, e2e and Lighthouse only (refused on any other host): turns "Creators offer prices" on with the default
 * fee (10 %) and range (70–200 %) so the quickstart walk of feature 022 can be followed with the demo creators
 * (`SEED_DEMO_CREATORS=1`). Running it twice changes nothing.
 */
export async function seedDemoOffers(payload: Payload, options: { siteUrl?: string; log: (message: string) => void }): Promise<void> {
  assertDemoHostAllowed(options.siteUrl)
  const settings = (await payload.findGlobal({ slug: 'site-settings', depth: 0, overrideAccess: true })) as { quickMatch?: Record<string, unknown> | null }
  await payload.updateGlobal({
    slug: 'site-settings',
    data: { quickMatch: { ...(settings.quickMatch ?? {}), enabled: true, offers: { enabled: true, feePercent: 10, minPercent: 70, maxPercent: 200 } } } as never,
    overrideAccess: true,
    context: { disableRevalidate: true },
  })
  options.log('Creators offer prices is on (fee 10 %, range 70–200 %) for this local database')
}
