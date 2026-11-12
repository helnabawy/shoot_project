# Data Model: Mobile guides, editor-built pages and legal

No new wire shape is invented by this feature. It reads the entities 008 US4 already decodes
(`features/content/domain/entities/`) and adds three derived values and one tiny read.

## Entities read (existing, `features/content/domain/entities`)

| Entity | Source endpoint | Used for |
|---|---|---|
| `GuideList` (`items: ArticleSummary`, `pagination`, `categories: GuideCategory`, `category`, `author`) | `GET guides?page&category&author` | 33 |
| `Article` (`summary`, `body: RichTextDocument`, `related`) | `GET guides/{slug}` | 34 |
| `EditorPage` (`locale`, `path`, `title`, `sections: Section`) | `GET pages/{slug}` | 35 |
| `LegalDocument` (`kind`, `title`, `version`, `effectiveFrom`, `until`, `body`, `inRequestedLanguage`, `upcoming`) | `GET legal/{kind}`, `.../versions/{n}` | 36 |
| `LegalVersions` (`versions: LegalVersionEntry`) | `GET legal/{kind}/versions` | 36 earlier versions |
| `Section` sealed (`HowItWorksSection`, `FaqSection`, `RichTextSection`, `CallToActionSection`, others) | inside `EditorPage` | 35 |

The page API has no separate introduction field. Screen 35 shows the page `title` as its h1; when the
first section is `howItWorks`, its `subheading` is the introduction under the h1 and its own heading is
not repeated; a `howItWorks` elsewhere draws its heading as an h2 first.

## New

### `PathStatus` (domain, `entities/path_status.dart`)

`enum PathStatus { page, removed, notFound }`; decoded from `resolveV1.status` (`page`, `removed`,
`notFound`); any other value reads as `notFound`.

### `LegalSection` (domain, `legal_sections.dart`)

| Field | Rule |
|---|---|
| `id` | `section-{index}` (0-based), the scroll anchor |
| `number` | the leading digits of the heading before `.` or `)`; else `index + 1` |
| `title` | heading text without that prefix, trimmed |
| `headingIndex` | index of the heading block in `RichTextDocument.nodes` |

`tocOf(RichTextDocument) -> List<LegalSection>` takes the level-2 headings in order.

### `LinkTarget` (domain, `link_target.dart`)

`sealed`: `InApp(path)` (language prefix removed, query kept), `External(Uri)`, `Inert` (shown as text).
`resolveLink(href, {required bool Function(String path) hasAppRoute, required Uri siteBase})`.

### Presentation states (`cubit/content_state.dart`)

```text
ContentState<T>
 ├─ ContentLoading
 ├─ ContentLoaded<T>(value)
 ├─ ContentMissing(removed: bool)   // 404; removed per PathStatus (R2)
 └─ ContentFailed(failure)          // network / server -> screen 39 with Try again
```

`GuidesCubit` loads (`page`, `category`, `author`); `ArticleCubit(slug)`; `EditorPageCubit(slug)`;
`LegalCubit(kind, version?)` loads the document and, on `showVersions()`, the version list.

## Derived values (computed, never invented)

- Reading time: `ArticleSummary.readingMinutes` (server).
- "Page n of m": `Pagination.page`, `pageCount`; hidden when `pageCount <= 1`.
- Version line: `Version {version} · applies from {date}`; the date is `effectiveFrom` formatted for the
  app's language (day and month, year when not the current year), digits per the locale.
- Upcoming line: `Version {n} applies from {date}` from `upcoming`.
- Earlier-version period: `{from} to {until}`.

## Validation and state rules

- A 404 from a read becomes `ContentMissing`; the cubit asks `CheckPath` once and sets `removed`.
- A draft page, an unknown slug and a scheduled article are all server 404s with no `removed`
  record, so they land on 37 (US3-S5, US2-S3, SC-004).
- Rich text nodes of unknown type are skipped; images in rich text use their `alt`, and a failed image
  shows the alt text in its place.
