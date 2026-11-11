# Research: Mobile API

Decisions for feature 008. Each entry gives the **Decision**, then the **Rationale**, then the
**Alternatives** considered. Paths are relative to the repository root; `web/` means `apps/web/src/`,
`domain/` means `packages/domain/src/`, `mobile/` means `apps/mobile/`.

## R1. Where the routes live and how they coexist with Payload

- **Decision**:
  - Every endpoint is a Next route handler at
    `web/app/(payload)/api/mobile/v1/<path>/route.ts`. The file is one line, a re-export from the
    owning module's public surface:
    `export { getCreatorProfileV1 as GET } from '@/modules/creators'`.
  - The handler itself lives in `web/modules/<module>/api.ts` and is exported through the module's
    `index.ts`. Modules without an `index.ts` today (`site-settings`, `personas`, `brief`) get one
    that exports only their API handlers (their other importers are left as they are).
  - Next resolves static segments before dynamic ones, so `api/mobile/v1/…` wins over Payload's
    `api/[...slug]` catch-all. A second catch-all, `api/mobile/[...rest]/route.ts`, answers every
    unmatched address under `/api/mobile` (including `/api/mobile/v2/…`) with a 404 problem
    (FR-010), so Payload's own 404 never reaches the app.
  - No Payload collection or global may use the slug `mobile`; a schema integration test asserts it.
  - Route files carry no segment config. A GET handler that reads `request.headers` is dynamic in
    Next 16 by default; caching happens in the cached queries (`cachedQuery`) and in shared caches
    through `Cache-Control` (R7). Next answers unsupported methods with 405 and implements `OPTIONS`.
- **Rationale**: one deployable (Principle V); the route tree stays a thin index; modules keep
  their internals private (CLAUDE.md "Cross-module imports only via the module's `index.ts`").
- **Alternatives**:
  - A Payload custom endpoint (`config.endpoints`): it lives under Payload's REST router with
    Payload's error format and its cookie auth; no per-route file to find.
  - A separate API app: a second deployable, rejected by Principle V.
  - Handler bodies inside the route files: they would import module internals and be untestable
    without the file-system route.

## R2. `defineHandler`: the one way to write a handler

- **Decision**: `web/shared/api/handler.ts` exports
  `defineHandler({ auth, input, output, cache, rateLimit?, run })`, which returns a
  `(request: Request, context: { params: Promise<Record<string, string | string[]>> }) => Promise<Response>`.
  - `auth`: `'none' | 'optional' | 'required'` (R3).
  - `input`: one zod object with optional keys `params`, `query` and `body`. The wrapper builds
    `{ params, query, body }` from the path params, `URLSearchParams` (a repeated key becomes an
    array) and the JSON body (non-GET only), and parses it. Field paths in problems read
    `query.page`, `params.code`.
  - `output`: the zod schema of the success answer; `cache`: `'public' | 'no-store'`.
  - `run(ctx, input)` returns the answer value or a `Problem` (from `problem(status, code, extra)`);
    it may also throw `ApiProblem`.
  - In order, the wrapper: resolves the user (R3), negotiates the locale (R4), reads the install id
    (R5), parses input (R6), applies the rate limit if declared (R5), runs, checks the answer against
    `output` (development and test only), serialises JSON, and sets the headers (R7). Anything
    thrown that is not an `ApiProblem` becomes a 500 problem (R6).
  - Endpoint definitions live in the domain package (R11), so a handler spreads its definition:
    `defineHandler({ ...v1.endpoints.creatorProfile, run })`. Auth, cache, input and output then
    cannot drift from the contract.
  - The wrapper never calls `headers()` or `cookies()` from `next/headers`; it reads the `Request`
    only. That is what lets integration tests call a route handler with `new Request(...)`.
- **Rationale**: one place enforces access, validation, language, errors and cache headers, so no
  handler can forget one (Principles VII and III). The owner's signature
  (`{ auth, input: zod, run }`) is kept and extended only by what the contract needs.
- **Alternatives**:
  - Separate `params`/`query`/`body` options: three schemas per endpoint in the snapshot, and
    field paths lose their source.
  - Validating the answer in production too: a mismatch would turn a correct-enough answer into a
    500 for every installed app; types plus the integration tests (which `parse` every answer) cover
    it.
  - A framework (tRPC, ts-rest, Hono): a new package, a second router, and its own error format.

## R3. Who is calling: `none`, `optional`, `required`, and the Bearer token

- **Decision**:
  - `none`: the `Authorization` header is ignored and no user is resolved. Every endpoint of 008 is
    `none` (their content does not depend on the user), so their answers stay shareable.
  - `optional` and `required`: the wrapper calls
    `payload.auth({ headers: new Headers({ authorization }) })` with **only** the `Authorization`
    header copied from the request. Payload 3.93's default `jwtOrder` (`JWT`, `Bearer`, `cookie`)
    accepts `Authorization: Bearer <JWT>`, and the same call is what `modules/auth/session.ts` makes
    for the cookie. Copying only that header means a website cookie never authenticates an API call
    (FR-004), which also keeps later write endpoints free of cross-site request forgery.
  - No header: `optional` runs with `user = null`; `required` answers 401 `api.errors.unauthorized`.
  - A header that does not verify (bad signature, expired, session removed): 401
    `api.errors.tokenInvalid` on both `optional` and `required`. 009's app refreshes ahead of
    expiry (009 research R14), so it treats either 401 as signed out.
  - A resolved user that is not in `users` (an admin-only collection, should one exist): treated as
    no user.
  - Tests get a real token from `payload.login({ collection: 'users', data })` against the test
    database; the wrapper's own integration test declares test-only `optional` and `required`
    handlers, because 008 has no signed-in endpoint.
- **Rationale**: Principle VII (default deny; Payload's built-in auth). A token is Payload's own JWT,
  so 009 only adds the endpoints that issue it.
- **Alternatives**:
  - Passing the whole request headers to `payload.auth`: cookie sign-in would work on the API.
  - Ignoring an invalid token on `optional` endpoints: the app could not tell an expired session
    from a visitor and would never refresh.
  - Declaring 008's reads `optional` (as the skill's inventory suggests): every signed-in app user
    would bypass shared caches for content that does not change per user. Moving `none` to
    `optional` later is a breaking change under R11 (`auth` may only loosen), so it would need v2 or
    a new endpoint.

## R4. Language

- **Decision**:
  - Order: `?locale=` (validated as `en | ar`; anything else is a 422 with field code
    `api.errors.localeUnsupported`), then `Accept-Language` parsed with q-weights (first supported
    language by weight, primary subtag only, so `ar-AE` is `ar`), then `en`. Pure function
    `negotiateLocale(query, header)` in `web/shared/api/negotiate.ts`.
  - The locale is passed to every query; the queries already read with `fallbackLocale: 'en'`, so an
    untranslated field comes back in English (FR-005).
  - Answers carry `Content-Language` and `Vary: Accept-Language`. The app sends exactly `en` or `ar`
    (its `LanguageInterceptor`), which keeps the cache key small.
  - Where the queries know whether text is native to the requested language (guides'
    `hasNativeText`, legal `pick().native`), the shape carries `inRequestedLanguage: boolean`, so the
    app can show the same "only in English" note as the website.
  - `/ar` in a resolver `path` sets the locale for that answer (R12).
- **Rationale**: the same fallback the website uses; one function to test.
- **Alternatives**: a locale path segment (`/v1/ar/creators`): every endpoint doubles, and the app
  already sends the header.

## R5. The install id, rate limits and duplicate checks

- **Decision**:
  - The app sends `X-Shoot-Install: <id>` on every request. The id is 32 lower-case hex characters
    (128 random bits from `Random.secure()` in Dart), created on first launch and kept in 006's
    `PreferencesStore` under `install.id`. It is not a secret and not an identity.
  - The wrapper accepts `^[0-9a-f]{32}$`; anything else is ignored (never an error, FR-009).
  - `ctx.visitorKey` is `install:<id>` when valid, else the first `x-forwarded-for` address, else
    `x-real-ip`, else `anonymous` (the same chain as `shared/payload/rate-limit.ts` `visitorKey`).
  - Declared limits: `rateLimit: { action, limit, code }`, where `limit` is a number or a function of
    the site settings. The wrapper builds a Payload request with `createLocalReq({ context:
    { visitorId: ctx.visitorKey } }, payload)` and calls the existing `consumeAllowance(req,
    `${action}:${visitorKey}`, limit, code)`; its 429 `APIError` becomes a 429 problem with the
    message key as `code`, `retryAfter` and a `Retry-After` header. Today's `consumeAllowance`
    throws a 429 without the wait, so 008 adds `data: { retryAfter }` (seconds to the end of the
    window) to its `APIError` (task T094; existing callers ignore it). The counters live in the
    `rate-limits` collection, so the limit holds across instances (Principle V).
  - Commands in 011–014 receive the same `visitorKey` through `ActorContext` (R15) and put it in
    `req.context.visitorId`, which is what the brief hook already reads for the `sp_vid` cookie, so
    duplicate detection works unchanged.
  - No 008 endpoint is rate limited (reads are cached); the option is proven with a test-only handler
    (MR-US2-S8).
  - The id is never logged with personal data, and the wrapper logs no request headers at all.
- **Rationale**: the owner's scope (the install id stands in for `sp_vid`); fairness for many phones
  behind one carrier address.
- **Alternatives**:
  - The network address only: carrier-grade NAT puts many phones on one address.
  - A device identifier (IDFV, Android ID): a platform channel, and closer to personal data.
  - A UUID package in Dart: 16 random bytes in hex need no package.

## R6. Errors: `application/problem+json`

- **Decision**:
  - Shape (`domain/api/v1/problems.ts`, `problemV1`):
    `{ type: 'about:blank', status, code, fields?: [{ path, code }], retryAfter? }`. No `title`, no
    `detail`: the client owns the words in the person's language. The owner's field name `fields` is
    used (the `mobile-api-contract` skill's draft says `errors`; it is aligned in the polish phase).
  - Codes are message keys, listed once in `PROBLEM_CODES` and added to `apps/web/messages/{en,ar}.json`
    under `api.errors`:

    | Code | Status | When |
    |---|---|---|
    | `api.errors.invalidInput` | 422 | input failed its schema (with `fields`) |
    | `api.errors.invalidField` | (field) | a field failed and its schema gives no own key |
    | `api.errors.localeUnsupported` | (field) | `?locale=` is not `en` or `ar` |
    | `api.errors.notFound` | 404 | the thing does not exist or is not public; unknown address |
    | `api.errors.unauthorized` | 401 | `required` without a token |
    | `api.errors.tokenInvalid` | 401 | a token that does not verify |
    | `api.errors.rateLimited` | 429 | default code of a declared limit |
    | `api.errors.unexpected` | 500 | anything else |

    A field code is the zod issue's `message` when it already is a message key
    (`/^[a-z][a-zA-Z]*(\.[a-zA-Z-]+)+$/`, the convention the domain schemas follow, for example
    `contact.errors.whatsappFormat`), else `api.errors.invalidField`. Field keys that come from
    domain schemas are already in the web message files; a test checks every code that can appear.
  - 404 for "not public" and "does not exist" alike: a draft or a suspended creator is never
    revealed (as on the website).
  - Unknown errors: 500 `api.errors.unexpected`, logged with `payload.logger.error({ route, requestId,
    errorName, status })`; the stack only outside production; never headers, query, body or user.
    The answer carries `X-Request-Id` (taken from the request when it matches `^[\w-]{8,64}$`, else
    generated), so a report can be matched to a log line.
  - Problems are `Cache-Control: no-store`.
- **Rationale**: FR-006, FR-007, Principle VII; one decoding path in the app.
- **Alternatives**: Payload's `{ errors: [{ message }] }`: English text, not codes.

## R7. Cache headers and freshness

- **Decision**:

  | Answer | `Cache-Control` | Also |
  |---|---|---|
  | `cache: 'public'`, no user resolved | `public, s-maxage=60` | `Vary: Accept-Language` |
  | any answer when a user was resolved | `private, no-store` | |
  | `cache: 'no-store'` | `no-store` | |
  | problems | `no-store` | |

  - No `max-age` (the app does not cache by HTTP), and no `stale-while-revalidate`: a shared cache
    could otherwise serve content older than 60 seconds, breaking Principle IV's "visible within 60
    seconds".
  - Freshness on the server comes from the existing `cachedQuery` tags, revalidated by the Payload
    hooks on publish; the 60 seconds bound only the shared cache.
  - The resolver's removed-path check (`isRemovedPath`) is not cached by its query; the shared cache
    bounds it at 60 seconds like every public answer.
- **Rationale**: FR-008 and SC-002.
- **Alternatives**: ETags and 304s: useful later for large lists, not needed for 60-second
  answers; can be added without a contract change.

## R8. Public shapes and the `toWire*` mappers

- **Decision**:
  - Each module that answers gets `web/modules/<module>/wire.ts` with `toWire<Thing>(internal, ctx)`
    functions returning the inferred output type of the domain schema. `ctx` carries the locale and
    the absolute media base (R9). Shared helpers (`toWireImage`, `toWireRichText`, `toWireLink`) are
    in `web/shared/api/wire.ts`.
  - Mappers whitelist: they build new objects field by field; they never spread a Payload document.
    A unit test per mapper feeds a document containing internal fields (`accessSalt`, `matchValues`,
    `briefLimitPerHour`, `quickMatch.templates`, `translationStatus`, `autoPublishEdits`,
    `uploadedBy`, `publishedBy`, `previousSlugs`) and asserts none survives (SC-005). The snapshot
    test also fails if any of those names appears as a property anywhere in the v1 schema.
  - Conventions: ids are strings; dates are ISO 8601 UTC strings; site paths carry no language prefix
    (FR-014); optional values are `null`, never absent (simpler decoding in Dart); lists are never
    `null` (empty instead); choices are string enums that clients decode with an `unknown` fallback.
  - Section blocks (`landingBlocks`, shared by the landing global and `pages`) map to one
    discriminated union `sectionV1` on `type`: `howItWorks`, `features`, `categoriesGrid`,
    `personaBand`, `faq`, `logoCloud`, `richText`, `callToAction`, `creatorNetwork`. The mapper resolves
    what the website's `getBlockContext` resolves (specialty tiles with counts, the network's
    creators), so the app never makes a second call to fill a section. A block type the mapper does
    not know is skipped and logged once; a new type is an additive enum value.
  - The persona and specialty `glyph` and the specialty `scene` are CMS choices sent as strings; the
    app maps them to its icon set and scene variants, with a default for an unknown value.
- **Rationale**: FR-011, Principle VII; the shapes stay stable while Payload documents evolve.
- **Alternatives**: sending `payload.find` results with `select`: internal names, Payload's
  relationship shapes and every future field would become contract by accident.

## R9. Images

- **Decision**:
  - `imageV1 = { alt: string, width, height, sizes: [{ url, width, height }] }`: `width` and `height`
    are the original's; `sizes` holds every stored size (`thumbnail` 400, `card` 800, `hero` 1600,
    from the `media` collection) plus the original, sorted by width ascending, duplicates by width
    removed. Size names are not sent.
  - Addresses are absolute: a relative `url` (`/api/media/file/…`, local disk in development) is
    prefixed with `NEXT_PUBLIC_SITE_URL`; an S3 address is already absolute.
  - A dark variant is a separate field where the CMS has one (`logoDark`, `logoCloud.imageDark`).
  - An image with no usable file maps to `null`; an image without stored sizes has the original only.
  - In the app, `ShootImage(image, width?)` picks the smallest size with
    `size.width >= renderedWidth × devicePixelRatio`, else the largest; decodes with
    `cacheWidth`; shows `SceneTile` (007) while loading, on error and for `null` (FR-052). It uses
    `Image.network`; no image-cache package (flutter-mobile skill package policy).
- **Rationale**: FR-012; the app chooses per device instead of the server guessing.
- **Alternatives**: a `srcset`-like string: needs parsing; sending only one size: wastes data on
  small phones or blurs on tablets.

## R10. Rich text as a reduced node tree

- **Decision**:
  - Pure function `reduceRichText(lexical, { image })` in `domain/api/v1/richtext.ts` turns a Lexical
    editor state into `richTextV1 = { nodes: blockV1[] }`:
    - blocks: `paragraph { children }`, `heading { level: 2 | 3 | 4, children }` (h1 and h5–h6 clamp
      to 2 and 4), `list { ordered, items: blockV1[][] }`, `quote { children }`,
      `image { image }`;
    - inlines: `text { text, bold, italic, underline, code }` (from the Lexical format bit field),
      `link { href, children }`, `lineBreak`.
  - Links use one rule, moved from `web/shared/ui/RichContent.tsx` `safeHref` into
    `domain/content/links.ts` `linkTarget(url)`: a site path (`/…`, not `//`) stays a path without
    language prefix; `http(s):`, `mailto:` and `tel:` stay; anything else (`javascript:`) makes the
    link's text plain. `RichContent` then calls `linkTarget`, so the website and the API share it.
  - Uploads become `image` nodes through the `image` callback (the web passes `toWireImage`).
  - Unknown nodes: their text children are kept as a paragraph (block level) or as text (inline);
    empty paragraphs are dropped; depth is capped at 8 (deeper content is flattened to text).
  - The node set matches 007's `RichContent` widget (paragraph, heading, list, link, quote), plus
    `image` and the emphasis flags, which the widget gains in 015.
- **Rationale**: FR-013, Principle VII ("no raw HTML from the CMS"); Lexical's own JSON is large,
  versioned by Lexical and full of editor state the app does not need.
- **Alternatives**: HTML strings (the app would need an HTML renderer and sanitiser); Lexical JSON as
  it is (couples every app to the editor's internal format).

## R11. The contract: schemas, endpoint registry, examples, snapshot

- **Decision**:
  - **Schemas**: `domain/api/v1/{common,problems,site,landing,creators,content,resolve,app-links}.ts`,
    zod 4.6.7, exported from `@shoot/domain/api/v1`. Recursive shapes (rich text, lists) use zod 4
    getters so `z.toJSONSchema` emits `$defs`.
  - **Endpoint registry**: `domain/api/v1/endpoints.ts` defines each endpoint with
    `defineEndpoint({ id, method, path, auth, cache, input, output, examples })` and exports
    `endpoints` (a typed record) and `ENDPOINTS` (a list). The registry is the source of the access
    table in [contracts/mobile-api.md](contracts/mobile-api.md); a test checks the table matches it.
    The web handler spreads its definition (R2); an integration test walks `ENDPOINTS`, imports the
    route file at the registered path and checks it exists and answers anonymously as declared.
  - **Examples**: `domain/api/v1/examples/<id>.json` (English) and `<id>.ar.json` (Arabic, where an app
    screen shows it in Arabic), with the endpoint id in kebab case (`creator-profile.json`). They reuse the canvas placeholder data (creators "Omar K.", "Mariam
    A.", "Yusuf R.", their places, specialties and languages; the board's visible code "SH-0087").
    "AED 950" and "Sat 14 Dec" belong to the price and booking shapes of 011 and 012 and enter with
    them. The Arabic text is the boards' written Arabic (`specs/design-system/canvas/strings.ar/`,
    007 R6), not machine translation. Every file is claimed by exactly one endpoint or problem and
    parses with its schema (MR-US2-S3). Dart tests and goldens read the same files by repo-relative
    path.
  - **Snapshot**: `specs/contracts/mobile-api/v1.schema.json` =
    `{ version: 1, endpoints: { <id>: { method, path, auth, cache, deprecated, input, output } }, problems: [...] }`
    with `input`/`output` from `z.toJSONSchema(schema, { target: 'draft-2020-12', io })` (`io: 'input'`
    for requests, `'output'` for answers), keys sorted for stable diffs. `domain/api/v1/snapshot.test.ts`
    regenerates it and compares; with `UPDATE_API_SNAPSHOT=1` (`pnpm --filter @shoot/domain
    api:snapshot`) it writes the file, but only when `compat.ts` finds the change additive.
  - **Compatibility rules** (`domain/api/v1/compat.ts`, `checkCompatible(old, next)` returning a list
    of breaks with endpoint and JSON pointer):
    - endpoints: removing one, or changing its method or path, breaks; `auth` may only loosen
      (`required` → `optional` → `none`); `cache` may change;
    - request schemas: a new property must be optional; removing a property, making one required,
      changing a type, narrowing an enum, a pattern, a length or a range breaks; adding an enum
      value is allowed;
    - answer schemas: adding a property (required or not) and adding an enum value are allowed;
      removing a property, making a required property optional or nullable, or changing a type
      breaks;
    - problems: removing a code breaks; adding one is allowed.
  - **Deprecation**: `.meta({ deprecated: true })` on a field or endpoint (JSON Schema `deprecated`),
    and the wrapper adds `Deprecation: true` to answers of a deprecated endpoint; nothing is removed
    before v2 (FR-033).
- **Rationale**: FR-030 to FR-033; one source of truth that the server, the app and the reviewers
  read; the domain's 100 % gate covers the schemas and the compatibility rules.
- **Alternatives**:
  - OpenAPI as the source: a second language for shapes and a generator; zod is already the
    workspace's schema tool.
  - A JSON-Schema diff package (`json-schema-diff`, `openapi-diff`): a new dependency for about 150
    lines of rules specific to this contract.
  - Snapshot equality without compatibility rules: every additive change would look like a break
    and reviewers would learn to update the snapshot blindly.

## R12. The resolver

- **Decision**:
  - `GET /api/mobile/v1/resolve?path=<site path>`; `path` must start with `/`, not `//`, contain no
    `..`, no scheme, no query or fragment, at most 512 characters (else 422 `api.errors.invalidField`).
  - A leading `/ar` sets the answer's locale to `ar` (and is stripped); otherwise the negotiated
    locale applies.
  - Pure classification `classifyPath(path)` in `domain/api/v1/resolve.ts` returns the route kind and
    params from one pattern table that mirrors `web/app/(site)/[locale]/`:

    | Pattern | Kind | Existence check (web, `modules/pages/resolve.ts`) |
    |---|---|---|
    | `/`, `/creators`, `/guides`, `/login`, `/register` | `route` | none |
    | `/creators/:code` | `creator` | `getCreatorByCode` |
    | `/book/:code` | `book` | `getCreatorByCode` and `canBook` |
    | `/work/:specialty` | `specialty` | `getSpecialtyPage` |
    | `/hire/:slug` | `hire` | `getPageBySlug(kind: 'intent')` |
    | `/guides/:slug` | `guide` | `getArticle` |
    | `/guides/category/:slug`, `/guides/author/:slug` | `guideCategory`, `guideAuthor` | `listCategories`, `getAuthor` |
    | `/terms`, `/terms/professional`, `/privacy` (+ `/versions`, `/versions/:n`) | `legal` | `getLegalDocument` / `getLegalVersion` |
    | `/match/:ref/:key`, `/match/:ref/:key/details`, `/q/:ref/:key`, `/account`, `/account/**` | `private` | **none** (FR-029) |
    | `/:slug` | `page` | `getPageBySlug(kind: 'standard')` |
    | anything else | — | — |

  - Answer `resolveV1`, a union on `status`:
    - `page`: `{ status, kind, path, locale, params }`, where `path` is the current address. A
      renamed page or the other language's address (`getPageBySlug` returning `redirect`) is folded
      into `page` with the new `path`, and the app replaces its location when `path` differs.
    - `removed`: `{ status, path, locale }` when `isRemovedPath(locale, path)`.
    - `notFound`: `{ status, path, locale }`.

    The resolver always answers 200; "not found" is a result here, not an error.
  - A drift test lists every `page.tsx` under `web/app/(site)/[locale]/` and asserts each maps to a
    pattern (the RSS `guides/feed` route is listed as not an app place).
  - The app (015) calls the resolver for paths its router does not know; 008 provides
    `LinksRepository.resolve(path)` only.
- **Rationale**: FR-029; the website's own not-found logic (removed vs never existed) reused.
- **Alternatives**: a "redirect" status (owner scope names three answers; folding keeps the app's
  switch small); answering 404 for not found (the app would treat a normal result as a failure).

## R13. App links: the association files and the app's configuration

- **Decision**:
  - Route handlers `web/app/.well-known/apple-app-site-association/route.ts` and
    `web/app/.well-known/assetlinks.json/route.ts`, one-line re-exports from a small module
    `web/modules/app-links/` (`api.ts`, `index.ts`), served at the site root, `Content-Type:
    application/json`, `Cache-Control: public, max-age=3600`, no redirect.
  - Configuration from new optional environment variables, validated in `web/shared/lib/env.ts`:
    `APP_IOS_APP_IDS` (comma-separated `TEAMID.bundle.id`), `APP_ANDROID_PACKAGE`,
    `APP_ANDROID_CERT_SHA256` (comma-separated `AA:BB:…` fingerprints). Unset means 404.
  - One list of link paths, `APP_LINK_PREFIXES` in `domain/api/v1/app-links.ts`: `/`, `/creators`,
    `/book`, `/work`, `/hire`, `/match`, `/q`, `/account`, `/guides`, `/terms`, `/privacy`, `/login`,
    `/register`, each also under `/ar`. Pure builders `appleAssociation(appIds)` and
    `androidAssetLinks(pkg, certs)` produce the documents (AASA `applinks.details[].components` with
    one `/` component per prefix and `<prefix>/*`; assetlinks with
    `delegate_permission/common.handle_all_urls`). Editor pages at `/{slug}` are not listed (their
    addresses cannot be enumerated as prefixes); they open in the browser.
  - `proxy.ts`: its matcher already skips any path with a dot (so `.well-known` is skipped); the
    pattern gains an explicit `\.well-known` exclusion and a test, so a future matcher change cannot
    localise or redirect these files.
  - App side: iOS `Runner.entitlements` gains `com.apple.developer.associated-domains` with
    `applinks:$(APP_LINK_HOST)` (set per build configuration in `ios/Flutter/*.xcconfig`); Android
    `AndroidManifest.xml` gains one `<intent-filter android:autoVerify="true">` for `https` and
    `${appLinkHost}` (a manifest placeholder from `android/app/build.gradle.kts`) with one
    `android:pathPrefix` per entry of `APP_LINK_PREFIXES` (and `android:path="/"`). A Flutter test
    parses both files and compares them with `examples/app-links.json`, the example the domain test
    generates from `APP_LINK_PREFIXES` (MR-US5-S6).
  - Next serves dot-prefixed `app/` folders as ordinary segments. If a Next upgrade stops doing so,
    the fallback is a `rewrites()` entry in `next.config.ts` from `/.well-known/:file` to
    `/api/well-known/:file`.
- **Rationale**: FR-040, FR-041; 007 R11 assigned these files to 008.
- **Alternatives**: static files in `public/.well-known/`: they cannot read the environment, and the
  AASA file has no extension, so its content type would be wrong.

## R14. The app's data layer for these reads

- **Decision**:
  - Feature folders, data and domain layers only (presentation arrives with 010–015):
    - `features/site/` (site settings, navigation, professional types, brief builder);
    - `features/landing/` (landing);
    - `features/creators/` (directory, profile, specialty page, hire page);
    - `features/content/` (guides, editor pages, legal);
    - `features/links/` (resolve).

    Each has `domain/entities/`, `domain/repositories/` (abstract interfaces),
    `data/models/` (hand-written `fromJson` and `toEntity`), `data/datasources/` (throw
    `NetworkException` or `ServerException`) and `data/repositories/` (return `Result`), plus
    `<feature>_injection.dart`. Use cases are added by the screen features when a cubit needs them.
  - Shared parts in `core/`:
    - `core/network/api_paths.dart` (`/api/mobile/v1`);
    - `core/network/api_get.dart`, a function `apiGet(dio, path, {query})` that maps a `DioException`
      to `NetworkException` or `ServerException(statusCode, code, fields)` by decoding the problem
      body; datasources call it, so the try/catch is written once;
    - `core/network/json_read.dart` (typed readers that throw `FormatException`);
    - `core/media/image_ref.dart` (entity and model for `imageV1`);
    - `core/content/rich_text.dart` and `core/content/sections.dart` (entities and models shared by
      landing and editor pages, with `UnknownSection` and `UnknownNode` cases).
  - `ServerException` and `ServerFailure` gain `code` and `fields` (additive); the repositories map a
    404 to `NotFoundFailure` (new) so screens can show 37.
  - Every enum decodes an unknown string to an `unknown` case; an unknown field is ignored
    (MR-US2-S5).
  - `InstallIdInterceptor` (`core/network/install_id_interceptor.dart`) adds `X-Shoot-Install`;
    `InstallIdStore` (`core/install/install_id_store.dart`) creates and keeps the id.
  - `service_health` stays until 010 replaces the home screen.
- **Rationale**: FR-050 to FR-053; the README's clean architecture; no code generation (constitution
  stack rule).
- **Alternatives**: `json_serializable`/`freezed` (code generation, needs a Complexity Tracking
  entry and a build step); one big `ApiRepository` (breaks the per-feature boundary).

## R15. The command pattern for writes (features 011–014; not built here)

- **Decision** (recorded so later features follow it):
  - A write moves from `web/modules/<feature>/actions.ts` into
    `web/modules/<feature>/commands/<name>.ts` as
    `export async function <name>(ctx: ActorContext, input: <Name>Input): Promise<CommandResult<T>>`.
  - `ActorContext` (defined in 008 in `web/shared/api/actor.ts`, because `defineHandler` produces
    it): `{ payload, user: User | null, locale, visitorKey, installId: string | null,
    clientAddress: string | null, now: () => Date, requestId }` (data-model.md).
    A command never reads cookies, headers, `next/navigation` or `Date.now()`.
  - `CommandResult<T>` = `{ ok: true, value: T } | { ok: false, code: string, fields?: … }`, with
    message-key codes, never text and never a redirect.
  - Two adapters call the command: the server action (form data to input, `getCurrentUser()` and the
    `sp_vid` cookie to context, result to form state, revalidate, redirect) and the API handler
    (JSON to input, Bearer and install id to context, result to JSON or problem).
  - The action's existing integration tests stay unchanged as regression tests; the command gets
    its own integration tests; the handler gets contract tests. Extract only what the current
    feature's endpoints need (012 booking, 014 creators, 010 or 012 the brief).
- **Rationale**: the app and the website must share one body for every write; copying would let the
  two drift.
- **Alternatives**: calling server actions over HTTP from the app (their wire format is private to
  Next and changes between versions).

## R16. Testing

- **Decision**:
  - **Domain** (`packages/domain`, 100 % gate): every schema with valid and invalid values; every
    example; `reduceRichText`; `linkTarget`; `classifyPath`; the app-link builders; the registry
    rules; `checkCompatible` (one test per rule); the snapshot.
  - **Web unit**: `negotiateLocale`, install-id parsing, problem serialisation and zod-issue mapping,
    cache-header choice; each `toWire*` mapper, including the internal-field whitelist; every problem
    code in both message files (`tests/unit/problem-codes.test.ts`).
  - **Integration** (`apps/web/tests/integration/mobile-api-*.int.test.ts`, Testcontainers
    PostgreSQL, seeded): import the route module and call
    `GET(new Request('http://test/api/mobile/v1/…', { headers }), { params: Promise.resolve({…}) })`;
    assert status and headers; `schema.parse(await res.json())` on every answer. `next/cache` is
    already mocked by `tests/integration/setup/env.ts`; no `next/headers` mock is needed because the
    wrapper reads the `Request` only. The wrapper's own file uses test-only handlers for `optional`,
    `required` and `rateLimit`.
  - **End-to-end**: one Playwright request spec (`tests/e2e/mr-smoke.spec.ts`) against the built app:
    `site`, `creators`, `resolve` and both association files, each parsed with its schema.
  - **Dart**: each model decodes its examples and maps to its entity; each repository maps exceptions
    to failures; `apiGet` decodes problems; the interceptors; `ShootImage` size choice and fallback;
    the app-link configuration test.
  - Every test name carries its scenario id (`MR-US1-S2`); `pnpm check:scenarios` includes this
    feature's quickstart.
- **Rationale**: Principle III; the testing-strategy skill's layers.
- **Alternatives**: HTTP-level integration tests against a running server: slower, and they need a
  build; the route handlers are plain functions.
