import { z } from 'zod'
import { authRefreshV1, authTokenV1, meV1, otpChallengeV1, otpRequestV1, otpVerifyV1 } from './auth'
import { creatorListV1, creatorProfileRequestV1, creatorProfileV1, creatorsRequestV1, specialtyPageV1, specialtyRequestV1 } from './creators'
import { hirePageRequestV1, hirePageV1 } from './hire'
import { landingV1 } from './landing'
import { defineEndpoint, noContentV1, type Endpoint } from './registry'
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
  // 009: sign-in by mobile number and one-time code (specs/009-otp-sign-in/contracts/auth-api.md).
  otpRequest: defineEndpoint({
    id: 'otpRequest',
    method: 'POST',
    path: '/api/mobile/v1/auth/otp/request',
    auth: 'none',
    cache: 'no-store',
    status: 202,
    input: z.object({ body: otpRequestV1 }),
    output: otpChallengeV1,
    examples: ['auth-challenge'],
    requestExamples: ['auth-request'],
  }),
  otpVerify: defineEndpoint({
    id: 'otpVerify',
    method: 'POST',
    path: '/api/mobile/v1/auth/otp/verify',
    auth: 'none',
    cache: 'no-store',
    input: z.object({ body: otpVerifyV1 }),
    output: authTokenV1,
    examples: ['auth-token'],
    requestExamples: ['auth-verify-seeker', 'auth-verify-provider'],
  }),
  authRefresh: defineEndpoint({
    id: 'authRefresh',
    method: 'POST',
    path: '/api/mobile/v1/auth/refresh',
    auth: 'required',
    cache: 'no-store',
    input: noInput,
    output: authRefreshV1,
    examples: ['auth-refresh'],
  }),
  authLogout: defineEndpoint({
    id: 'authLogout',
    method: 'POST',
    path: '/api/mobile/v1/auth/logout',
    auth: 'required',
    cache: 'no-store',
    status: 204,
    input: noInput,
    output: noContentV1,
    examples: [],
  }),
  me: defineEndpoint({
    id: 'me',
    method: 'GET',
    path: '/api/mobile/v1/me',
    auth: 'required',
    cache: 'no-store',
    input: noInput,
    output: meV1,
    examples: ['me-seeker', 'me-provider'],
  }),
  // US3: creators, specialty pages and hire pages.
  creators: defineEndpoint({ ...publicRead, id: 'creators', path: '/api/mobile/v1/creators', input: creatorsRequestV1, output: creatorListV1, examples: ['creators', 'creators.ar'] }),
  creatorProfile: defineEndpoint({
    ...publicRead,
    id: 'creatorProfile',
    path: '/api/mobile/v1/creators/{code}',
    input: creatorProfileRequestV1,
    output: creatorProfileV1,
    examples: ['creator-profile', 'creator-profile.ar'],
  }),
  specialty: defineEndpoint({ ...publicRead, id: 'specialty', path: '/api/mobile/v1/work/{specialty}', input: specialtyRequestV1, output: specialtyPageV1, examples: ['specialty'] }),
  hirePage: defineEndpoint({ ...publicRead, id: 'hirePage', path: '/api/mobile/v1/hire/{slug}', input: hirePageRequestV1, output: hirePageV1, examples: ['hire-page'] }),
} satisfies Record<string, Endpoint>

/** The registry as a list, in declaration order. */
export const ENDPOINTS: readonly Endpoint[] = Object.values(endpoints)
