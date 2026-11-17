import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import ar from '../../messages/ar.json'
import en from '../../messages/en.json'

/**
 * Feature 022 (FR-026, `persona-extensibility`): the strings and code added for creator offers name no profession.
 * Professions come from the CMS (persona labels); a new audience needs no code change.
 */
const PROFESSIONS = /photograph|videograph|مصور|تصوير|فيديو/i

const NAMESPACES = [
  (m: typeof en) => m.offers,
  (m: typeof en) => (m.inbox as Record<string, unknown>).offer,
  (m: typeof en) => (m.brief as Record<string, unknown>).place,
]

const strings = (node: unknown, path = ''): [string, string][] =>
  typeof node === 'string' ? [[path, node]] : node && typeof node === 'object' ? Object.entries(node).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k)) : []

const root = join(__dirname, '../../..')
const read = (rel: string) => readFileSync(join(root, rel), 'utf8')

describe('OF-FR-026 no profession named in the offers code or strings', () => {
  it('the offers message namespaces, in English and Arabic', () => {
    for (const messages of [en, ar]) {
      for (const pick of NAMESPACES) {
        const all = strings(pick(messages as typeof en))
        expect(all.length).toBeGreaterThan(5)
        expect(all.filter(([, text]) => PROFESSIONS.test(text))).toEqual([])
      }
    }
  })

  it('the app strings added for offers and the brief price', () => {
    for (const file of ['mobile/lib/core/l10n/arb/app_en.arb', 'mobile/lib/core/l10n/arb/app_ar.arb']) {
      const arb = JSON.parse(read(file)) as Record<string, unknown>
      const named = Object.entries(arb).filter(([key, text]) => /^(inboxOffer|qmOffer|briefPrice)/.test(key) && typeof text === 'string' && PROFESSIONS.test(text))
      expect(named).toEqual([])
    }
  })

  it('the offers rules and server code', () => {
    const files = [
      '../packages/domain/src/booking/offers.ts',
      '../packages/domain/src/booking/place.ts',
      'web/src/modules/booking/offers.ts',
      'web/src/modules/booking/components/OffersResults.tsx',
      'web/src/modules/brief/components/PriceStep.tsx',
      'web/src/modules/brief/components/PlaceStep.tsx',
      'web/src/modules/maps/actions.ts',
      'web/src/modules/maps/api.ts',
      'web/src/modules/inbox/components/OfferBits.tsx',
      'web/src/modules/inbox/commands/decline-offer.ts',
      'mobile/lib/features/creator_account/presentation/widgets/offer_sheet.dart',
    ]
    // Comments may explain the model with an example; code and strings may not name a profession.
    const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
    for (const file of files) expect([file, PROFESSIONS.test(code(read(file)))]).toEqual([file, false])
  })
})
