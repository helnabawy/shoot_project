# Data model: Mobile API

This feature adds **no collection, field or migration**. Its data is:
- the public wire shapes of v1, as zod schemas in `packages/domain/src/api/v1/`;
- the server-side context a handler runs with;
- the endpoint definition and the snapshot;
- the app's entities and the one device key.

Conventions for every wire shape (research R8):
- Ids are strings.
- Dates are ISO 8601 UTC strings.
- Site paths have no language prefix.
- Optional values are `null` and never absent. Lists are never `null`.
- Choices are string enums. Clients decode an unknown value as `unknown`.
- Text is in the answer's `locale`, with English fallback.

Names below are the schema export names (`xxxV1`). TypeScript types are `z.infer` of them.

## Common shapes (`common.ts`)

| Shape | Fields | Rules |
|---|---|---|
| `localeV1` | `'en' \| 'ar'` | |
| `imageSizeV1` | `url`, `width`, `height` | `url` absolute (`https?://`); width, height positive integers |
| `imageV1` | `alt`, `width`, `height`, `sizes: imageSizeV1[]` | `sizes` non-empty, ascending by width, unique widths, includes the original (R9); `alt` may be `""` (decorative) |
| `linkV1` | `label`, `path` | `path` starts with `/`, no language prefix |
| `externalLinkV1` | `label`, `url` | `url` is `https?:`, `mailto:` or `tel:` |
| `inlineV1` | `text { text, bold, italic, underline, code }` \| `link { href, children: text[] }` \| `lineBreak` | discriminated on `type`; `href` follows `linkTarget` (R10) |
| `blockV1` | `paragraph { children }` \| `heading { level: 2\|3\|4, children }` \| `list { ordered, items: blockV1[][] }` \| `quote { children }` \| `image { image: imageV1 }` | recursive through `list.items`; depth ≤ 8 |
| `richTextV1` | `nodes: blockV1[]` | may be empty |
| `paginationV1` | `page`, `pageCount`, `total`, `pageSize` | `page` from 1 to `max(pageCount, 1)` |

## Problem (`problems.ts`)

`problemV1` has these fields:
- `type`: always `'about:blank'`;
- `status`: 401, 404, 422, 429 or 500 (later features add statuses additively; 009 adds 403, 409
  and 503);
- `code`: a member of `PROBLEM_CODES`;
- `fields?`: `[{ path, code }]`, present for 422 only. `path` is dotted (`query.page`). `code` is a
  message key (research R6), and every key that can appear is checked to exist in both web message
  files;
- `retryAfter?`: seconds, present for 429 only.

Problems are the one exception to the "`null`, never absent" convention: `fields` and `retryAfter`
are left out when they do not apply, as in the owner's `{ type, status, code, fields? }`.

`PROBLEM_CODES` holds `api.errors.invalidInput`, `invalidField`, `localeUnsupported`, `notFound`,
`unauthorized`, `tokenInvalid`, `rateLimited` and `unexpected`.

## Site (`site.ts`)

| Shape | Fields | Source |
|---|---|---|
| `siteV1` | `locale`, `siteName`, `logo: imageV1 \| null`, `logoDark: imageV1 \| null`, `whatsapp: { number, defaultMessage, expectedReplyTime }`, `phone`, `contactEmail`, `social: externalLinkV1[]` (label = platform), `labels: { seeker, provider }`, `creatorCodePrefix`, `quickMatchEnabled` | `getSiteSettings`. `number` is E.164 or `null`. **Never sent**: `briefLimitPerHour`, `autoPublishEdits`, `translationStatus`, `activePersonas` (sent via `personasV1`), `footerGroups` (sent via `navigationV1`), `directoryPageSize`, everything in `quickMatch` but `enabled` |
| `navigationV1` | `locale`, `header: linkV1[]`, `footerGroups: [{ key, label, links: linkV1[] }]`, `legal: linkV1[]` | `getNavigation` |
| `personaV1` | `id`, `slug`, `singular`, `plural`, `glyph`, `description` | `getActivePersonas`, in Site Settings order |
| `categoryV1` | `id`, `slug`, `name`, `glyph`, `description`, `scene`, `image: imageV1 \| null`, `personaIds: string[]` | `getCategoriesForAudience` |
| `personasV1` | `locale`, `personas: personaV1[]`, `categories: categoryV1[]` | |
| `builderOptionV1` | `value`, `label`, `sentenceLabel`, `glyph`, `personaSlugs: string[]` | `BuilderOption` |
| `builderSlotV1` | `token`, `kind` (the domain `SlotKind` values, open-ended), `groupLabel`, `placeholder`, `defaultValue`, `required`, `allowCustom`, `multiple`, `options: builderOptionV1[]` | `BuilderSlot` |
| `briefBuilderV1` | `locale`, `builder: { sentence, slots, submitLabel, helperText, whatsappTemplate, successMessage, steps: [{ title, description }] } \| null` | `getBriefBuilderConfig`. `null` when the builder is off |

## Landing and sections (`landing.ts`)

- **`heroV1`**: these fields.
  - `eyebrow`, `headline`, `subheadline`, `trustChips: string[]`.
  - `layout`: `'briefBuilder' | 'ctas'`.
  - `primaryCta` and `secondaryCta`: `{ label, path | url } | null`.
  - `image`, `imageMobile`: `imageV1 | null`.
  - `overlay`, `overlayOpacity`.
- **`landingV1`**: `locale`, `hero`, `navigation: [{ label, target }]` (in-page anchors) and
  `sections: sectionV1[]`.
- **`sectionV1`**: a union on `type`. Each section also has `anchor: string | null`.

  | `type` | Fields |
  |---|---|
  | `howItWorks` | `heading`, `subheading`, `steps: [{ title, body, visual }]` |
  | `features` | `heading`, `subheading`, `items: [{ title, body, pointsAt }]` |
  | `categoriesGrid` | `heading`, `subheading`, `tiles: [{ category: categoryV1, counts: { samples, professionals } }]` (resolved) |
  | `personaBand` | `heading`, `body`, `layout`, `personas: personaV1[]` (resolved) |
  | `faq` | `heading`, `items: [{ question, answer: richTextV1 }]` |
  | `logoCloud` | `heading`, `logos: [{ name, image: imageV1, imageDark: imageV1 \| null }]` |
  | `richText` | `content: richTextV1` |
  | `callToAction` | `heading`, `body`, `primary: { label, path \| url }`, `secondary: … \| null` |
  | `creatorNetwork` | `heading`, `subheading`, `creators: creatorCardV1[]` (the block's rule and count, resolved) |

  Validation:
  - an unknown CMS block is skipped and logged;
  - a new `type` is an additive enum value;
  - the app decodes it as `UnknownSection` and renders nothing.

## Creators (`creators.ts`)

| Shape | Fields | Source |
|---|---|---|
| `creatorCardV1` | `code` (stored, opaque), `displayCode` ("SH-…"), `name`, `initials`, `photo: imageV1 \| null`, `types` (the "Photographer and videographer" line, CMS words), `places: string[]`, `specialties: string[]`, `languages: string[]`, `yearsExperience: number \| null`, `sampleCount`, `featured` | `describeCreator` over `CreatorSummary` |
| `creatorsRequestV1` | `query: { type?, specialty?, place?, page? }` | slugs; `page` an integer ≥ 1 as a string |
| `creatorListV1` | `locale`, `items: creatorCardV1[]`, `filters: [{ key: 'type'\|'specialty'\|'place', label, options: [{ slug, name, count, selected }] }]`, `pagination: paginationV1` | `buildDirectory` (the website's order, counts and page clamping) |
| `sampleV1` | `id`, `kind: 'image'\|'video'`, `thumb: imageV1`, `large: imageV1`, `alt`, `caption`, `specialty`, `videoUrl: string \| null`, `provider: string \| null` | `SampleView` |
| `creatorProfileV1` | `locale`, `code`, `displayCode`, `name`, `initials`, `bio`, `photo`, `types`, `places`, `specialties`, `languages`, `nationality`, `yearsExperience`, `samples: sampleV1[]`, `social: externalLinkV1[]`, `canBook`, `personaSlugs: string[]` | `getCreatorProfile`. Gender is never sent (002 FR-011) |
| `specialtyPageV1` | `locale`, `category: { id, slug, name }`, `title`, `description`, `intro`, `counts: { samples, professionals }`, `creators: creatorCardV1[]`, `samples: [{ id, creatorCode, creatorName, thumb: imageV1, alt, caption, kind }]` | `getSpecialtyPage` |
| `hirePageV1` | `locale`, `path` (current address), `title`, `intro`, `sections: sectionV1[]`, `builder: briefBuilderV1['builder']`, `preset: Record<token, value>`, `creators: creatorCardV1[]` (≤ 6), `creatorTotal`, `faq: [{ question, answer: richTextV1 }]` | `getIntentPage`. A redirect becomes `path` ≠ the requested address |

**Not in v1 yet**: a creator's "from" price. The boards show "from AED 950", but the website has no
rule for it. Feature 011 adds `fromPrice` additively.

## Content (`content.ts`)

| Shape | Fields | Source |
|---|---|---|
| `guidesRequestV1` | `query: { page?, category?, author? }` | |
| `articleSummaryV1` | `slug`, `title`, `summary`, `cover: imageV1 \| null`, `publishedAt`, `readingMinutes`, `categories: [{ slug, name }]`, `author: { slug, name }`, `inRequestedLanguage` | `ArticleSummary` |
| `guideListV1` | `locale`, `items: articleSummaryV1[]`, `pagination`, `categories: [{ slug, name, description, count }]`, `category: { slug, name, description } \| null`, `author: { slug, name, bio, photo } \| null` | `listArticles`, `listCategories`, `getAuthor` |
| `articleV1` | `articleSummaryV1` + `body: richTextV1`, `related: articleSummaryV1[]` | `getArticle` (scheduled items only from `now`) |
| `pageV1` | `locale`, `path`, `title`, `sections: sectionV1[]` | `getPageBySlug(kind: 'standard')`, never drafts |
| `legalKindV1` | `'terms' \| 'professional-terms' \| 'privacy'` | `LEGAL_KINDS` |
| `legalDocumentV1` | `locale`, `kind`, `title`, `version`, `effectiveFrom`, `until: string \| null`, `body: richTextV1`, `inRequestedLanguage`, `upcoming: { version, effectiveFrom } \| null` | `getLegalDocument` |
| `legalVersionsV1` | `locale`, `kind`, `title`, `versions: [{ version, from, until, changeSummary }]` | `getLegalVersions` |
| `legalVersionV1` | as `legalDocumentV1` without `upcoming` | `getLegalVersion` |

## Resolve (`resolve.ts`)

- **`resolveRequestV1`**: `query: { path }`. Rules: starts with `/`, not `//`, no `..`, no scheme,
  no `?` or `#`, at most 512 characters.
- **`placeKindV1`**: one of `route`, `page`, `hire`, `creator`, `book`, `specialty`, `guide`,
  `guideCategory`, `guideAuthor`, `legal` and `private`. New kinds are additive.
- **`resolveV1`**: a union on `status`.
  - `{ status: 'page', kind, path, locale, params: Record<string, string> }`
  - `{ status: 'removed', path, locale }`
  - `{ status: 'notFound', path, locale }`
- **`classifyPath(path)`**: a pure function that returns
  `{ kind, params, locale } | null` from the pattern table in research R12.

## App links (`app-links.ts`)

- **`APP_LINK_PREFIXES`**: `/`, `/creators`, `/book`, `/work`, `/hire`, `/match`, `/q`,
  `/account`, `/guides`, `/terms`, `/privacy`, `/login`, `/register`, each also under `/ar`.
- **`appleAssociation(appIds)`**:
  `{ applinks: { details: [{ appIDs, components: [{ '/': prefix }, { '/': prefix + '/*' }, …] }] } }`.
- **`androidAssetLinks(pkg, certs)`**:
  `[{ relation: ['delegate_permission/common.handle_all_urls'], target: { namespace: 'android_app', package_name, sha256_cert_fingerprints } }]`.
- **`examples/app-links.json`**: `{ prefixes }`. The domain test generates it, and the Flutter
  configuration test reads it.

## Endpoint definition and registry (`endpoints.ts`)

`defineEndpoint({ id, method, path, auth, cache, status?, input, output, examples, requestExamples?, deprecated? })`:

| Field | Type | Rule |
|---|---|---|
| `id` | camelCase string | unique; the snapshot key |
| `method` | `'GET'` (008) \| `'POST'` \| `'PATCH'` \| `'PUT'` \| `'DELETE'` | |
| `path` | `/api/mobile/v1/...` with `{param}` segments | unique per method; equals the route file location |
| `auth` | `'none' \| 'optional' \| 'required'` | 008: all `none` |
| `cache` | `'public' \| 'no-store'` | 008: all `public` |
| `status` | `200 \| 202 \| 204` | default 200; 008: all 200. A 204 endpoint has `output: noContentV1` (`z.null()`) and sends no body |
| `input` | zod object `{ params?, query?, body? }` | |
| `output` | zod schema | |
| `examples` | example file names | at least one, except for a 204 endpoint (none); each parses with `output` |
| `requestExamples` | example file names | optional; each parses with `input.shape.body` (009's command bodies) |
| `deprecated` | boolean | default false; also true when any field of `output` carries `.meta({ deprecated: true })` |

`ENDPOINTS` lists them; `endpoints` maps id to definition.

## Snapshot (`specs/contracts/mobile-api/v1.schema.json`)

```json
{
  "version": 1,
  "endpoints": {
    "creatorProfile": {
      "method": "GET",
      "path": "/api/mobile/v1/creators/{code}",
      "auth": "none",
      "cache": "public",
      "deprecated": false,
      "input": { "…": "JSON Schema (io: input)" },
      "output": { "…": "JSON Schema (io: output)" }
    }
  },
  "problems": ["api.errors.invalidField", "…"]
}
```

Keys are sorted. Rules:
- a change is accepted only when `checkCompatible(committed, regenerated)` returns no break
  (research R11);
- the snapshot is rewritten only with `UPDATE_API_SNAPSHOT=1`.

## Server context (`apps/web/src/shared/api/actor.ts`)

`ActorContext` holds these fields:
- `payload`: the Payload client;
- `user`: `User | null`, always `null` for `auth: 'none'`;
- `locale`: `Locale`;
- `installId`: `string | null`, valid 32-hex only;
- `clientAddress`: `string | null`, the first `x-forwarded-for` address, else `x-real-ip`, else
  `null` (009 limits per address even when an install id is present; commands never read headers);
- `visitorKey`: `install:<id>`, or the client address, or `anonymous`;
- `now`: `() => Date`, injected, so tests fix it;
- `requestId`: `string`.

The handler's `run(ctx, input)` gets it. Later commands (research R15) take the same type.

## App side (`apps/mobile`)

| Entity / type | Where | Rules |
|---|---|---|
| `InstallId` | `core/install/install_id_store.dart` | 32 lower-case hex from `Random.secure()`. Created once, stored under `install.id` through 006's `PreferencesStore`. A read failure creates a new id for the session. Never logged |
| `ServerException(statusCode, code, fields)`, `ServerFailure(statusCode, code)`, `NotFoundFailure` | `core/error/` | `code` is the problem code or `null` when the body is not a problem |
| `ImageRef { alt, width, height, sizes }` | `core/media/image_ref.dart` | `pick(targetPx)`: the smallest size with width ≥ target, else the largest |
| `RichText`, `RichBlock` (sealed: paragraph, heading, list, quote, image, `UnknownBlock`), `RichInline` (text, link, lineBreak, `UnknownInline`) | `core/content/rich_text.dart` | |
| `Section` (sealed: one per `sectionV1` type, plus `UnknownSection`) | `core/content/sections.dart` | |
| `SiteInfo`, `Navigation`, `Audience` (personas and categories), `BriefBuilder` | `features/site/domain/entities/` | |
| `Landing`, `Hero` | `features/landing/domain/entities/` | |
| `CreatorCard`, `CreatorList`, `DirectoryFilter`, `CreatorProfile`, `Sample`, `SpecialtyPage`, `HirePage` | `features/creators/domain/entities/` | |
| `ArticleSummary`, `GuideList`, `Article`, `EditorPage`, `LegalDocument`, `LegalVersions` | `features/content/domain/entities/` | |
| `Resolution` (sealed: `ResolvedPage(kind, path, locale, params)`, `RemovedPage`, `NoPage`), `PlaceKind` (with `unknown`) | `features/links/domain/entities/` | |

Each `…Model` in `data/models/` mirrors its schema:
- `fromJson` throws `FormatException` on a missing or mistyped required field;
- an unknown enum becomes `unknown`;
- unknown keys are ignored;
- `toEntity()` maps the model to its entity.
