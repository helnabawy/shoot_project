---

description: "Task list for feature 008 — mobile API (read endpoints, contracts and app links)"
---

# Tasks: Mobile API

**Input**: Design documents from `specs/008-mobile-api/`.

**Prerequisites**:
- The design documents: plan.md, spec.md, research.md (R1–R16), data-model.md,
  contracts/mobile-api.md, contracts/handler.md and quickstart.md.
- Features 001, 002, 003 and 005 merged. Every endpoint wraps their queries.
- On the app side, feature 006 (`PreferencesStore`) and feature 007 merged. 007 provides
  `SceneTile`, `test/helpers`, and the scenario check over Dart tests (its T005).

**Skills**: read `mobile-api-contract`, `payload-cms`, `testing-strategy`, `persona-extensibility`
and `flutter-mobile` before starting. This feature adds no visible UI, so the impeccable gates do
not apply. `ShootImage` only shows 007's `SceneTile`.

**Tests**: required by the constitution (Principle III).
- Every phase lists its tests first: write them, watch them fail, then implement.
- Test names carry the 008 ids (`MR-US3-S2`).
- `quickstart.md` holds the scenario → test mapping.
- Integration tests call route handlers with `new Request(...)` against the seeded Testcontainers
  PostgreSQL, and `schema.parse` every answer (research R16).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task).
- **[Story]**:
  - US1: site basics in the person's language
  - US2: installed apps keep working
  - US3: creators
  - US4: guides, pages and legal
  - US5: links
- Paths are relative to the repository root.
  - `web/` means `apps/web/src/`.
  - `wtest/` means `apps/web/tests/`.
  - `dom/` means `packages/domain/src/`.
  - `v1/` means `packages/domain/src/api/v1/`.
  - `mobile/` means `apps/mobile/`.
- Node commands need Node 24 (`nvm use`). Flutter commands run in `apps/mobile`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: the package export, configuration, message keys, the scenario check and the shared
example loader.

- [x] T001 Add the v1 contract entry point.
  - Add `"./api/v1": "./src/api/v1/index.ts"` to the `exports` of `packages/domain/package.json`.
  - Add the script `"api:snapshot": "UPDATE_API_SNAPSHOT=1 vitest run src/api/v1/snapshot.test.ts"`.
  - Create `v1/index.ts` (re-exports, filled by later tasks) and `v1/examples/`.
  - Create the folder `specs/contracts/mobile-api/`; the snapshot itself is written in T050.
- [x] T002 [P] Add `APP_IOS_APP_IDS`, `APP_ANDROID_PACKAGE` and `APP_ANDROID_CERT_SHA256` to
  `web/shared/lib/env.ts`, all optional.
  - Validation: `TEAMID.bundle.id` items, a Java package name, and `AA:BB:…` 32-byte fingerprints;
    each list is comma-separated and trimmed.
  - Add cases to `web/shared/lib/env.test.ts`: valid, malformed, unset.
  - Document the three variables in `apps/web/.env.example`.
- [x] T003 [P] Add the `api.errors` namespace to `apps/web/messages/en.json` and `ar.json`, with
  `invalidInput`, `invalidField`, `localeUnsupported`, `notFound`, `unauthorized`, `tokenInvalid`,
  `rateLimited` and `unexpected` (research R6).
  - The Arabic is written by someone who writes Arabic.
  - The existing `tests/unit/messages.test.ts` must stay green (same keys in both files).
- [x] T004 [P] Add `node scripts/check-scenario-tests.mjs specs/008-mobile-api/quickstart.md` to
  `check:scenarios` in the root `package.json`.
  - Confirm `scripts/check-scenario-tests.mjs` searches `apps/mobile/test` and recognises Dart test
    names (007 T005). If that task has not landed, apply the same change here.
- [x] T005 [P] Create `mobile/test/helpers/api_examples.dart`. `loadExample(name)` reads
  `../../packages/domain/src/api/v1/examples/<name>.json` relative to `apps/mobile` and returns the
  decoded map. A missing file fails with its name and path.

**Checkpoint**: the domain package exports `@shoot/domain/api/v1`; messages and env validate;
`pnpm check:scenarios` knows the 008 table.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: common shapes, problems, rich text, the endpoint registry, the `defineHandler`
wrapper and the app's network core. These are used by every story.

### Tests first

- [x] T006 [P] Write `v1/common.test.ts`.
  - `imageV1`:
    - **`MR-US3-S5`**: absolute URLs only, `sizes` non-empty, ascending and unique;
    - a relative URL is refused.
  - `linkV1`: the path starts with `/` and has no `/ar` prefix.
  - `richTextV1`: every node kind parses; an unknown node kind is refused; depth 9 is refused.
  - `paginationV1`: the page bounds.
- [x] T007 [P] Write `v1/problems.test.ts`.
  - `PROBLEM_CODES` entries are unique and match the message-key pattern.
  - `problemV1` accepts each status in research R6.
  - `fields` is accepted on 422 only, and `retryAfter` on 429 only.
- [x] T008 [P] Write `dom/content/links.test.ts` and `v1/richtext.test.ts`. **`MR-US4-S2`** covers:
  - `linkTarget`:
    - `/guides/x` and `/ar/guides/x` give `/guides/x`;
    - `https:`, `mailto:` and `tel:` are kept;
    - `javascript:`, `data:`, `//evil` and an empty URL give `null`.
  - `reduceRichText` on Lexical fixtures:
    - paragraphs with bold and italic text (format bits);
    - h1 clamps to 2 and h6 to 4;
    - nested ordered and bullet lists;
    - a quote;
    - a link to a site path, an external link, and a `javascript:` link that becomes plain text;
    - an upload, which becomes an `image` node through the callback;
    - an unknown node whose text is kept;
    - empty paragraphs dropped;
    - depth 9 flattened;
    - a `null` or empty state gives `{ nodes: [] }`.
- [x] T009 [P] Write `v1/endpoints.test.ts` for the registry rules.
  - Ids are unique.
  - `(method, path)` is unique.
  - Every path starts with `/api/mobile/v1/`, and its `{param}`s equal the `input.params` keys.
  - Every endpoint names at least one example (a `status: 204` endpoint names none and has
    `output: noContentV1`), and every example file exists; `requestExamples` parse with
    `input.shape.body`.
  - `deprecated` is true when the endpoint or any field of its `output` carries
    `.meta({ deprecated: true })` (**FR-033**).
  - The test passes on an empty registry and runs against each story's additions.
- [x] T010 [P] Write `web/shared/api/negotiate.test.ts`.
  - **`MR-US1-S3`**: `?locale=ar` beats `Accept-Language: en`; `fr` is invalid.
  - `Accept-Language`:
    - `fr;q=1, ar;q=0.8` gives `ar`;
    - `ar-AE` gives `ar`;
    - `de` and an absent header give `en`.
  - **`MR-US2-S8`**: `readInstallId`:
    - 32 lower-case hex is accepted;
    - upper case, 31 characters and non-hex are rejected;
    - `visitorKeyOf` falls back from `install:<id>` to the first `x-forwarded-for`, then
      `x-real-ip`, then `anonymous`;
    - `clientAddressOf` returns the first `x-forwarded-for`, else `x-real-ip`, else `null`, whether
      or not an install id is present (009 limits per address).
  - `requestIdOf` echoes a valid id and generates one otherwise.
- [x] T011 [P] Write `web/shared/api/problem.test.ts` (**`MR-US2-S6`**).
  - `problem()` sets the JSON body, `application/problem+json`, `no-store`, and `Retry-After` on 429.
  - `fromZodError`:
    - one entry per path, the first issue winning;
    - a message-key issue message is kept;
    - any other message becomes `api.errors.invalidField`;
    - paths are joined with `.`.
  - No `title`, `detail` or `stack` key ever appears.
- [x] T012 [P] Write `web/shared/api/wire.test.ts` (**`MR-US3-S5`**).
  - `toWireImage`:
    - relative `/api/media/file/x.webp` is prefixed with `NEXT_PUBLIC_SITE_URL`, and an S3 URL is
      kept;
    - sizes `thumbnail`, `card`, `hero` and the original are sorted ascending, with duplicate
      widths removed;
    - a missing file gives `null`;
    - an image without sizes gives the original only;
    - alt `null` becomes `""`.
  - `toWireRichText` passes `toWireImage` to `reduceRichText`.
  - `toWireLink` strips the locale prefix.
- [x] T013 Write `wtest/integration/mobile-api-handler.int.test.ts`, with test-only handlers
  defined in the file through `defineHandler`: `none`, `optional`, `required`, one with
  `rateLimit: { action: 'test', limit: 2 }`, one that throws, one that returns a wrong shape, one
  `deprecated`, one with `status: 202` and one with `status: 204`.
  Get tokens with `payload.login` for a seeded member.
  - **`MR-US2-S7`**:
    - `required` with no token gives 401 `api.errors.unauthorized`;
    - an expired or garbage token gives 401 `api.errors.tokenInvalid` on `optional` and `required`;
    - a valid token gives 200, `private, no-store`;
    - `none` ignores any token and stays `public, s-maxage=60`;
    - a request with only the `payload-token` cookie of a signed-in member is a visitor on
      `optional`.
  - **`MR-US2-S6`**:
    - the throwing handler gives 500 `api.errors.unexpected`, the body has no message or stack, and
      the logger spy received no header, query or user data;
    - the wrong-shape handler gives 500 outside production.
  - **`MR-US2-S8`**:
    - two install ids from one `x-forwarded-for` each get 2 requests, and the third from one id is
      429 `api.errors.rateLimited` with `Retry-After`;
    - without an install id, the address is counted.
  - Also:
    - `?locale=fr` gives 422 with `fields[0] = { path: 'query.locale', code: 'api.errors.localeUnsupported' }`;
    - `Content-Language` and `Vary` are set;
    - `X-Request-Id` is echoed;
    - the `deprecated` handler answers with `Deprecation: true`, the others without it (**FR-033**);
    - the `status: 202` handler answers 202 with its body; the `status: 204` handler answers 204
      with an empty body (used by 009's `otp/request` and `logout`).

### Implementation

- [x] T014 Create `v1/common.ts`: `localeV1`, `imageSizeV1`, `imageV1`, `linkV1`, `externalLinkV1`,
  `inlineV1`, `blockV1` (recursive through zod 4 getters), `richTextV1` and `paginationV1`, per
  data-model.md. Export them from `v1/index.ts`. T006 passes.
- [x] T015 Create `v1/problems.ts`: `PROBLEM_CODES`, `ProblemCode`, `problemFieldV1` and
  `problemV1`. T007 passes.
- [x] T016 Create `dom/content/links.ts` (`linkTarget`) and export it from `dom/content/index.ts`.
  Change `web/shared/ui/RichContent.tsx` `safeHref` to call `linkTarget`, then localise the site
  path as today. `RichContent.test.tsx` stays green.
- [x] T017 Create `v1/richtext.ts`: `reduceRichText(state, { image })` per research R10. T008 passes.
- [x] T018 Create `v1/endpoints.ts`: `defineEndpoint` (fields per data-model.md, including the
  optional `status` and `requestExamples`, and `deprecated` derived from the output schema), the
  `Endpoint` type, `noContentV1`, an empty `endpoints` record and `ENDPOINTS`. Stories register their
  endpoints here. T009 passes.
  - Done as: the machinery (`defineEndpoint`, `noContentV1`, the types and `registryProblems`, the
    registry rules T009 runs against `ENDPOINTS`) lives in `v1/registry.ts`, so a schema file can
    never import the record; `v1/endpoints.ts` holds `endpoints`/`ENDPOINTS` and re-exports the rest.
- [x] T019 Create these in `web/shared/api/`:
  - `actor.ts`: `ActorContext` per data-model.md (with `clientAddress`);
  - `negotiate.ts`: `negotiateLocale`, `readInstallId`, `clientAddressOf`, `visitorKeyOf`,
    `requestIdOf`;
  - `problem.ts`: `problem`, `ApiProblem`, `fromZodError` and `problemResponse`.

  T010 and T011 pass.
- [x] T094 Change `consumeAllowance` in `apps/web/src/shared/payload/rate-limit.ts` so its 429
  `APIError` carries `data: { retryAfter }`, the seconds to the end of the hourly window (research
  R5). Write the failing case in `rate-limit.test.ts` first. The brief and upload callers are
  unchanged. 009 relies on this (its T022 only confirms it).
- [x] T020 Create `web/shared/api/handler.ts`: `defineHandler` per contracts/handler.md. Needs
  T094.
  - Steps 1–9 in order.
  - Auth copies only `Authorization`.
  - The rate limit goes through `createLocalReq` and `consumeAllowance`, whose 429 `data.retryAfter`
    becomes the problem's `retryAfter` and the `Retry-After` header.
  - The output check runs outside production.
  - The success status comes from `status` (default 200); 204 sends no body.
  - Cache headers come from the cache class and the resolved user.
  - It adds `Deprecation` per the header table.
  - It re-exports `problem` and `ApiProblem` from `problem.ts`, so handlers import
    `{ defineHandler, problem }` from `@/shared/api/handler`.
- [x] T021 Create `web/shared/api/wire.ts`: `mediaBase()` (from the validated env), `toWireImage`,
  `toWireRichText` and `toWireLink`. T012 passes.
- [x] T022 Add the catch-all.
  - Create `web/shared/api/not-found.ts` (`notFoundV1`, `auth: 'none'`, always 404
    `api.errors.notFound`).
  - Create `web/app/(payload)/api/mobile/[...rest]/route.ts`, exporting it as `GET`, `POST`,
    `PATCH`, `PUT` and `DELETE`.
  - Add to `wtest/integration/schema.int.test.ts`: no collection or global slug equals `mobile`.
  - T013 passes.

### App network core

- [x] T023 [P] Write the Dart tests.
  - `mobile/test/core/install/install_id_store_test.dart` (**`MR-US2-S8`**), using 006's in-memory
    `PreferencesStore`:
    - the first call creates 32 lower-case hex characters, and a new store instance returns the
      same id;
    - a failed write keeps the id for the session;
    - two fresh stores give different ids.
  - `mobile/test/core/network/install_id_interceptor_test.dart` (**`MR-US2-S8`**): every request
    carries `X-Shoot-Install` with the stored id, next to `Accept-Language`.
  - `mobile/test/core/network/api_get_test.dart` (**`MR-US2-S6`**):
    - a problem body becomes `ServerException(statusCode, code, fields)`;
    - a non-problem error body gives `code: null`;
    - a timeout gives `NetworkException`;
    - a 200 with a non-object body gives `ServerException`.
  - `mobile/test/core/network/json_read_test.dart`:
    - the typed readers throw `FormatException` on a missing or mistyped field;
    - `readEnum` maps an unknown value to the fallback.
  - `mobile/test/core/media/image_ref_model_test.dart`: decoding, and `pick()` for 120 px at 1×,
    2× and 3× against sizes 400, 800 and 1600, plus a larger target than any size.
- [x] T024 Create `mobile/lib/core/install/install_id_store.dart` (`InstallIdStore.id()`,
  `Random.secure()`, key `install.id` through `PreferencesStore`). Register it in
  `mobile/lib/core/di/injection.dart`.
- [x] T025 Create `mobile/lib/core/network/install_id_interceptor.dart`. Add it in `createDio` in
  `mobile/lib/core/network/dio_client.dart`, after `LanguageInterceptor`, and update
  `test/core/network/dio_client_test.dart`.
- [x] T026 Update the errors and network core.
  - Add `code` and `fields` to `ServerException` (`mobile/lib/core/error/exceptions.dart`) and
    `code` to `ServerFailure`, and add `NotFoundFailure` (`failures.dart`). Keep the existing
    callers compiling.
  - Create `mobile/lib/core/network/api_paths.dart` (`apiV1 = '/api/mobile/v1'`) and
    `api_get.dart` (`apiGet(dio, path, {query})`, per research R14).
- [x] T027 Create `mobile/lib/core/network/json_read.dart` (`readString`, `readNullableString`,
  `readInt`, `readBool`, `readList`, `readObject`, `readEnum`) and
  `mobile/lib/core/media/image_ref.dart` (the `ImageRef` entity, `ImageRefModel.fromJson` and
  `pick`). T023 passes.
  - Built on branch `008-app-network-core` before the web side existed. The Dart tests read local
    stand-ins in `mobile/test/fixtures/api/v1/` (`problem-422.json`, `problem-404.json`,
    `image.json`) through `mobile/test/helpers/api_fixture.dart`. **After the merge**, point
    `apiFixture` at `packages/domain/src/api/v1/examples/` (the image becomes the logo in
    `site.json`) and delete the local folder.
  - Also added: `PreferenceKeys.installId` (in `PreferenceKeys.all`, so the device store keeps it),
    `readNullableObject` and `asObject` in `json_read.dart`, and `NotFoundFailure` words
    (`notFoundTitle`) in `failure_message.dart`.

**Checkpoint**: the wrapper and the catch-all pass their integration test. The app sends the
install id and decodes problems. No product endpoint exists yet.

---

## Phase 3: User Story 1 — The site's own words and settings, in the person's language (P1) 🎯 MVP

**Goal**: `GET site`, `navigation`, `personas`, `brief-builder` and `landing` answer in English and
Arabic, are decoded by the app, and send nothing internal.

**Independent test**: `pnpm --filter web test -- mobile-api-site` passes. In the app,
`site_repository_impl_test.dart` passes.

### Tests first

- [x] T028 [P] [US1] Write `v1/site.test.ts` and `v1/landing.test.ts`.
  - Each schema accepts its examples (English and Arabic) and refuses a missing required field.
  - **`MR-US1-S5`**: `sectionV1` accepts each of the nine types; an unknown `type` is refused
    server-side.
  - `briefBuilderV1` accepts `builder: null`.
- [x] T029 [P] [US1] Write the mapper unit tests. Each feeds a document that also contains
  internal fields.
  - `web/modules/site-settings/wire.test.ts` (**`MR-US1-S6`**): `briefLimitPerHour`,
    `autoPublishEdits`, `translationStatus`, `quickMatch.templates` and `quickMatch.channels` are
    absent, and `quickMatchEnabled` is kept.
  - `web/modules/personas/wire.test.ts` (**`MR-US1-S4`**): order is kept, `copy` is not sent, and
    categories carry `personaIds`.
  - `web/modules/brief/wire.test.ts`.
  - `web/modules/landing/wire.test.ts` (**`MR-US1-S5`**):
    - each block maps;
    - `categoriesGrid` tiles carry the counts;
    - `creatorNetwork` carries the cards;
    - an unknown block is skipped.
  - `web/modules/pages/wire.test.ts`: navigation.
- [x] T030 [P] [US1] Write `wtest/integration/mobile-api-site.int.test.ts` against the seed. Every
  answer is parsed with its schema.
  - **`MR-US1-S1`**:
    - `GET site` returns the seeded WhatsApp number, message and reply time;
    - after `payload.updateGlobal` the next call returns the new number (the cache is mocked);
    - the answer carries `Cache-Control: public, s-maxage=60`.
  - **`MR-US1-S2`**:
    - with `Accept-Language: ar`, the texts are the seeded Arabic;
    - a field cleared in Arabic returns its English text;
    - `Content-Language: ar` is set.
  - **`MR-US1-S3`**: `?locale=ar` with `Accept-Language: en` answers in Arabic; `?locale=fr` gives
    422.
  - **`MR-US1-S4`**:
    - adding a persona to Site Settings' active list makes it appear in order;
    - switching it off removes it and its categories;
    - no endpoint answer contains a persona that is not in the CMS.
  - **`MR-US1-S5`**: `GET brief-builder` returns the seeded sentence and slots with options, and
    `GET landing` returns the sections in CMS order.
  - **`MR-US1-S6`**: the serialised bodies of all five contain none of the internal names in
    contracts/mobile-api.md.
- [ ] T031 [P] [US1] Write the Dart tests.
  - `mobile/test/features/site/data/models/site_models_test.dart` (**`MR-US1-S2`**): `site`,
    `navigation`, `personas` and `brief-builder` in English and Arabic decode, map to entities, and
    the Arabic strings come through.
  - `mobile/test/features/site/data/repositories/site_repository_impl_test.dart` (**`MR-US1-S1`**):
    - a datasource value gives `Ok`;
    - `NetworkException` gives `NetworkFailure`;
    - `ServerException(404)` gives `NotFoundFailure`;
    - `ServerException(500, code)` gives `ServerFailure(code)`.
  - `mobile/test/features/landing/data/landing_models_test.dart`.
  - `mobile/test/core/content/sections_model_test.dart` (**`MR-US1-S5`**): every section type in
    `landing.json` decodes, and an unknown `type` gives `UnknownSection`.

### Implementation

- [x] T032 [US1] Create `v1/site.ts` and `v1/landing.ts` per data-model.md. Register `site`,
  `navigation`, `personas`, `briefBuilder` and `landing` in `v1/endpoints.ts` with `auth: 'none'`
  and `cache: 'public'`.
- [x] T033 [P] [US1] Write the examples in `v1/examples/`:
  - `site.json` and `site.ar.json`, `navigation.json` and `.ar.json`, `personas.json` and
    `.ar.json`, `brief-builder.json` and `.ar.json`, and `landing.json`;
  - the content comes from the canvas boards (the landing board's copy and the "Omar K." card in
    `creatorNetwork`), and the Arabic is the boards' written Arabic.

  T028 passes.
- [x] T034 [P] [US1] In `web/modules/site-settings/`:
  - `wire.ts` (`toWireSite`);
  - `api.ts` (`getSiteV1`, reading `getSiteSettings(ctx.locale)`);
  - a new `index.ts` exporting `getSiteV1`.
- [x] T035 [P] [US1] In `web/modules/personas/`:
  - `wire.ts` (`toWirePersona`, `toWireCategory`);
  - `api.ts` (`getPersonasV1`, reading `getActivePersonas` and `getCategoriesForAudience`);
  - a new `index.ts`.
- [x] T036 [P] [US1] In `web/modules/brief/`:
  - `wire.ts` (`toWireBriefBuilder`);
  - `api.ts` (`getBriefBuilderV1`, reading `getBriefBuilderConfig`, with `null` when off);
  - a new `index.ts`.
- [x] T037 [US1] In `web/modules/landing/`:
  - `wire.ts`: `toWireHero` and `toWireSection`, for the nine block types, using the data
    `getBlockContext` resolves. `toWireSection` is exported for `pages`.
  - `api.ts`: `getLandingV1`.
  - Export both from `index.ts`.
- [x] T038 [P] [US1] In `web/modules/pages/`:
  - `wire.ts` (`toWireNavigation`);
  - `api.ts` (`getNavigationV1`);
  - export from `index.ts`.
- [x] T039 [US1] Create the route files under `web/app/(payload)/api/mobile/v1/`: `site/`,
  `navigation/`, `personas/`, `brief-builder/` and `landing/` `route.ts`, each a one-line re-export.
  T029 and T030 pass.
- [ ] T040 [P] [US1] Create `mobile/lib/core/content/rich_text.dart` (sealed `RichBlock` and
  `RichInline` with `Unknown*` cases, plus models) and `mobile/lib/core/content/sections.dart`
  (sealed `Section` with `UnknownSection`, plus models).
- [ ] T041 [US1] Create `mobile/lib/features/site/`:
  - `domain/entities/` (`SiteInfo`, `Navigation`, `Audience`, `BriefBuilder`);
  - `domain/repositories/site_repository.dart`;
  - `data/models/`, `data/datasources/site_remote_data_source.dart` (via `apiGet`) and
    `data/repositories/site_repository_impl.dart`;
  - `site_injection.dart`, registered in `core/di/injection.dart`.
- [ ] T042 [US1] Create `mobile/lib/features/landing/` with the same layers (`Landing`, `Hero`;
  `LandingRepository`) and `landing_injection.dart`. T031 passes.

**Checkpoint**: MR-US1-S1 to S6 pass. The app can read every site basic in both languages.

---

## Phase 4: User Story 2 — Installed apps keep working; errors speak the person's language (P1)

**Goal**: the snapshot, the compatibility check, examples on both sides, problem codes with words
everywhere, and access proven for every endpoint.

**Independent test**: `pnpm --filter @shoot/domain test` passes. A deliberate breaking edit in a
scratch copy fails with the endpoint and pointer. `flutter test test/core` passes.

### Tests first

- [x] T043 [P] [US2] Write `v1/compat.test.ts`, with one case per rule in research R11 on small
  hand-written schema pairs.
  - **`MR-US2-S1`**: these pass:
    - a new endpoint;
    - a new optional query field;
    - a new output field;
    - a new output enum value;
    - a new problem code;
    - `auth` from `optional` to `none`.
  - **`MR-US2-S2`**: these fail, with endpoint id and JSON pointer:
    - a removed endpoint, or a changed path or method;
    - a removed or renamed output field;
    - an output field made optional or nullable;
    - a type change;
    - a new required input field;
    - a narrowed input enum, pattern, length or range;
    - `auth` from `none` to `optional`;
    - a removed problem code.
- [x] T044 [P] [US2] Write `v1/snapshot.test.ts`.
  - Regenerate from `ENDPOINTS` and `PROBLEM_CODES` and compare with
    `specs/contracts/mobile-api/v1.schema.json`. It fails with "breaking" when `checkCompatible`
    reports breaks, and with "run api:snapshot" when the change is additive.
  - With `UPDATE_API_SNAPSHOT=1`, it writes the file only when the change is additive.
  - **`MR-US2-S1`**: an additive change is accepted and recorded.
  - **`MR-US1-S6`**: no property named in the internal list (contracts/mobile-api.md) appears
    anywhere in the snapshot.
  - **FR-033**: a field marked `.meta({ deprecated: true })` appears with `deprecated: true` in the
    snapshot, and removing it later is still reported as breaking.
- [x] T045 [P] [US2] Write `v1/examples.test.ts` (**`MR-US2-S3`**).
  - Every file in `v1/examples/` is claimed by exactly one endpoint, problem or app-link entry, and
    parses with its schema.
  - The inventory table in `specs/008-mobile-api/contracts/mobile-api.md` lists exactly the
    registry's ids, methods, paths, auth and cache.
- [x] T046 [P] [US2] Write `wtest/unit/problem-codes.test.ts` (**`MR-US2-S4`**). Every
  `PROBLEM_CODES` entry, and every message key used by a v1 input schema, exists in
  `apps/web/messages/en.json` and `ar.json` with non-empty text.
- [x] T047 [P] [US2] Write `wtest/integration/mobile-api-access.int.test.ts` (**`MR-US2-S7`**).
  For each entry in `ENDPOINTS`:
  - the route file at its path exists and exports its method;
  - an anonymous call with valid example params answers 200, or 404 where the seed has no such
    thing, as declared;
  - **SC-001**: the call is made with `Accept-Language: en` and with `ar`; each 200 answer parses
    with the endpoint's `output` and carries the matching `Content-Language`;
  - a call with a seeker token answers the same body and stays `public`, because every 008 endpoint
    is `none`.

  Also:
  - `GET /api/mobile/v1/nope` and `/api/mobile/v2/site` answer a 404 problem;
  - `POST` to a GET endpoint is Next's 405 with no body (the documented exception in
    contracts/handler.md).
- [ ] T048 [P] [US2] Write the Dart tests.
  - `mobile/test/core/l10n/failure_message_test.dart` (**`MR-US2-S4`**):
    - every code in `specs/contracts/mobile-api/v1.schema.json` `problems` maps to a specific
      message in English and Arabic;
    - an unknown code gives the general message.
  - `mobile/test/core/network/forward_compat_test.dart` (**`MR-US2-S5`**): copies of the examples
    with an extra field everywhere and an unknown value in every enum still decode, enums read
    `unknown`, and sections and nodes give their `Unknown*` case.
  - `mobile/test/api_examples_test.dart` (**`MR-US2-S3`**):
    - a table from example name to model `fromJson`, which every story extends;
    - each example decodes and `toEntity()` succeeds;
    - every file in the examples folder has a row.

### Implementation

- [x] T049 [US2] Create `v1/compat.ts`: `checkCompatible(old, next)` over the snapshot document,
  returning `{ endpoint, pointer, rule }[]`. T043 passes.
- [x] T050 [US2] Create `v1/snapshot.ts`: `buildSnapshot(ENDPOINTS, PROBLEM_CODES)` using
  `z.toJSONSchema` (input `io: 'input'`, output `io: 'output'`, `target: 'draft-2020-12'`), with
  keys sorted. Run `pnpm --filter @shoot/domain api:snapshot` and commit the first
  `specs/contracts/mobile-api/v1.schema.json` (the US1 endpoints). T044 and T045 pass.
- [ ] T051 [US2] Map the problem codes in the app.
  - In `mobile/lib/core/l10n/failure_message.dart`, map `ServerFailure.code` and `NotFoundFailure`
    to ARB strings with an exhaustive switch over the known codes, and fall back to
    `failureServer`.
  - Add `problemInvalidInput`, `problemNotFound`, `problemUnauthorized`, `problemTokenInvalid`,
    `problemRateLimited` and `problemUnexpected` (the field-level codes share `problemInvalidInput`)
    to `app_en.arb` (with descriptions) and to `app_ar.arb` (written Arabic).
  - Regenerate the localisations. T046 and T048 pass.

**Checkpoint**: MR-US2-S1 to S8 pass. Every later story ends with `api:snapshot` and new rows in
`api_examples_test.dart`.

---

## Phase 5: User Story 3 — Find and look at creators in the app (P1)

**Goal**: `GET creators`, `creators/{code}`, `work/{specialty}` and `hire/{slug}`, decoded by the
app, with `ShootImage`.

**Independent test**: `pnpm --filter web test -- mobile-api-creators` passes, and so does
`flutter test test/features/creators test/core/widgets/shoot_image_test.dart`.

### Tests first

- [ ] T052 [P] [US3] Write `v1/creators.test.ts`.
  - The schemas accept their examples and refuse a missing `displayCode`.
  - `creatorsRequestV1` accepts `page: '2'` and ignores unknown keys.
  - `params.code` is 1–16 characters.
- [ ] T053 [P] [US3] Write `web/modules/creators/wire.test.ts` (**`MR-US3-S1`**).
  - Cards come from `describeCreator`.
  - `matchValues`, `gender`, `personaIds` and `listing` state are never present.
  - The photo goes through `toWireImage`.

  Also extend `web/modules/pages/wire.test.ts` for `toWireHirePage`: the preset, at most six
  creators and the FAQ as rich text.
- [ ] T054 [P] [US3] Write `wtest/integration/mobile-api-creators.int.test.ts` with the creators
  fixtures (`wtest/integration/setup/creators.ts`): listed, unlisted, suspended and featured.
  - **`MR-US3-S1`**:
    - only listed creators appear, featured first, then newest;
    - `?specialty=`, `?type=` and `?place=` narrow the list, and the filter counts match
      `buildDirectory`;
    - `?page=99` returns the last page with its real number;
    - the gzip size of page 1 is ≤ 100 KB (SC-006).
  - **`MR-US3-S2`**:
    - the lower-case code and a code with an earlier prefix return the profile, with
      `displayCode` in the current prefix;
    - unknown, unpublished and suspended codes give a 404 problem;
    - the answer has no `gender`.
  - **`MR-US3-S3`**: `GET work/{slug}` returns the text, counts, creators and samples; a specialty
    outside the audience gives 404.
  - **`MR-US3-S4`**:
    - `GET hire/{slug}` returns the intro, the builder with the preset, at most six creators,
      `creatorTotal` and the FAQ;
    - the other language's slug answers with the current `path`;
    - a draft gives 404.
- [ ] T055 [P] [US3] Write the Dart creators tests.
  - `mobile/test/features/creators/data/models/creator_models_test.dart` (**`MR-US3-S4`**): the
    `creators`, `creator-profile` (English and Arabic), `specialty` and `hire-page` examples decode
    and map to entities.
  - `mobile/test/features/creators/data/repositories/creators_repository_impl_test.dart`:
    - **`MR-US3-S1`**: filters and page are passed as query values;
    - **`MR-US3-S2`**: a 404 gives `NotFoundFailure`, and network and server errors map as in US1.
- [ ] T056 [P] [US3] Write `mobile/test/core/widgets/shoot_image_test.dart`.
  - **`MR-US3-S5`**: at width 120 the image requests the 400 size at DPR 2 and DPR 3, and the 1600
    size at width 700 and DPR 3. `cacheWidth` is set. Use a fake `HttpClient` through
    `HttpOverrides`, so there is no network.
  - **`MR-US3-S6`**: `image: null` renders `SceneTile`; a failing load renders `SceneTile`; while
    loading, `SceneTile` shows; the semantics label is the alt text, and an empty alt is excluded
    from semantics.

### Implementation

- [ ] T057 [US3] Create `v1/creators.ts` per data-model.md. Register `creators`,
  `creatorProfile`, `specialty` and `hirePage`.
- [ ] T058 [P] [US3] Write the examples:
  - `creators.json` and `.ar.json`, `creator-profile.json` and `.ar.json`, `specialty.json` and
    `hire-page.json`;
  - use Omar K., Mariam A. and Yusuf R. with their board places, specialties and languages, and
    the visible code text "SH-0087" for Omar K.;
  - image URLs use `https://example.test/api/media/file/…`, with sizes 400, 800 and 1600.

  T052 passes.
- [ ] T059 [US3] In `web/modules/creators/`:
  - `wire.ts` (`toWireCreatorCard`, `toWireCreatorList`, `toWireCreatorProfile`,
    `toWireSpecialtyPage`);
  - `api.ts` (`getCreatorsV1` over `getPublicCreators`, `getDirectoryContext` and
    `buildDirectory`; `getCreatorProfileV1`; `getSpecialtyV1`);
  - export them from `index.ts`.
- [ ] T060 [US3] In `web/modules/pages/`:
  - `wire.ts` gains `toWireHirePage`, which uses `toWireSection` from `@/modules/landing` and
    `toWireCreatorCard` from `@/modules/creators`;
  - `api.ts` gains `getHirePageV1` over `getIntentPage`;
  - export it from `index.ts`.
- [ ] T061 [US3] Create the route files `creators/route.ts`, `creators/[code]/route.ts`,
  `work/[specialty]/route.ts` and `hire/[slug]/route.ts`. T053 and T054 pass.
- [ ] T062 [US3] Create `mobile/lib/features/creators/` (entities, `CreatorsRepository`, models,
  datasource, repository impl) and `creators_injection.dart`. T055 passes.
- [ ] T063 [P] [US3] Create `mobile/lib/core/widgets/shoot_image.dart`.
  - `ShootImage(image, {width, height, fit, sceneIndex})` uses `LayoutBuilder` for the rendered
    width, `ImageRef.pick(width × dpr)` and `Image.network` with `cacheWidth`.
  - `frameBuilder` and `errorBuilder` show `SceneTile(index: sceneIndex)`.
  - `Semantics(label: alt)`, excluded when alt is empty.

  T056 passes.
- [ ] T064 [US3] Run `pnpm --filter @shoot/domain api:snapshot` and commit the snapshot. Add the US3
  examples to `mobile/test/api_examples_test.dart`.

**Checkpoint**: MR-US3-S1 to S6 pass; the creator reads are in the contract.

---

## Phase 6: User Story 4 — Guides, editor pages and legal documents (P2)

**Goal**: `GET guides`, `guides/{slug}`, `pages/{slug}`, `legal/{kind}`, `legal/{kind}/versions`
and `legal/{kind}/versions/{version}`.

**Independent test**: `pnpm --filter web test -- mobile-api-content` passes, and so does
`flutter test test/features/content`.

### Tests first

- [x] T065 [P] [US4] Write `v1/content.test.ts`. The schemas accept their examples;
  `legalKindV1` refuses `cookies`; `params.version` refuses `0` and `10000`.
- [x] T066 [P] [US4] Write the mapper tests:
  - `web/modules/guides/wire.test.ts`: the cover goes through `toWireImage`, the body through
    `toWireRichText`, and `inRequestedLanguage` comes from the query;
  - `web/modules/legal/wire.test.ts`;
  - extend `web/modules/pages/wire.test.ts` for `toWirePage`.
- [x] T067 [P] [US4] Write `wtest/integration/mobile-api-content.int.test.ts` with the pages and
  guides fixtures (`wtest/integration/setup/pages.ts`).
  - **`MR-US4-S1`**:
    - `GET guides` lists newest first with pagination;
    - `?category=` and `?author=` narrow the list and fill `category` and `author`;
    - an unknown category gives 404;
    - an article scheduled one hour after the injected clock is absent, then present when the
      clock passes it (the wrapper's `now`).
  - **`MR-US4-S2`**: `GET guides/{slug}` returns `body.nodes` with a heading, a list, a quote and
    an image node; a site link is a path without `/ar`; the seeded `javascript:` link is plain
    text.
  - **`MR-US4-S3`**: an untranslated article in Arabic returns English text with
    `inRequestedLanguage: false`.
  - **`MR-US4-S4`**:
    - `GET pages/{slug}` works by the English and by the Arabic slug;
    - a draft-only page gives 404;
    - an earlier slug answers with the current `path`.
  - **`MR-US4-S5`**: terms with versions 1 and 2:
    - `legal/terms` returns version 2;
    - `legal/terms/versions` lists both with dates and change summaries;
    - `legal/terms/versions/1` returns version 1;
    - `versions/3` gives 404.
- [x] T068 [P] [US4] Write the Dart content tests.
  - `mobile/test/core/content/rich_text_model_test.dart` (**`MR-US4-S2`**): the `guide.json` body
    decodes into every block and inline kind, and an unknown kind gives `Unknown*`.
  - `mobile/test/features/content/data/models/content_models_test.dart`.
  - `mobile/test/features/content/data/repositories/content_repository_impl_test.dart`
    (**`MR-US4-S5`**): each read passes its params and maps failures as in US1.

### Implementation

- [x] T069 [US4] Create `v1/content.ts` per data-model.md. Register `guides`, `guide`, `page`,
  `legal`, `legalVersions` and `legalVersion`.
- [x] T070 [P] [US4] Write the examples `guides.json`, `guide.json` ("How to brief a wedding
  photographer", with every node kind), `page.json` ("How it works"), `legal.json`,
  `legal-versions.json` and `legal-version.json`. T065 passes.
- [x] T071 [P] [US4] In `web/modules/guides/`:
  - `wire.ts`;
  - `api.ts` (`getGuidesV1` over `listArticles`, `listCategories` and `getAuthor`; `getGuideV1`
    over `getArticle` with `now: ctx.now()`, never `draft`);
  - export from `index.ts`.
- [x] T072 [P] [US4] In `web/modules/legal/`:
  - `wire.ts`;
  - `api.ts` (`getLegalV1`, `getLegalVersionsV1`, `getLegalVersionV1`);
  - export from `index.ts`.
- [x] T073 [US4] In `web/modules/pages/`, add `toWirePage` and `getPageV1` (over
  `getPageBySlug(kind: 'standard')`, never `draft`, with a redirect giving the current `path`).
  Export it from `index.ts`.
- [x] T074 [US4] Create the route files `guides/route.ts`, `guides/[slug]/route.ts`,
  `pages/[slug]/route.ts`, `legal/[kind]/route.ts`, `legal/[kind]/versions/route.ts` and
  `legal/[kind]/versions/[version]/route.ts`. T066 and T067 pass.
- [x] T075 [US4] Create `mobile/lib/features/content/` (entities, `ContentRepository`, models,
  datasource, repository impl) and `content_injection.dart`. T068 passes.
- [x] T076 [US4] Run `api:snapshot` and commit. Add the US4 examples to `api_examples_test.dart`.
  - Done notes: the US4 rows are in `test/helpers/api_decoders.dart` (the table `api_examples_test.dart`
    reads). `Pagination`/`PaginationModel` is new in `mobile/lib/core/content/pagination.dart` for US3 to
    reuse. `ArticleSummary` in `web/modules/guides/queries.ts` gained `coverMedia` (every stored size) and
    `readingMinutes`; `AuthorEntry` gained `photoMedia`. `articleSummaryV1.author` is nullable (the
    relationship is required in the CMS, but an unreadable author must not fail the list). The scheduled
    case fakes only `Date` (`vi.useFakeTimers({ toFake: ['Date'] })`), which is what `ctx.now()` reads.

**Checkpoint**: MR-US4-S1 to S5 pass.

---

## Phase 7: User Story 5 — A shared link opens the right place in the app (P2)

**Goal**: `GET resolve`, the two `.well-known` files, the `proxy.ts` exclusion and the app's iOS
and Android link configuration.

**Independent test**: `pnpm --filter web test -- mobile-api-resolve mobile-api-app-links` passes,
and so does `flutter test test/core/routing/app_links_config_test.dart test/features/links`.

### Tests first

- [ ] T077 [P] [US5] Write `v1/resolve.test.ts`.
  - **`MR-US5-S1`**: `classifyPath` returns the kind and params for each pattern in research R12,
    with and without `/ar`.
  - **`MR-US5-S4`**: `/match/B-7K4Q2/abc`, `/q/…`, `/account` and `/account/bookings/x` are
    `private`.
  - `resolveRequestV1` refuses `https://x`, `//x`, `/a/../b`, `/a?b`, `/a#b` and 513 characters.
- [ ] T078 [P] [US5] Write `v1/app-links.test.ts`.
  - **`MR-US5-S5`**: `appleAssociation` and `androidAssetLinks` produce the documents in
    data-model.md for one and for two app ids or fingerprints.
  - **`MR-US5-S6`**: `APP_LINK_PREFIXES` equals the `prefixes` in `v1/examples/app-links.json`;
    with `UPDATE_API_SNAPSHOT=1` the test rewrites that file.
- [ ] T079 [P] [US5] Write the web unit tests.
  - Extend `web/proxy.test.ts` (**`MR-US5-S5`**): the matcher does not match
    `/.well-known/apple-app-site-association` or `/.well-known/assetlinks.json`.
  - Write `web/modules/pages/resolve-routes.test.ts`: every `page.tsx` under
    `web/app/(site)/[locale]/` maps to a `classifyPath` pattern, except the listed non-app routes
    (`guides/feed`).
- [ ] T080 [P] [US5] Write the resolve and app-link integration tests.
  - `wtest/integration/mobile-api-resolve.int.test.ts`:
    - **`MR-US5-S1`**: an editor page, a guide, a creator, a specialty, a hire page and
      `/terms/versions/1` each give `page` with the right kind, the current path and the locale;
      `/ar/<slug>` gives locale `ar`.
    - **`MR-US5-S2`**: a renamed page's earlier slug, and the English slug asked in Arabic, give
      `page` with the current path.
    - **`MR-US5-S3`**: a path recorded in `removed-paths` gives `removed`, and `/never-was` gives
      `notFound`. Both are 200, public.
    - **`MR-US5-S4`**: `/q/<ref>/<key>` for a reference that does not exist gives
      `page/private`; a spy on the booking queries records no call.
  - `wtest/integration/mobile-api-app-links.int.test.ts` (**`MR-US5-S5`**):
    - with the env set, both files are 200 `application/json` with the expected bodies and
      `Cache-Control: public, max-age=3600`;
    - unset, both are 404;
    - the Apple file has no redirect and no locale.
- [ ] T081 [P] [US5] Write the Dart links tests.
  - `mobile/test/features/links/data/repositories/links_repository_impl_test.dart`
    (**`MR-US5-S3`**): `resolve-page`, `resolve-removed` and `resolve-not-found` decode to
    `ResolvedPage`, `RemovedPage` and `NoPage`; an unknown `kind` gives `PlaceKind.unknown`;
    failures map as in US1.
  - `mobile/test/core/routing/app_links_config_test.dart` (**`MR-US5-S6`**):
    - parse `mobile/android/app/src/main/AndroidManifest.xml`: one `autoVerify="true"` filter for
      `https` and `${appLinkHost}`, whose `pathPrefix` set plus `path="/"` equals `app-links.json`
      `prefixes`;
    - parse `mobile/ios/Runner/Runner.entitlements`: `applinks:$(APP_LINK_HOST)`.

### Implementation

- [ ] T082 [US5] Create `v1/resolve.ts` (`resolveRequestV1`, `placeKindV1`, `resolveV1`,
  `classifyPath`) and register `resolve`. Write `resolve-page.json` and `.ar.json`,
  `resolve-removed.json` and `resolve-not-found.json`. T077 passes.
- [ ] T083 [US5] Implement resolve in `web/modules/pages/`.
  - `resolve.ts`: `resolvePath(path, locale, now)`, with the existence check per kind from research
    R12 and `isRemovedPath`. Private kinds are never looked up.
  - `resolvePathV1` in `api.ts`, exported from `index.ts`.
  - The route file `web/app/(payload)/api/mobile/v1/resolve/route.ts`.

  T079 (drift) and T080 (resolve) pass.
- [ ] T084 [P] [US5] Create `v1/app-links.ts` (`APP_LINK_PREFIXES`, `appleAssociation`,
  `androidAssetLinks`) and generate `v1/examples/app-links.json`. T078 passes.
- [ ] T085 [US5] Serve the association files.
  - Create `web/modules/app-links/api.ts` (`appleAssociationFile`, `assetLinksFile`: env from
    T002, 404 when unset, `application/json`, `public, max-age=3600`) and `index.ts`.
  - Create `web/app/.well-known/apple-app-site-association/route.ts` and
    `web/app/.well-known/assetlinks.json/route.ts` as one-line re-exports.
  - Add `\\.well-known` to the matcher's negative lookahead in `web/proxy.ts`.

  T079 (proxy) and T080 (app links) pass.
- [ ] T086 [US5] Create `mobile/lib/features/links/` (`Resolution`, `PlaceKind`,
  `LinksRepository.resolve(path)`, models, datasource, repository impl) and `links_injection.dart`.
- [ ] T087 [US5] Configure the app's link handling.
  - iOS: create `mobile/ios/Runner/Runner.entitlements` with
    `com.apple.developer.associated-domains = [applinks:$(APP_LINK_HOST)]`, reference it from the
    Runner target's `CODE_SIGN_ENTITLEMENTS`, and set `APP_LINK_HOST` in
    `mobile/ios/Flutter/Debug.xcconfig` and `Release.xcconfig` (staging and production hosts).
  - Android: add the `autoVerify` intent filter to `AndroidManifest.xml`, with one `pathPrefix`
    per `APP_LINK_PREFIXES` entry plus `path="/"`, and set
    `manifestPlaceholders["appLinkHost"]` in `mobile/android/app/build.gradle.kts`.
  - Note in `mobile/README.md` how to set the host per environment.

  T081 passes.
- [ ] T088 [US5] Run `api:snapshot` and commit. Add the US5 examples to `api_examples_test.dart`.

**Checkpoint**: MR-US5-S1 to S6 pass. Links on staging open the app, which still shows screen 37
until 010–015 build the screens.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T089 [P] Write `wtest/e2e/mr-smoke.spec.ts` (**`MR-SC-001`**, desktop project only). Against
  the built app with the seed:
  - `GET site`, `creators`, `resolve?path=/ar/does-not-exist` and both `.well-known` files (with
    the env set in the e2e config) each parse with their schema;
  - `Cache-Control` and `Content-Language` are as specified.
- [ ] T090 [P] Update `mobile/README.md`:
  - Architecture gains `core/install`, `core/media`, `core/content` and `api_get`;
  - the call-flow example also names the five new feature data layers;
  - "Errors" gains problem codes and `NotFoundFailure`;
  - "Not done yet" gains "screens for these reads: 010–015".
- [ ] T091 [P] Align the runtime guidance with the decisions in research R3, R6 and R16:
  - `.claude/skills/mobile-api-contract/SKILL.md`: the problem field is `fields`; 008's reads are
    `auth: none`; integration tests are `tests/integration/mobile-api-*.int.test.ts`; the handler
    spreads the registry entry;
  - `.claude/skills/mobile-api-contract/references/endpoints.md`: the 008 rows, including
    `landing`, the creators reads, the content reads and `legal/{kind}`, now in 008 rather than
    010, 011 and 015;
  - `.claude/skills/flutter-mobile/SKILL.md`: `ShootImage` and the install id are done.
- [ ] T092 [P] Update `specs/ROADMAP.md` row 008 to *implemented*, and add a 008 line to
  `CLAUDE.md`'s feature summary (modules, `apps/web/src/shared/api/`, `packages/domain/src/api/v1/`,
  test-id prefix `MR-`).
- [ ] T095 [P] Review against the `persona-extensibility` skill (**FR-015**): no schema in `v1/`,
  no `toWire*` mapper, no example key and no Dart model, entity or ARB string added by this feature
  names a profession; persona and category names reach the app only as CMS data. Add a case to
  `web/modules/personas/wire.test.ts` with a renamed persona (the new name comes through unchanged).
- [ ] T093 Run the full quickstart:
  - the automated checks;
  - `pnpm check:scenarios`;
  - manual checks 1–6, including Apple's and Google's validators on staging (SC-007) and the size
    check (SC-006).

  Tick SC-001 to SC-008.

---

## Dependencies & Execution Order

- **Setup** (T001–T005): no dependencies; T002–T005 run in parallel.
- **Foundational** (T006–T027, T094): after Setup. It blocks every story.
  - The web part (T006–T022, T094) and the app part (T023–T027) can run in parallel.
  - T094 comes before T020 (the wrapper reads `retryAfter`).
- **US1** (T028–T042): after Foundational. It is the MVP: the first endpoints, end to end.
- **US2** (T043–T051): after US1, because the first snapshot needs registered endpoints.
  - The compatibility work (T043, T049) can start alongside US1.
- **US3** (T052–T064): after Foundational.
  - `toWireHirePage` (T060) needs `toWireSection` from US1 (T037).
  - The snapshot step (T064) needs US2 (T050).
  - `ShootImage` (T063) needs 007's `SceneTile`.
- **US4** (T065–T076): after Foundational; `toWirePage` needs T037. The snapshot step needs T050.
  It can run alongside US3.
- **US5** (T077–T088): after Foundational. The resolver (T083) uses the queries of US3 and US4
  modules, which already exist, so it does not wait on their handlers. The snapshot step needs
  T050.
- **Polish** (T089–T093, T095): last. T095 runs before T093.

## Parallel examples

- **Foundational**: T006, T007, T008, T009, T010, T011 and T012 together (tests). Then T014–T017
  together, and T023 alongside the web part.
- **US1**: T028, T029, T030 and T031 together. Then T033, T034, T035, T036 and T038 together.
- **US3 and US4**: run as two streams after US2. Within each, the tests (T052–T056, T065–T068)
  run together.
- **US5**: T077–T081 together. Then T084 alongside T082.

## Implementation strategy

1. **MVP**: Setup, then Foundational, then US1. The app reads the site basics in both languages
   through a wrapper that is already proven.
2. US2 locks the contract. From here, every change runs through the snapshot check.
3. US3 and US4 add the creator and content reads, each closing with `api:snapshot`.
4. US5 makes links open the app.
5. Features 009–015 then add endpoints the same way: register them in `v1/endpoints.ts`, write an
   example, add `api.ts` and a one-line route, run `api:snapshot`, and add a Dart model with a row
   in `api_examples_test.dart`. Writes follow research R15.

## Requirement coverage

Every functional requirement and success criterion of spec.md, and the tasks that build or prove
it. T094 and T095 were added by the consistency analysis and keep their numbers out of order, so
that no existing id changes.

| Requirement | Tasks |
|---|---|
| FR-001 versioned prefix, v1 kept working | T009, T018, T022, T043, T049, T050 |
| FR-002 declared access per endpoint | T009, T013, T018, T020, T047 |
| FR-003 validated input, one code per field, unknown query ignored | T011, T013, T019, T020, T052 |
| FR-004 token from the header only, never the cookie | T013, T020 |
| FR-005 requested language, English fallback, `Content-Language` | T010, T013, T019, T030, T047 |
| FR-006 problem documents without detail or PII | T007, T011, T013, T015, T019, T020, T023, T026 |
| FR-007 every code listed once, words in both languages on both sides | T003, T015, T046, T048, T051 |
| FR-008 cache classes, private when signed in, failures not stored | T013, T020, T030, T089 |
| FR-009 install id counts limits, never logged with PII | T010, T013, T019, T020, T023, T094 |
| FR-010 unknown API addresses answer a 404 problem | T022, T047 |
| FR-011 mappers and a public field list | T029, T044, T053, T059, T066, T071, T072, T073 |
| FR-012 absolute image URLs with a size list | T006, T012, T021 |
| FR-013 rich text as a fixed node tree, safe links | T008, T016, T017, T021 |
| FR-014 site paths without the language prefix | T006, T008, T012, T021 |
| FR-015 professions only from the CMS, none named in shapes or app code | T029, T030, T095 |
| FR-020 site settings | T028, T029, T030, T032, T033, T034, T039 |
| FR-021 navigation | T029, T030, T038, T039 |
| FR-022 professional types | T029, T030, T035, T039 |
| FR-023 brief builder | T028, T030, T036, T039 |
| FR-024 landing | T028, T029, T030, T037, T039, T040 |
| FR-025 creators directory | T052, T053, T054, T057, T059, T061, T062 |
| FR-026 creator profile by any spelling of the code | T054, T055, T057, T059, T061, T062 |
| FR-027 specialty and hire pages | T053, T054, T057, T059, T060, T061 |
| FR-028 guides, editor pages, legal documents | T065, T066, T067, T069, T070, T071, T072, T073, T074, T075 |
| FR-029 resolver | T077, T079, T080, T082, T083, T086 |
| FR-030 schemas in the domain package with its coverage gate | T006–T009, T014, T015, T028, T032, T052, T057, T065, T069, T077, T082, T093 |
| FR-031 shared examples read by server, model tests and goldens | T005, T033, T045, T048, T058, T070, T082 |
| FR-032 committed snapshot, additive-only check | T043, T044, T049, T050, T064, T076, T088 |
| FR-033 deprecation marked and announced | T009, T013, T018, T020, T044 |
| FR-040 association files | T002, T078, T079, T080, T084, T085 |
| FR-041 the app's iOS and Android link configuration | T081, T087 |
| FR-050 repositories per feature, hand-written models | T026, T027, T031, T041, T042, T055, T062, T068, T075, T081, T086 |
| FR-051 install id and language on every request | T023, T024, T025 |
| FR-052 one image component with the scene-tile fallback | T023, T027, T056, T063 |
| FR-053 one failure-to-message mapping | T048, T051 |
| SC-001 every endpoint valid in English and Arabic | T030, T047, T054, T067, T080, T089 |
| SC-002 CMS changes reach the app within 60 s | T030, T093 (manual check 1) |
| SC-003 no non-additive change passes | T043, T044, T049 |
| SC-004 examples valid on both sides; codes have words on both sides | T045, T046, T048 |
| SC-005 no internal field or stack in any answer | T013, T029, T030, T044, T053 |
| SC-006 first directory page ≤ 100 KB compressed | T054, T093 (manual check 6) |
| SC-007 links open the app; validators accept the files | T085, T087, T093 (manual check 4, staging) |
| SC-008 every scenario has a test named with its id | T004, T093 |

Task count: 95 (T001–T095).
