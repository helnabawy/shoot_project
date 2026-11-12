# Research: Mobile guides, editor-built pages and legal

## R1. A page section the app does not draw (FR-022, the one NEEDS CLARIFICATION)

- **Decision**: draw `howItWorks`, `faq`, `richText`, `callToAction`; **skip** every other type
  (`features`, `categoriesGrid`, `personaBand`, `logoCloud`, `creatorNetwork`, and any unknown type).
  If a page has no drawable section and no introduction, show one row "Open this page on the website"
  (opens the website address in the browser) so it is never blank.
- **Rationale**: logo bands and creator networks are proof-style blocks that board 35 does not show;
  skipping keeps the screen designed and honest (FR-046). The fallback row prevents a dead end.
- **Alternatives**: a "see on the website" row per skipped section (noisy, repeats); open the whole
  page on the website (leaves the app for a page that is mostly drawable).
- **Owner decision**: confirm or change; the choice is one function (`drawable(Section)`), so a
  change costs a test and a line.

## R2. Removed versus not found (FR-030, FR-031)

- **Decision**: a content read that answers 404 triggers one `GET /api/mobile/v1/resolve?path=<site
  path>`; `status: removed` shows screen 38, `notFound` or any failure of the check shows 37. The check
  runs only after a 404, never for a successful read.
- **Rationale**: `resolve` is 008's single source for "removed" (`removed-paths`); a page read cannot
  tell.
- **Status of the endpoint**: 008 US5 (`resolve`, `features/links`) is on a sibling branch, not on this
  branch's base. The wire shape is fixed in 008's `data-model.md`:
  `{status:'page'|'removed'|'notFound', path, locale, ...}`. This feature reads only `status`, through
  `PathStatusRepository`, so it works unchanged once the endpoint ships; until then the server answers a
  404 problem and the check yields "not found" (safe default).
- **Alternatives**: wait for `features/links` (blocks 38); infer removed from a 404 (breaks FR-031).

## R3. Routes and shadowing

- **Decision**: register `/guides`, `/guides/category/:slug`, `/guides/author/:slug`, `/guides/:slug`,
  and for each of `/terms`, `/terms/professional`, `/privacy` the document, `/versions` and
  `/versions/:version`, in `contentRoutes()`; register `/:slug` separately in `editorPageRoute()`, which
  `app.dart` appends **last**, so no earlier route is shadowed. A path no feature builds (for example `/menu` before 010) reads as a page slug, answers 404, and shows 37 (or 38 when removed).
- **The route table** (`AppRoutes.table`) had placeholder legal entries (`/terms/:slug`); they become
  the real web paths and `built: true`.
- `/guides/feed` is a website route (RSS), never an app route (008 resolve test lists it as non-app).
  The Guides screen opens it in the browser (FR-015).

## R4. Link handling in rich text and CMS links (FR-014)

- **Decision**: one pure `resolveLink(href, hasAppRoute)`:
  - `http(s)://` on the site's own host, or a path starting `/` (with or without `/ar`): in app when
    `hasAppRoute(path)`, else the website address in the browser;
  - other `http(s)`, `mailto:`, `tel:`: external;
  - anything else (`javascript:`, `data:`, empty): not tappable (text only).
- `hasAppRoute` reads `AppRoutes.table` (`built` entries; segment patterns).
- **Rationale**: one rule, unit-tested; unsafe schemes never become links (FR-013, Principle VII).

## R5. Legal: sections, numbers, version in force

- The API sends one `RichTextDocument` per version. **Sections** are its level-2 headings; the table of
  contents row shows the clause number read from the heading's leading `N.` (else its position) and the
  rest as the title. Numbers are the CMS's own text, so English and Arabic keep the same number (FR-005,
  US1-S7); digits are shown as sent.
- The version in force is what `GET legal/{kind}` returns; `upcoming` gives the "applies from" line
  (US1-S4). The server decides "in force" at request time, so the date change needs no editor action;
  the cubit reloads on every open.
- An earlier version (`/versions/{n}`) where `until != null` shows a line "A newer version is in force"
  with a link to the document's path (edge case).
- "English text governs" notice: always shown as the board shows it. When `inRequestedLanguage` is
  false in Arabic, the body is laid out LTR and a second notice says the Arabic text is not yet available.

## R6. Guides list (FR-010, FR-016)

- Chips: "All" plus `GuideList.categories` with `count > 0`, the selected one `on`. A chip tap
  navigates to `/guides` or `/guides/category/{slug}` (so the address changes, as on the web); paging
  keeps its page in a query parameter `page`, restarting at 1 on a topic change.
- Author view: title is the author's name; category view: the category name; both use the same layout.
- "Page n of m" is `Pagination`; hidden when `pageCount <= 1`. Previous/Next are disabled text when
  at the ends (board 33 shows "Previous" muted).
- Rows show the first category's name, the title, "By {author} · {n} min read" (author omitted when
  null), a 64 px cover tile (`ShootImage`, scene tile when no cover).
- Article "More guides": `Article.related`, first two only (board 34).

## R7. Arabic and English fallback (FR-005, FR-043)

- `inRequestedLanguage == false` while the app is in Arabic: the article or legal body is wrapped in
  `Directionality(ltr)` with a notice (Arabic string) above it. In a list, such a row's title is
  wrapped the same way (the website lists it too).
- Mixed-direction runs use the existing `isolate` helper (`core/l10n/bidi.dart`).

## R8. Language change while a screen is open

- Cubits reload when the locale changes (the page watches `Localizations.localeOf`), because the Dio
  client sends the current language on every request. No cache is kept (spec Assumptions).

## R9. Design fidelity for these boards

- Boards 33–36 render fixed-height roots (1100/1400 px); the golden renders the screen at the board's
  size with the board's own placeholder text as test data (so text-heavy diff is meaningful), as 009 did
  with the shared examples. The Arabic derived references need `strings.ar/<board>.json` for
  S10b, S11, S11b, S12 and S13; this feature writes them (marked "needs review by an Arabic writer")
  and a test keeps them equal to `app_ar.arb`.
- Board 35's Top Hit shows a "price next" hint; it is a canvas annotation of the next step, the spec
  gives "Start a brief" only, so the app draws none (a one-element text difference, inside 2 %).
- Thresholds: 33–36 at 0.02 (manifest), 38 at default 0.01 (SC-005).
- `pnpm fidelity` needs Playwright; `shipped.json` gains `015-mobile-content` so the compare runs.
