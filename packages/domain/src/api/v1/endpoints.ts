import { z } from 'zod'
import { accountHomeV1, accountPageRequestV1, bookingListV1, briefListV1, meUpdateV1 } from './account'
import { authRefreshV1, authTokenV1, meV1, otpChallengeV1, otpRequestV1, otpVerifyV1 } from './auth'
import {
  answerV1,
  availabilitySetV1,
  availabilityV1,
  creatorAccountV1,
  creatorBookingsV1,
  creatorDateParamV1,
  creatorIdParamV1,
  creatorIndexParamV1,
  creatorKindParamV1,
  creatorRefParamV1,
  myProfileV1,
  profilePatchV1,
  sampleAddV1,
  uploadV1,
  visibilityV1,
} from './creator-account'
import { creatorListV1, creatorProfileRequestV1, creatorProfileV1, creatorsRequestV1, specialtyPageV1, specialtyRequestV1 } from './creators'
import { hirePageRequestV1, hirePageV1 } from './hire'
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
import { defineEndpoint, noContentV1, type Endpoint } from './registry'
import { briefBuilderV1, navigationV1, personasV1, siteV1 } from './site'

export { defineEndpoint, noContentV1, type Auth, type CacheClass, type Endpoint, type EndpointSpec, type Method } from './registry'

const noInput = z.object({})
const publicRead = { method: 'GET', auth: 'none', cache: 'public', input: noInput } as const

const mine = { method: 'POST', auth: 'required', cache: 'no-store', input: noInput } as const
const mineRead = { ...mine, method: 'GET' } as const

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
  // 013: the client account (specs/013-client-account/contracts/account-api.md).
  meAccount: defineEndpoint({
    id: 'meAccount',
    method: 'GET',
    path: '/api/mobile/v1/me/account',
    auth: 'required',
    cache: 'no-store',
    input: noInput,
    output: accountHomeV1,
    examples: ['me-account', 'me-account-empty'],
  }),
  meBookings: defineEndpoint({
    id: 'meBookings',
    method: 'GET',
    path: '/api/mobile/v1/me/bookings',
    auth: 'required',
    cache: 'no-store',
    input: accountPageRequestV1,
    output: bookingListV1,
    examples: ['me-bookings'],
  }),
  meBriefs: defineEndpoint({
    id: 'meBriefs',
    method: 'GET',
    path: '/api/mobile/v1/me/briefs',
    auth: 'required',
    cache: 'no-store',
    input: accountPageRequestV1,
    output: briefListV1,
    examples: ['me-briefs'],
  }),
  meUpdate: defineEndpoint({
    id: 'meUpdate',
    method: 'PATCH',
    path: '/api/mobile/v1/me',
    auth: 'required',
    cache: 'no-store',
    input: z.object({ body: meUpdateV1 }),
    output: meV1,
    examples: ['me-updated'],
    requestExamples: ['me-update-request'],
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
  // 014: the creator's own account (specs/014-creator-account/contracts/mobile-api.md).
  creatorAccount: defineEndpoint({ ...mineRead, id: 'creatorAccount', path: '/api/mobile/v1/me/creator/account', output: creatorAccountV1, examples: ['creator-account'] }),
  myCreatorProfile: defineEndpoint({ ...mineRead, id: 'myCreatorProfile', path: '/api/mobile/v1/me/creator/profile', output: myProfileV1, examples: ['creator-profile-draft', 'creator-profile-ready', 'creator-profile-review'] }),
  creatorProfileSave: defineEndpoint({ ...mine, id: 'creatorProfileSave', method: 'PATCH', path: '/api/mobile/v1/me/creator/profile', input: z.object({ body: profilePatchV1 }), output: myProfileV1, examples: ['creator-profile-saved'], requestExamples: ['creator-profile-patch'] }),
  creatorProfileSubmit: defineEndpoint({ ...mine, id: 'creatorProfileSubmit', method: 'POST', path: '/api/mobile/v1/me/creator/profile/submit', input: noInput, output: myProfileV1, examples: ['creator-profile-submitted'] }),
  creatorProfileVisibility: defineEndpoint({ ...mine, id: 'creatorProfileVisibility', method: 'PUT', path: '/api/mobile/v1/me/creator/profile/visibility', input: z.object({ body: visibilityV1 }), output: myProfileV1, examples: ['creator-profile-hidden'], requestExamples: ['creator-visibility'] }),
  creatorPhotoUpload: defineEndpoint({ ...mine, id: 'creatorPhotoUpload', method: 'PUT', path: '/api/mobile/v1/me/creator/profile/photo', input: z.object({ body: uploadV1 }), output: myProfileV1, examples: ['creator-photo-result'], requestExamples: ['creator-upload-photo'] }),
  creatorSampleAdd: defineEndpoint({ ...mine, id: 'creatorSampleAdd', method: 'POST', path: '/api/mobile/v1/me/creator/profile/samples', input: z.object({ body: sampleAddV1 }), output: myProfileV1, examples: ['creator-sample-result'], requestExamples: ['creator-sample-add'] }),
  creatorSampleRemove: defineEndpoint({ ...mine, id: 'creatorSampleRemove', method: 'DELETE', path: '/api/mobile/v1/me/creator/profile/samples/{index}', input: z.object({ params: creatorIndexParamV1 }), output: myProfileV1, examples: ['creator-sample-removed'] }),
  creatorIdentityUpload: defineEndpoint({ ...mine, id: 'creatorIdentityUpload', method: 'PUT', path: '/api/mobile/v1/me/creator/identity/{kind}', input: z.object({ params: creatorKindParamV1, body: uploadV1 }), output: myProfileV1, examples: ['creator-identity-result'], requestExamples: ['creator-upload-identity'] }),
  creatorAvailability: defineEndpoint({ ...mineRead, id: 'creatorAvailability', path: '/api/mobile/v1/me/creator/availability', output: availabilityV1, examples: ['creator-availability'] }),
  creatorAvailabilitySet: defineEndpoint({ ...mine, id: 'creatorAvailabilitySet', method: 'PUT', path: '/api/mobile/v1/me/creator/availability/{date}', input: z.object({ params: creatorDateParamV1, body: availabilitySetV1 }), output: availabilityV1, examples: ['creator-availability-set-result'], requestExamples: ['creator-availability-set'] }),
  creatorBookings: defineEndpoint({ ...mineRead, id: 'creatorBookings', path: '/api/mobile/v1/me/creator/bookings', output: creatorBookingsV1, examples: ['creator-bookings'] }),
  creatorBookingAnswer: defineEndpoint({ ...mine, id: 'creatorBookingAnswer', method: 'POST', path: '/api/mobile/v1/me/creator/bookings/{ref}/answer', input: z.object({ params: creatorRefParamV1, body: answerV1 }), output: creatorBookingsV1, examples: ['creator-bookings-answered'], requestExamples: ['creator-answer'] }),
  creatorBookingDeliver: defineEndpoint({ ...mine, id: 'creatorBookingDeliver', method: 'POST', path: '/api/mobile/v1/me/creator/bookings/{ref}/deliver', input: z.object({ params: creatorRefParamV1 }), output: creatorBookingsV1, examples: ['creator-bookings-delivered'] }),
  creatorUpdateRead: defineEndpoint({ ...mine, id: 'creatorUpdateRead', method: 'POST', path: '/api/mobile/v1/me/creator/updates/{id}/read', input: z.object({ params: creatorIdParamV1 }), output: creatorBookingsV1, examples: ['creator-bookings-read'] }),
} satisfies Record<string, Endpoint>

/** The registry as a list, in declaration order. */
export const ENDPOINTS: readonly Endpoint[] = Object.values(endpoints)
