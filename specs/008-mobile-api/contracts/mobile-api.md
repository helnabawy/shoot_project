# Contract: Mobile API v1 (`/api/mobile/v1`)

The public contract the Flutter app reads.
- Shapes are the zod schemas in `packages/domain/src/api/v1/` (summarised in
  [../data-model.md](../data-model.md)).
- Examples are in `packages/domain/src/api/v1/examples/`.
- The committed snapshot is `specs/contracts/mobile-api/v1.schema.json`.
- The endpoint registry (`endpoints.ts`) is the source of truth. A domain test checks that the
  inventory table below lists the same ids, methods, paths, auth and cache.
- The handler mechanics are in [handler.md](handler.md).

## Request conventions

| Header / parameter | Meaning |
|---|---|
| `Accept-Language: en \| ar` | the answer's language. English when absent or unsupported |
| `?locale=en \| ar` | wins over the header. Any other value is a 422 |
| `X-Shoot-Install: <32 hex>` | anonymous install id, used for limits and duplicate checks. Optional, and ignored when malformed |
| `Authorization: Bearer <JWT>` | ignored by every 008 endpoint (`auth: none`). Used from 009 on |
| `X-Request-Id` | optional; echoed back |

Every answer carries `Content-Language`, `Vary: Accept-Language`, `X-Request-Id` and a
`Cache-Control` from the table in [handler.md](handler.md).

## Endpoint inventory

Auth:
- **none**: anyone, and any token is ignored;
- **opt**: anyone, with more for a signed-in person;
- **req**: token required.

Cache:
- **public**: `public, s-maxage=60`;
- **no-store**.

| Id | Method and path | Auth | Cache | Input | Output | Built on | 404 when |
|---|---|---|---|---|---|---|---|
| `site` | `GET /site` | none | public | — | `siteV1` | `site-settings` `getSiteSettings` | — |
| `navigation` | `GET /navigation` | none | public | — | `navigationV1` | `pages` `getNavigation` | — |
| `personas` | `GET /personas` | none | public | — | `personasV1` | `personas` `getActivePersonas`, `getCategoriesForAudience` | — |
| `briefBuilder` | `GET /brief-builder` | none | public | — | `briefBuilderV1` | `brief` `getBriefBuilderConfig` | — (`builder: null` when off) |
| `landing` | `GET /landing` | none | public | — | `landingV1` | `landing` `getLandingPage` + `getBlockContext` | — |
| `creators` | `GET /creators?type&specialty&place&page` | none | public | `creatorsRequestV1` | `creatorListV1` | `creators` `getPublicCreators`, `getDirectoryContext`, `buildDirectory` | — (unknown filter slugs are ignored, as on the website) |
| `creatorProfile` | `GET /creators/{code}` | none | public | `params.code` (1–16 chars) | `creatorProfileV1` | `creators` `getCreatorProfile` | unknown, unpublished, suspended |
| `specialty` | `GET /work/{specialty}` | none | public | `params.specialty` (slug) | `specialtyPageV1` | `creators` `getSpecialtyPage` | unknown, inactive, not in the audience |
| `hirePage` | `GET /hire/{slug}` | none | public | `params.slug` | `hirePageV1` | `pages` `getIntentPage` | no such intent page, draft |
| `guides` | `GET /guides?page&category&author` | none | public | `guidesRequestV1` | `guideListV1` | `guides` `listArticles`, `listCategories`, `getAuthor` | unknown category or author |
| `guide` | `GET /guides/{slug}` | none | public | `params.slug` | `articleV1` | `guides` `getArticle` | unknown, draft, scheduled later |
| `page` | `GET /pages/{slug}` | none | public | `params.slug` | `pageV1` | `pages` `getPageBySlug(kind: 'standard')` | unknown, draft |
| `legal` | `GET /legal/{kind}` | none | public | `params.kind: legalKindV1` | `legalDocumentV1` | `legal` `getLegalDocument` | no current version |
| `legalVersions` | `GET /legal/{kind}/versions` | none | public | `params.kind` | `legalVersionsV1` | `legal` `getLegalVersions` | no document |
| `legalVersion` | `GET /legal/{kind}/versions/{version}` | none | public | `params.kind`, `params.version` (1–9999) | `legalVersionV1` | `legal` `getLegalVersion` | not published |
| `resolve` | `GET /resolve?path` | none | public | `resolveRequestV1` | `resolveV1` | `pages` `resolvePath` (research R12) | never (not found is an answer) |
| `otpRequest` | `POST /auth/otp/request` | none | no-store | `otpRequestV1` | `otpChallengeV1` (202) | `auth` `request-code` (009) | — |
| `otpVerify` | `POST /auth/otp/verify` | none | no-store | `otpVerifyV1` | `authTokenV1` | `auth` `verify-code` (009) | — |
| `authRefresh` | `POST /auth/refresh` | req | no-store | — | `authRefreshV1` | `auth` `refresh-session` (009) | — |
| `authLogout` | `POST /auth/logout` | req | no-store | — | 204 | `auth` `end-session` (009) | — |
| `me` | `GET /me` | req | no-store | — | `meV1` | `auth` `toWireMe` (009) | — |
| `meAccount` | `GET /me/account` | req | no-store | — | `accountHomeV1` | `account` `read-account` (013) | — |
| `meBookings` | `GET /me/bookings` | req | no-store | `accountPageRequestV1` | `bookingListV1` | `account` `list-bookings` (013) | — |
| `meBriefs` | `GET /me/briefs` | req | no-store | `accountPageRequestV1` | `briefListV1` | `account` `list-briefs` (013) | — |
| `meUpdate` | `PATCH /me` | req | no-store | `meUpdateV1` | `meV1` | `account` `update-me` (013) | — |
| `creatorAccount` | `GET /me/creator/account` | req | no-store | — | `creatorAccountV1` | `creators`/`booking` creator commands (014) | not a creator (403) |
| `myCreatorProfile` | `GET /me/creator/profile` | req | no-store | — | `myProfileV1` | `creators`/`booking` creator commands (014) | not a creator (403) |
| `creatorProfileSave` | `PATCH /me/creator/profile` | req | no-store | — | `myProfileV1` | `creators`/`booking` creator commands (014) | not a creator (403) |
| `creatorProfileSubmit` | `POST /me/creator/profile/submit` | req | no-store | — | `myProfileV1` | `creators`/`booking` creator commands (014) | not a creator (403) |
| `creatorProfileVisibility` | `PUT /me/creator/profile/visibility` | req | no-store | — | `myProfileV1` | `creators`/`booking` creator commands (014) | not a creator (403) |
| `creatorPhotoUpload` | `PUT /me/creator/profile/photo` | req | no-store | — | `myProfileV1` | `creators`/`booking` creator commands (014) | not a creator (403) |
| `creatorSampleAdd` | `POST /me/creator/profile/samples` | req | no-store | — | `myProfileV1` | `creators`/`booking` creator commands (014) | not a creator (403) |
| `creatorSampleRemove` | `DELETE /me/creator/profile/samples/{index}` | req | no-store | — | `myProfileV1` | `creators`/`booking` creator commands (014) | not a creator (403) |
| `creatorIdentityUpload` | `PUT /me/creator/identity/{kind}` | req | no-store | — | `myProfileV1` | `creators`/`booking` creator commands (014) | not a creator (403) |
| `creatorAvailability` | `GET /me/creator/availability` | req | no-store | — | `availabilityV1` | `creators`/`booking` creator commands (014) | not a creator (403) |
| `creatorAvailabilitySet` | `PUT /me/creator/availability/{date}` | req | no-store | — | `availabilityV1` | `creators`/`booking` creator commands (014) | not a creator (403) |
| `creatorBookings` | `GET /me/creator/bookings` | req | no-store | — | `creatorBookingsV1` | `creators`/`booking` creator commands (014) | not a creator (403) |
| `creatorBookingAnswer` | `POST /me/creator/bookings/{ref}/answer` | req | no-store | — | `creatorBookingsV1` | `creators`/`booking` creator commands (014) | not a creator (403) |
| `creatorBookingDeliver` | `POST /me/creator/bookings/{ref}/deliver` | req | no-store | — | `creatorBookingsV1` | `creators`/`booking` creator commands (014) | not a creator (403) |
| `creatorUpdateRead` | `POST /me/creator/updates/{id}/read` | req | no-store | — | `creatorBookingsV1` | `creators`/`booking` creator commands (014) | not a creator (403) |
| — | any other address under `/api/mobile` | none | no-store | — | `problemV1` | catch-all | always |

App links, at the site root and outside v1:

| Address | Auth | Cache | Body | 404 when |
|---|---|---|---|---|
| `GET /.well-known/apple-app-site-association` | none | `public, max-age=3600` | `appleAssociation(APP_IOS_APP_IDS)` | `APP_IOS_APP_IDS` unset |
| `GET /.well-known/assetlinks.json` | none | `public, max-age=3600` | `androidAssetLinks(APP_ANDROID_PACKAGE, APP_ANDROID_CERT_SHA256)` | either variable unset |

Both are `application/json`. They are not localised, not redirected, and skipped by `proxy.ts`.

**A rename that redirects.** `hirePage` and `page` answer 200 with the page's current `path` when
the request used an earlier address or the other language's address. When `path` differs from the
request, the app replaces its location.

## Access results

Integration tests (`mobile-api-access.int.test.ts`, plus each story's file) assert every cell
against a seeded PostgreSQL. Roles are as in `specs/003-quick-match-booking/contracts/rest-api.md`.
"Token" means a valid Bearer JWT for that role, which every 008 endpoint ignores.

| Endpoint | Visitor (no token) | Seeker (token) | Provider (token) | Editor (token) | Admin (token) |
|---|---|---|---|---|---|
| `site`, `navigation`, `personas`, `briefBuilder`, `landing` | read published | same answer, still `public` | same | same | same |
| `creators`, `creatorProfile`, `specialty`, `hirePage` | read listed / public only | same | same; own unpublished profile **not** returned (use 014's `account/profile`) | same | same |
| `guides`, `guide`, `page`, `legal`, `legalVersions`, `legalVersion` | read published, scheduled from their time | same | same | same (no drafts; preview stays on the website) | same |
| `resolve` | classify any path; never look up private paths | same | same | same | same |
| `/.well-known/*` | read | read | read | read | read |
| test-only `optional` handler (wrapper test) | `user = null` | user resolved, `private, no-store` | same | same | same |
| test-only `required` handler (wrapper test) | 401 `unauthorized` | 200 `private, no-store` | 200 | 200 | 200 |
| any endpoint with an invalid or expired token | `none`: the token is ignored. `optional`/`required`: 401 `tokenInvalid` | | | | |
| any endpoint with only the website cookie `payload-token` | treated as a visitor (the cookie is never read) | | | | |

These are never returned by any endpoint, and the mapper unit tests and the snapshot test check
it:
- `accessSalt`, `matchValues`, `gender`;
- `briefLimitPerHour`, `autoPublishEdits`, `translationStatus`, `quickMatch.templates`,
  `quickMatch.channels`;
- `uploadedBy`, `publishedBy`, `previousSlugs`;
- any user email or phone.

## Problems

`Content-Type: application/problem+json`, `Cache-Control: no-store`.

```json
{
  "type": "about:blank",
  "status": 422,
  "code": "api.errors.invalidInput",
  "fields": [{ "path": "query.locale", "code": "api.errors.localeUnsupported" }]
}
```

| Code | Status | App behaviour (009–015) |
|---|---|---|
| `api.errors.invalidInput` | 422 | show field codes, or the general message |
| `api.errors.invalidField` | (in `fields`) | the general field message |
| `api.errors.localeUnsupported` | (in `fields`) | never expected from the app; the general message |
| `api.errors.notFound` | 404 | screen 37 (not found) |
| `api.errors.unauthorized` | 401 | sign in (009) |
| `api.errors.tokenInvalid` | 401 | sign in again (009 refreshes the token ahead of expiry, so a 401 means signed out; 009 research R14) |
| `api.errors.rateLimited` | 429 | wait `retryAfter` seconds |
| `api.errors.unexpected` | 500 | screen 39 (something went wrong) |

Every code has words in `apps/web/messages/{en,ar}.json` (`api.errors.*`) and in the app's ARB files
through `core/l10n/failure_message.dart`. An unknown code falls back to the general message.

## Examples

One English file per endpoint, named by its id in kebab case: `site.json`, `navigation.json`, `personas.json`,
`brief-builder.json`, `landing.json`, `creators.json`, `creator-profile.json`, `specialty.json`,
`hire-page.json`, `guides.json`, `guide.json`, `page.json`, `legal.json`, `legal-versions.json`,
`legal-version.json`, plus `resolve-page.json`, `resolve-removed.json` and
`resolve-not-found.json`.

There is also `problem-422.json`, `problem-404.json` and `app-links.json`.

Arabic files (`<name>.ar.json`) exist for `site`, `navigation`, `personas`, `brief-builder`,
`creators`, `creator-profile` and `resolve-page`. Screen features add the rest when their goldens
need them.

Content is the canvas placeholder data:
- the creators Omar K. ("Sharjah, Dubai · 6 years", "Weddings · Events · Portraits", "Speaks Arabic,
  English"), Mariam A. and Yusuf R.;
- the boards' visible code text "SH-0087";
- the guide "How to brief a wedding photographer", the page "How it works" and the "Terms"
  heading.

The Arabic is the boards' written Arabic.

## Versioning

- v1 only grows. Additive changes allowed in v1:
  - a new endpoint;
  - a new optional request field;
  - a new answer field;
  - a new enum value (clients decode it as `unknown`);
  - a new problem code (clients fall back);
  - loosening `auth`.
- Everything else is breaking and goes to `/api/mobile/v2`.
- `pnpm --filter @shoot/domain test` fails on any breaking change to the snapshot. An additive
  change is accepted with `pnpm --filter @shoot/domain api:snapshot`, which writes the snapshot in
  the same change.
- A deprecated field or endpoint is marked `deprecated` in the snapshot, answers carry
  `Deprecation: true`, and it keeps working until v2.
