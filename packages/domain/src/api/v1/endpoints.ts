import { z } from 'zod'
import {
  articleV1,
  guideListV1,
  guideRequestV1,
  guidesRequestV1,
  legalDocumentV1,
  legalRequestV1,
  legalVersionRequestV1,
  legalVersionsV1,
  legalVersionV1,
  pageRequestV1,
  pageV1,
} from './content'
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
  // US4: guides, editor-built pages and legal documents.
  guides: defineEndpoint({ ...publicRead, id: 'guides', path: '/api/mobile/v1/guides', input: guidesRequestV1, output: guideListV1, examples: ['guides'] }),
  guide: defineEndpoint({ ...publicRead, id: 'guide', path: '/api/mobile/v1/guides/{slug}', input: guideRequestV1, output: articleV1, examples: ['guide'] }),
  page: defineEndpoint({ ...publicRead, id: 'page', path: '/api/mobile/v1/pages/{slug}', input: pageRequestV1, output: pageV1, examples: ['page'] }),
  legal: defineEndpoint({ ...publicRead, id: 'legal', path: '/api/mobile/v1/legal/{kind}', input: legalRequestV1, output: legalDocumentV1, examples: ['legal'] }),
  legalVersions: defineEndpoint({
    ...publicRead,
    id: 'legalVersions',
    path: '/api/mobile/v1/legal/{kind}/versions',
    input: legalRequestV1,
    output: legalVersionsV1,
    examples: ['legal-versions'],
  }),
  legalVersion: defineEndpoint({
    ...publicRead,
    id: 'legalVersion',
    path: '/api/mobile/v1/legal/{kind}/versions/{version}',
    input: legalVersionRequestV1,
    output: legalVersionV1,
    examples: ['legal-version'],
  }),
} satisfies Record<string, Endpoint>

/** The registry as a list, in declaration order. */
export const ENDPOINTS: readonly Endpoint[] = Object.values(endpoints)
