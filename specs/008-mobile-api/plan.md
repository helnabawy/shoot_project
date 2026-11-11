# Implementation Plan: Mobile API (read endpoints, contracts and app links)

**Branch**: `008-mobile-api` | **Date**: 2026-11-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/008-mobile-api/spec.md`

## Summary

This feature gives the Flutter app its own versioned REST API on the web app, `/api/mobile/v1`,
and the contract that keeps installed apps working.

- **Wrapper.** `apps/web/src/shared/api/handler.ts` exports `defineHandler`, the only way to write
  an endpoint. It declares access (`none`, `optional`, `required`; Bearer Payload JWT only, never the
  cookie), parses the path, query and body with zod, negotiates the locale, reads the
  `X-Shoot-Install` id, applies declared rate limits, turns failures into `application/problem+json`
  with message-key codes, answers with the endpoint's declared success status (200 by default; 202
  and 204 for 009's commands), and sets `Cache-Control`.
- **Routes.** One-line `route.ts` files under `app/(payload)/api/mobile/v1/` re-export handlers from
  each module's `api.ts`, through its `index.ts`. A catch-all under `/api/mobile` answers unknown
  addresses with a 404 problem.
- **Reads.** Sixteen endpoints wrap the existing cached queries, unchanged:
  - site settings, navigation, personas with their categories, the brief builder, the landing;
  - creators directory and profile, specialty page, hire page;
  - guides list and article, editor pages, legal documents and versions;
  - `resolve?path=`, which answers page, removed or not found.
- **Wire shapes.** `toWire*` mappers in each module's `wire.ts` whitelist fields. Images go out as
  absolute URLs with a size list, and rich text as a reduced node tree built by a domain function.
- **Contract.** Zod schemas, an endpoint registry and JSON examples live in
  `packages/domain/src/api/v1/`. A JSON-schema snapshot at `specs/contracts/mobile-api/v1.schema.json`
  is guarded by an additive-only compatibility check.
- **App links.** The `/.well-known` association files are served from environment-configured app
  ids. The app gets matching iOS Associated Domains and Android `autoVerify` intent filters.
- **App data layer.** The Flutter app gets repositories and models for every read, an
  `InstallIdInterceptor`, problem decoding into failures, and `ShootImage`.

No database schema change and no migration.

## Technical Context

**Language/Version**:
- TypeScript strict on Node 24 LTS (`apps/web`, `packages/domain`).
- Dart 3.13.7 and Flutter 3.47.9 (`apps/mobile`, pinned in its README).

**Primary Dependencies**:
- Existing web stack: Next.js 16.4.3 route handlers, Payload 3.93.0 (Local API, `payload.auth`,
  `createLocalReq`), zod 4.6.7 (`z.toJSONSchema`), next-intl message files.
- Existing mobile stack: `dio` 5.11.1, `equatable`, `get_it`, `flutter_bloc`; 006's
  `shared_preferences` through `PreferencesStore`; 007's `SceneTile`.
- **No new package** on either side.

**Storage**:
- No new collection or field. Rate-limit counters use the existing `rate-limits` collection.
- On the device, one preference key (`install.id`).

**Testing**:
- Vitest:
  - domain unit tests with the 100 % gate;
  - web unit tests;
  - integration tests `apps/web/tests/integration/mobile-api-*.int.test.ts` against Testcontainers
    PostgreSQL, calling route handlers with `new Request(...)` and `schema.parse` on every answer.
- One Playwright request spec, `tests/e2e/mr-smoke.spec.ts`.
- Flutter `flutter_test` and `mocktail` for models, repositories, interceptors, `ShootImage` and the
  app-link configuration.
- Every test name carries its `MR-` id.

**Target Platform**:
- The web app (Node, standalone output) behind a CDN.
- The Flutter app on iOS (iPhone, iPad) and Android.

**Project Type**: web service inside the existing modular monolith, plus the mobile app's data
layer.

**Performance Goals**:
- Cached reads add no database round trip beyond the existing `cachedQuery` reads.
- The first page of `GET creators` is ≤ 100 KB compressed (SC-006).
- Public answers are cacheable for 60 s by shared caches.
- No change to any web page, so the landing JS budget is untouched.

**Constraints**:
- v1 is additive-only.
- Every endpoint declares its access (default deny).
- No internal field ever leaves the server.
- Codes, never text, in errors.
- English fallback for every localised field.
- No CMS copy, persona or profession as a constant.
- Freshness ≤ 60 s (Principle IV).
- No PII in logs.

**Scale/Scope**:
- 16 v1 endpoints, 1 catch-all and 2 `.well-known` files.
- About 40 zod schemas and about 25 example files.
- 8 problem codes.
- 5 Dart feature data layers, about 30 models.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (below).*

| Principle | Status | How this plan meets it |
|---|---|---|
| I. Spec-driven | Pass | Spec 008 is written and validated. This plan, then tasks, then analyze. 009–015 extend the same contract through their own specs. |
| II. Performance budgets | Pass | No web page or client bundle changes. Answers are served from the existing cached queries plus a 60 s shared cache. SC-006 caps the largest list. |
| III. Test-first | Pass | Every scenario maps to a named test ([quickstart.md](quickstart.md)). Schemas and examples are written before handlers. Integration tests run against Testcontainers PostgreSQL and parse every answer. The domain keeps its 100 % gate, and Dart changes keep 80 %. |
| IV. Content in the CMS | Pass | Every answer is CMS data read through the existing queries. Personas, specialties, options and copy are never constants (FR-015). The error words are interface strings, kept in the message files and ARB. Edits reach the app within 60 s (R7). |
| V. Modular | Pass | Handlers live in each module's `api.ts`, exported via `index.ts`. Business rules stay in `packages/domain`. The app reads product data only through this API (Principle V's mobile clause). One deployable. Stateless: rate limits are in the database. |
| VI. Accessible, bilingual, themed | Pass | Every answer is in `en` or `ar` with English fallback, plus `Content-Language`. Images carry alt text. Dark logo variants are sent. No visible UI is added: `ShootImage`'s fallback is 007's scene tile. |
| VII. Secure by default | Pass with note | Access is declared per endpoint, all `none` in 008. Input is validated at the boundary. Output is whitelisted. Rich text is reduced, with unsafe links dropped. There is no stack or PII in answers or logs, and the website cookie is never accepted. **Note**: the wrapper already accepts `Authorization: Bearer` (Payload's built-in auth, not a cookie) for `optional`/`required` endpoints, but 008 declares none. 009 records the Bearer-versus-cookie justification in its Constitution Check before it issues tokens, as the `mobile-api-contract` skill requires. |
| VIII. Simplicity | Pass with justification | No new package. Two new abstractions (the wrapper, and the endpoint registry with its compatibility check), justified below. |
| IX. Designed, not generated | N/A | No screen in this feature. `ShootImage` renders 007's designed scene tile and adds no visual of its own. |
| Stack | Pass | Next route handlers, the Payload Local API, zod and Vitest/Playwright on the web. Dio, cubit-free data layers and `flutter_test` on mobile. Constitution 1.4.0. |

## Project Structure

### Documentation (this feature)

```text
specs/008-mobile-api/
├── spec.md
├── plan.md              # this file
├── research.md          # Phase 0 decisions R1–R16
├── data-model.md        # wire shapes, ActorContext, endpoint definition, snapshot, Dart entities
├── quickstart.md        # how to verify; scenario → test mapping
├── contracts/
│   ├── mobile-api.md    # endpoint inventory, access table, headers, shapes, problems, app links
│   └── handler.md       # defineHandler contract, route-file rules, problem mapping, cache rules
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code

```text
packages/domain/
├── package.json                         # + export "./api/v1", + script "api:snapshot"
└── src/
    ├── content/links.ts (+ test)        # linkTarget(): the one safe-link rule (R10)
    └── api/v1/
        ├── index.ts
        ├── common.ts (+ test)           # localeV1, imageV1, linkV1, richTextV1 (recursive), paginationV1
        ├── problems.ts (+ test)         # problemV1, PROBLEM_CODES (R6)
        ├── richtext.ts (+ test)         # reduceRichText(lexical, { image }) (R10)
        ├── site.ts (+ test)             # site, navigation, personas, brief builder
        ├── landing.ts (+ test)          # hero, sectionV1 union (shared with pages)
        ├── creators.ts (+ test)         # creator card/list/profile, specialty, hire
        ├── content.ts (+ test)          # guides, article, page, legal, legal versions
        ├── resolve.ts (+ test)          # resolve request/answer, classifyPath() (R12)
        ├── app-links.ts (+ test)        # APP_LINK_PREFIXES, appleAssociation(), androidAssetLinks() (R13)
        ├── endpoints.ts (+ test)        # defineEndpoint, endpoints, ENDPOINTS (R11)
        ├── compat.ts (+ test)           # checkCompatible(old, next) (R11)
        ├── snapshot.ts                  # buildSnapshot(ENDPOINTS, PROBLEM_CODES)
        ├── snapshot.test.ts             # regenerate, compare, write with UPDATE_API_SNAPSHOT=1
        └── examples/*.json              # <endpoint-id>.json, <endpoint-id>.ar.json, problem-*.json, app-links.json

specs/contracts/mobile-api/v1.schema.json  # committed snapshot

apps/web/
├── messages/{en,ar}.json                # + api.errors.*
├── .env.example                         # + APP_IOS_APP_IDS, APP_ANDROID_PACKAGE, APP_ANDROID_CERT_SHA256
├── src/
│   ├── proxy.ts (+ proxy.test.ts)       # explicit \.well-known exclusion
│   ├── shared/lib/env.ts (+ test)       # the three optional app-link variables
│   ├── shared/payload/rate-limit.ts (+ test)   # the 429 carries retryAfter (T094; research R5)
│   ├── shared/ui/RichContent.tsx        # safeHref → linkTarget from @shoot/domain/content
│   ├── shared/api/
│   │   ├── handler.ts                   # defineHandler (contracts/handler.md)
│   │   ├── actor.ts                     # ActorContext (R15)
│   │   ├── negotiate.ts (+ test)        # negotiateLocale, readInstallId, clientAddressOf, visitorKeyOf, requestIdOf
│   │   ├── problem.ts (+ test)          # problem(), ApiProblem, fromZodError, problemResponse (re-exported by handler.ts)
│   │   ├── not-found.ts                 # notFoundV1, the catch-all handler
│   │   └── wire.ts (+ test)             # toWireImage, toWireRichText, toWireLink, mediaBase
│   ├── modules/
│   │   ├── site-settings/{api,wire,index}.ts (+ wire.test.ts)   # getSiteV1
│   │   ├── pages/{api,wire,resolve}.ts (+ tests), index.ts      # getNavigationV1, getPageV1, getHirePageV1, resolvePathV1
│   │   ├── personas/{api,wire,index}.ts (+ wire.test.ts)        # getPersonasV1
│   │   ├── brief/{api,wire,index}.ts (+ wire.test.ts)           # getBriefBuilderV1
│   │   ├── landing/{api,wire}.ts (+ wire.test.ts), index.ts     # getLandingV1, toWireSection (used by pages)
│   │   ├── creators/{api,wire}.ts (+ wire.test.ts), index.ts    # getCreatorsV1, getCreatorProfileV1, getSpecialtyV1
│   │   ├── guides/{api,wire}.ts (+ wire.test.ts), index.ts      # getGuidesV1, getGuideV1
│   │   ├── legal/{api,wire}.ts (+ wire.test.ts), index.ts       # getLegalV1, getLegalVersionsV1, getLegalVersionV1
│   │   └── app-links/{api,index}.ts                             # appleAssociationFile, assetLinksFile
│   └── app/
│       ├── .well-known/apple-app-site-association/route.ts
│       ├── .well-known/assetlinks.json/route.ts
│       └── (payload)/api/mobile/
│           ├── [...rest]/route.ts                               # 404 problem for anything unmatched
│           └── v1/
│               ├── site/route.ts  navigation/route.ts  personas/route.ts  brief-builder/route.ts  landing/route.ts
│               ├── creators/route.ts  creators/[code]/route.ts  work/[specialty]/route.ts  hire/[slug]/route.ts
│               ├── guides/route.ts  guides/[slug]/route.ts  pages/[slug]/route.ts
│               ├── legal/[kind]/route.ts  legal/[kind]/versions/route.ts  legal/[kind]/versions/[version]/route.ts
│               └── resolve/route.ts
└── tests/
    ├── unit/problem-codes.test.ts
    ├── integration/
    │   ├── mobile-api-handler.int.test.ts     # wrapper: auth, locale, cache, problems, install id, rate limit
    │   ├── mobile-api-access.int.test.ts      # every registered endpoint: route exists, declared access, catch-all
    │   ├── mobile-api-site.int.test.ts
    │   ├── mobile-api-creators.int.test.ts
    │   ├── mobile-api-content.int.test.ts
    │   ├── mobile-api-resolve.int.test.ts
    │   └── mobile-api-app-links.int.test.ts
    └── e2e/mr-smoke.spec.ts

apps/mobile/
├── ios/Runner/Runner.entitlements + ios/Flutter/{Debug,Release}.xcconfig    # applinks:$(APP_LINK_HOST)
├── android/app/src/main/AndroidManifest.xml + android/app/build.gradle.kts  # autoVerify intent filter, ${appLinkHost}
├── lib/core/
│   ├── install/install_id_store.dart
│   ├── network/{api_paths,api_get,json_read,install_id_interceptor}.dart, dio_client.dart (+ interceptor)
│   ├── error/{exceptions,failures}.dart           # + code, fields; + NotFoundFailure
│   ├── l10n/failure_message.dart + arb/app_{en,ar}.arb   # problem codes → words
│   ├── media/image_ref.dart                       # entity + model
│   ├── content/{rich_text,sections}.dart          # entities + models, Unknown* cases
│   └── widgets/shoot_image.dart
├── lib/features/{site,landing,creators,content,links}/
│   ├── domain/{entities,repositories}/
│   ├── data/{models,datasources,repositories}/
│   └── <feature>_injection.dart
└── test/
    ├── helpers/api_examples.dart                  # loads ../../packages/domain/src/api/v1/examples/*.json
    ├── core/…                                     # install id, interceptor, api_get, json_read, failure_message, shoot_image, app links
    └── features/<feature>/data/…                  # models decode examples; repositories map failures
```

**Structure Decision**:
- The API lives in the web app as handlers inside the modules that own the data. The rules and the
  contract live in `packages/domain`, so the app's tests can read the same examples without
  touching `apps/web`.
- The app side touches `core/` for cross-cutting parts (network, errors, media, rich text, install
  id) and adds five feature folders with domain and data layers only. Screens come in 010–015.

## Post-design Constitution re-check

The data model adds wire shapes, a context type and a snapshot file. It adds no collection, field
or migration. The contracts are the public v1 API and the internal wrapper contract. Access is
declared per endpoint, and every 008 endpoint is public by design (spec Assumptions). No package
was added. The gate passes, with Principle VII's Bearer note carried to 009.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| `defineHandler` wrapper (`apps/web/src/shared/api/`: `handler.ts`, `actor.ts`, `negotiate.ts`, `problem.ts`, `wire.ts`) | Every endpoint must apply the same access rule, input validation, locale fallback, install-id key, problem format and cache header (FR-002 to FR-010). One wrapper makes forgetting one impossible and is the single place tests prove them. | Hand-written handlers: 16 copies now and dozens by 015, each a chance to leak a cookie session, a stack trace or a stale cache header. A framework (tRPC, ts-rest, Hono): a new package, a second router and a foreign error format. |
| Endpoint registry and compatibility check (`packages/domain/src/api/v1/endpoints.ts`, `compat.ts`, `snapshot.ts`) | v1 must only grow (FR-032), and access must match the contract. The registry ties each handler's auth, cache, input and output to one definition. The check classifies a snapshot change as additive or breaking (R11). | Plain snapshot equality: every additive change looks like a break, so reviewers update blindly. A JSON-schema diff package: a new dependency for about 150 lines of rules that are specific to this contract. OpenAPI as the source: a second schema language plus a generator. |
