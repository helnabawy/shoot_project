import { z } from 'zod'
import { landingV1 } from './landing'
import { defineEndpoint, type Endpoint } from './registry'
import { briefBuilderV1, navigationV1, personasV1, siteV1 } from './site'

export { defineEndpoint, noContentV1, type Auth, type CacheClass, type Endpoint, type EndpointSpec, type Method } from './registry'

const noInput = z.object({})
const publicRead = { method: 'GET', auth: 'none', cache: 'public', input: noInput } as const

/**
 * Every v1 endpoint, by id (contracts/mobile-api.md "Endpoint inventory"). Each story registers its
 * endpoints here; the web handlers spread these definitions.
 */
export const endpoints = {
  // US1: the site's own words and settings.
  site: defineEndpoint({ ...publicRead, id: 'site', path: '/api/mobile/v1/site', output: siteV1, examples: ['site', 'site.ar'] }),
  navigation: defineEndpoint({ ...publicRead, id: 'navigation', path: '/api/mobile/v1/navigation', output: navigationV1, examples: ['navigation', 'navigation.ar'] }),
  personas: defineEndpoint({ ...publicRead, id: 'personas', path: '/api/mobile/v1/personas', output: personasV1, examples: ['personas', 'personas.ar'] }),
  briefBuilder: defineEndpoint({
    ...publicRead,
    id: 'briefBuilder',
    path: '/api/mobile/v1/brief-builder',
    output: briefBuilderV1,
    examples: ['brief-builder', 'brief-builder.ar'],
  }),
  landing: defineEndpoint({ ...publicRead, id: 'landing', path: '/api/mobile/v1/landing', output: landingV1, examples: ['landing'] }),
} satisfies Record<string, Endpoint>

/** The registry as a list, in declaration order. */
export const ENDPOINTS: readonly Endpoint[] = Object.values(endpoints)
