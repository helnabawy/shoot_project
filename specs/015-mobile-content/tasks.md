---
description: "Task list for feature 015: mobile guides, editor-built pages and legal (screens 33-36, 38)"
---

# Tasks: Mobile guides, editor-built pages and legal

**Input**: `specs/015-mobile-content/` (spec, plan, research R1-R9, data-model, contracts/screens.md, quickstart)

**Prerequisites**: features 007 (shell, widgets, goldens) and 008 US4 (content data layer) are on this
branch's base. 008 US5 (`resolve`) is not: see research R2.

**Tests**: required and written first (constitution III). Every test name carries its `MG-` id.
Paths are relative to `apps/mobile/` unless they start with `specs/` or `tools/`.

**Format**: `- [ ] Txxx [P] [USn] description with file path`. `[P]` = different files, no dependency on an
incomplete task.

Commands (Node 24 and Flutter 3.47.9 on PATH): `dart format --set-exit-if-changed lib test`,
`flutter analyze`, `flutter test`, `tool/goldens.sh [file] [--update]` (macOS), `pnpm fidelity`.

## Phase 1: Setup

- [X] T001 Add the content interface strings (contracts/screens.md "Strings") to `lib/core/l10n/arb/app_en.arb` and `app_ar.arb` as one contiguous block inserted after the `notFoundAction` entry (merge-friendly); Arabic written by a person's wording standard (mark for review in the PR); run `flutter gen-l10n`.
- [X] T002 [P] Write `specs/design-system/canvas/strings.ar/{S10b-removed,S11-guides,S11b-guide,S12-page,S13-legal}.json` (English text node to Arabic, a `keep` list for numbers and CMS placeholder text) and add the five boards to `test/core/l10n/board_strings_test.dart` so they must equal `app_ar.arb`.
- [ ] T003 [P] Set the 015 entries of `AppRoutes.table` in `lib/core/routing/app_routes.dart` to the real paths of contracts/screens.md with `built: true` (guides x4, legal x9, `/:slug`); add `"015-mobile-content"` to `tools/design-fidelity/shipped.json`. Extend `test/core/routing/` table test if one asserts the old placeholders.
  - Status: route table done. `tools/design-fidelity/shipped.json` is NOT changed (see T023, T037, T043): adding 015 makes `pnpm fidelity` fail until the owner decides the dark tokens for boards 33-35 and screens 33, 34 and 36 pass.

---

## Phase 2: Foundational (blocks every story)

### Tests first

- [X] T004 [P] Write `test/features/content/domain/link_target_test.dart`: a site path with and without `/ar` is `InApp` only when `hasAppRoute`; the same path otherwise is `External` at the website address; other `https`, `mailto:`, `tel:` are `External`; `javascript:`, `data:`, empty, `//x` are `Inert` (**MG-US2-S5**).
- [X] T005 [P] Write `test/features/content/data/path_status_repository_impl_test.dart` and its datasource test: `status` `page`, `removed`, `notFound` decode; an unknown status reads `notFound`; the request is `GET resolve?path=<path>`; a network or server failure becomes a `Failure` (**MG-US4-S2**).
- [X] T006 [P] Write `test/features/content/domain/usecases/` tests: `GetGuides`, `GetArticle`, `GetPage`, `GetLegal`, `GetLegalVersions`, `GetLegalVersion` forward to the repository; `CheckPath` returns `removed` only for `PathStatus.removed`, `notFound` on a failure; `OpenWhatsApp` builds `https://wa.me/<digits>?text=<encoded default message>` from `getSite()` and returns false with no number.
- [X] T007 [P] Write widget tests `test/features/content/presentation/widgets/rich_text_view_test.dart` (paragraph, heading as header semantics, bold/italic, ordered and unordered lists, quote, link tap goes through the handler, unknown nodes skipped, image alt shown on failure, markup text shown as plain text, **MG-US2-S4**, **MG-US2-S5**) and `ready_to_brief_band_test.dart` (**MG-US2-S8**: "Start a brief" goes to `/`, "WhatsApp us" calls the opener).

### Implementation

- [X] T008 Create `lib/features/content/domain/entities/path_status.dart`, `domain/repositories/path_status_repository.dart`, `data/datasources/path_status_remote_data_source.dart` (`apiGet(dio, 'resolve', query: {'path': path})`, reads only `status`) and `data/repositories/path_status_repository_impl.dart`. T005 passes.
- [X] T009 Create `lib/features/content/domain/link_target.dart` (`LinkTarget`, `resolveLink`, research R4). T004 passes.
- [X] T010 [P] Create the use cases under `lib/features/content/domain/usecases/` (`get_guides`, `get_article`, `get_page`, `get_legal`, `get_legal_versions`, `get_legal_version`, `check_path`, `open_whatsapp`) on `UseCase`. T006 passes.
- [X] T011 [P] Create `lib/features/content/presentation/cubit/content_state.dart` (`ContentLoading`, `ContentLoaded<T>`, `ContentMissing(removed)`, `ContentFailed`) and a `resolveMissing` helper that turns `NotFoundFailure` into `ContentMissing(removed: CheckPath(...))`.
- [X] T012 [P] Create `lib/features/content/presentation/widgets/content_icons.dart` (feature-local icon enum and widget: book, clock, rss, scale, image, trash, account, menu, in the same 24 px stroke style as `ShootIcons`) and `content_header.dart` (wordmark + language + account + menu, or back + language; keeps the `fidelity:header` and `fidelity:wordmark` keys; account goes to `/login`, menu to `/menu`).
- [X] T013 Create `rich_text_view.dart` (renders `RichTextDocument`: 16/1.6 body, headings as `Semantics(header)`, lists, quote, inline bold/italic/underline/code/links through `resolveLink`, images through `ShootImage` with alt; optional heading keys for scrolling) and `ready_to_brief_band.dart` (dark band, `TopHit` "Start a brief", "WhatsApp us" row), `english_notice.dart`, `content_loading.dart` (quiet placeholder, and `ContentFailed` renders `ErrorPage` with retry). T007 passes.
- [X] T014 Create `lib/features/content/presentation/content_routes.dart` (`contentRoutes(...)` and `editorPageRoute(...)`, each route builds its cubit from get_it and re-loads on locale change, research R8) and register use cases, `PathStatusRepository` and cubit factories in `lib/features/content/content_injection.dart`; append `...contentRoutes()` and `editorPageRoute()` last in `lib/app.dart`'s `routes:`. Routes may point at stub pages until each story lands.

**Checkpoint**: foundation tests pass; app starts; routes resolve to stubs.

---

## Phase 3: User Story 1 - Read the terms and the privacy policy (P1)

**Goal**: screen 36 for the three documents, versions and fallback.

**Independent test**: `flutter test test/features/content/domain/legal_sections_test.dart test/features/content/presentation/` for legal files, plus golden 36.

### Tests first

- [X] T015 [P] [US1] Write `test/features/content/domain/legal_sections_test.dart` (**MG-US1-S7**): numbers read from `1.` and `2)` prefixes, fallback to position, Arabic text with Western digits, non-heading blocks ignored, level-3 headings not sections.
- [X] T016 [P] [US1] Write `test/features/content/presentation/cubit/legal_cubit_test.dart` (bloc_test, **MG-US1-S4**, **MG-US1-S5**): loads the document in force with `upcoming`; `showVersions` loads the list; a 404 is `ContentMissing(removed:false)`; a version asked directly with `until != null` is flagged as superseded.
- [X] T017 [P] [US1] Write `test/features/content/presentation/pages/legal_page_test.dart`: title, "Legal" label, version line, switch chips with Terms on (**MG-US1-S1**); picking a chip goes to that document's path (**MG-US1-S2**); tapping a table-of-contents row scrolls its heading into view and headings are semantics headers (**MG-US1-S3**); upcoming line (**MG-US1-S4**); Arabic with `inRequestedLanguage: false` shows the English body left to right with the Arabic notice (**MG-US1-S6**); an earlier version shows the newer-version line with a link; no `TopHit` on the screen (FR-006).
- [X] T018 [P] [US1] Write `legal_versions_page_test.dart` (**MG-US1-S5**): each earlier version with its period, a tap opens `/…/versions/{n}`.
- [X] T019 [US1] Write `test/goldens/screens/36_legal_golden_test.dart` (four variants **MG-US1-S1**, self-baselines) using the board's placeholder text as data (five sections as in board 13).

### Implementation

- [X] T020 [P] [US1] Create `lib/features/content/domain/legal_sections.dart`. T015 passes.
- [X] T021 [US1] Create `presentation/cubit/legal_cubit.dart`. T016 passes.
- [X] T022 [P] [US1] Create `presentation/widgets/legal_toc.dart` and `page_nav.dart` shared rows if needed, then `presentation/pages/legal_page.dart` (fidelity keys `header`, `wordmark`, `h1`; chips as `ShootChip` in a `Semantics(container, label: "Legal documents")` group) and `legal_versions_page.dart`. T017, T018 pass.
- [ ] T023 [US1] Run `tool/goldens.sh test/goldens/screens/36_legal_golden_test.dart --update`, view the images against the board, fix until `pnpm fidelity` passes screen 36 in four variants (**SC-005**).
  - Open: the 36 golden exists in four variants and passes its self-baselines; against its board en-light is 2.8 % (limit 2 %).

**Checkpoint**: Terms, Professional terms and Privacy open and read; MG-US1-S1..S7 pass.

---

## Phase 4: User Story 4 - A removed page says so (P3, built before US2 and US3 because they show it)

**Goal**: screen 38 and the removed/not-found split.

**Independent test**: `flutter test test/features/content/presentation/pages/removed_page_test.dart`, golden 38.

### Tests first

- [X] T024 [P] [US4] Write `removed_page_test.dart`: notice, "410", explanation, rows "Read the guides" (goes to `/guides`, **MG-US4-S3**), "Ask us on WhatsApp", the one `TopHit` "Start a brief" (**MG-US4-S1**).
- [X] T025 [P] [US4] Extend `test/features/content/presentation/cubit/` with `resolve_missing_test.dart`: removed, notFound and a failed check give 38, 37 and 37 (**MG-US4-S2**).
- [X] T026 [US4] Write `test/goldens/screens/38_removed_golden_test.dart` (four variants **MG-US4-S1**, self-baselines).

### Implementation

- [X] T027 [US4] Create `presentation/pages/removed_page.dart` from `EmptyState` and `ShootRow` as `NotFoundPage` does (keys `header`, `wordmark`, `topHit`; the same Top Hit centred). T024, T025 pass.
- [X] T028 [US4] Golden update, compare to board S10b, `pnpm fidelity` for screen 38 (1 % threshold).

**Checkpoint**: MG-US4-S1..S3 pass.

---

## Phase 5: User Story 2 - Browse and read guides (P2)

**Goal**: screens 33 and 34.

**Independent test**: guides and article tests plus goldens 33, 34.

### Tests first

- [X] T029 [P] [US2] Write `guides_cubit_test.dart` (**MG-US2-S1**, **MG-US2-S2**): loads page, category or author; a page change keeps the filter; a topic change restarts at page 1; failure state.
- [X] T030 [P] [US2] Write `article_cubit_test.dart` (**MG-US2-S3**): loaded; 404 with removed gives `ContentMissing(true)`; 404 otherwise `false`.
- [X] T031 [P] [US2] Write `guides_page_test.dart`: line, "All" plus only categories with `count > 0`, rows newest first as sent with topic, title, "By {author} · {n} min read" (**MG-US2-S1**); chip goes to `/guides/category/{slug}` and the selected chip is on (**MG-US2-S2**); "Page 1 of 3", Previous muted on page 1, Next goes to `?page=2`, hidden when one page; RSS opens `/guides/feed` (`/ar/guides/feed` in Arabic) through the opener (**MG-US2-S7**); band actions (**MG-US2-S8**); category and author titles (FR-016).
- [X] T032 [P] [US2] Write `article_page_test.dart`: topic, title, byline, cover with alt label, lead, body, band, at most two "More guides" (**MG-US2-S4**); an article not in the app's language shows the English text LTR with a notice (**MG-US2-S6**); a missing article shows 37; a removed one shows 38.
- [X] T033 [US2] Write `test/goldens/screens/33_guides_golden_test.dart` and `34_guide_golden_test.dart` (four variants, self-baselines, also: a topic filter, an article without cover and the English-fallback notice as the app's own baselines, FR-040).

### Implementation

- [X] T034 [P] [US2] Create `guides_cubit.dart` and `article_cubit.dart`. T029, T030 pass.
- [X] T035 [P] [US2] Create `widgets/guide_row.dart` (88 px min, 64 px cover tile, group label, title 16/600, meta) and the pagination row.
- [X] T036 [US2] Create `pages/guides_page.dart` and `pages/article_page.dart`. T031, T032 pass.
- [ ] T037 [US2] Golden update and `pnpm fidelity` for screens 33 and 34 (2 % threshold, **SC-005**).
  - Open: 33 is 2.3 % and 34 is 4.0 % against 2 %; geometry (header, wordmark, h1, topHit) passes. Boards 33-35 cannot derive en-dark: `#f5f5f7` and `#d2d2d7` (band and step numbers) have no role in tokens.css (owner decision, see the report).

**Checkpoint**: MG-US2-S1..S8 pass.

---

## Phase 6: User Story 3 - Read an editor-built page (P2)

**Goal**: screen 35.

**Independent test**: editor page tests plus golden 35.

### Tests first

- [X] T038 [P] [US3] Write `editor_page_cubit_test.dart`: loaded; 404 and not removed gives `ContentMissing(false)` (**MG-US3-S5**); removed gives 38; an answer whose `path` differs from the requested one is exposed so the route replaces the address (**MG-US3-S7**); every open reloads, nothing is cached (**MG-US3-S6**).
- [X] T039 [P] [US3] Write `editor_page_screen_test.dart`: title h1, intro from the first `howItWorks.subheading`, numbered steps from the CMS (**MG-US3-S1**, **MG-US3-S2**), a questions section whose tap opens the answer below and announces `expanded` (**MG-US3-S3**), rich text and call to action sections, the one "Start a brief" Top Hit unless the page's own call to action names another action; sections of other types are skipped and a page with nothing drawable shows the open-on-website row (**MG-US3-S4**, plan R1).
- [X] T040 [US3] Write `test/goldens/screens/35_page_golden_test.dart` (four variants **MG-US3-S1**, self-baselines, expanded question baseline).

### Implementation

- [X] T041 [P] [US3] Create `editor_page_cubit.dart`, `widgets/steps_list.dart`, `widgets/faq_list.dart`.
- [X] T042 [US3] Create `pages/editor_page_screen.dart` and finish `editorPageRoute` (replace the location when the answer's path differs). T038, T039 pass.
- [ ] T043 [US3] Golden update and `pnpm fidelity` for screen 35.
  - Open: 35 passes en-light and, with a local tokenise override that is not committed, en-dark.

**Checkpoint**: MG-US3-S1..S7 pass.

---

## Phase 7: Polish and cross-cutting

- [ ] T044 [P] Accessibility pass: every interactive element at least 44 x 44, names for "Topics", "Pages", "Legal documents", "Back to the guides", "Where to next", text scale 2.0 self-baselines overflow-free, a widget test with `meetsGuideline(androidTapTargetGuideline)` and `labeledTapTargetGuideline` per screen (FR-044).
  - Open: touch targets and names are built; the per-screen `labeledTapTargetGuideline` tests are not written (the topic label on 34 is smaller than 44 px, as on the board).
- [ ] T045 [P] Motion pass: arrive/rise only, none under `disableAnimations`, nothing self-started beyond 5 s (FR-045); test with reduced motion.
  - Open: only the existing rise and glint motion of `TopHit` and `EmptyState` is used; no test.
- [ ] T046 (2026-11-14: the resolver blocker is gone, 008 US5 is on main with `features/links/`; `PathStatusRepositoryImpl` still makes its own `resolve` read, and moving it onto `LinksRepository` is the one-file follow-up in plan.md) Run `dart format --set-exit-if-changed lib test`, `flutter analyze`, `flutter test --coverage` (80 % of changed lines), `tool/goldens.sh`, `pnpm fidelity`, `pnpm check:scenarios`; tick only verified tasks; note blockers (resolve endpoint, owner decisions) in the final report.
- [X] T048 [US1] Make the sign-in and join screens (009) open `/terms`, `/terms/professional` and `/privacy` in the app (small change at the `WebsiteLinks` call sites in `lib/features/sign_in/presentation/pages/`; their tests updated), **FR-007**.
- [ ] T047 Walk quickstart.md on a device or simulator in English and Arabic, light and dark; record what could not be run (device checks stay open).
  - Open: not run on a device or simulator.

---

## Dependencies and order

- Phase 1 then Phase 2, then US1 (P1). US4 before US2 and US3 (they render the removed screen). US2 and US3 are independent of each other.
- Inside a story: tests, models and cubits, widgets, pages, golden update, fidelity.
- Parallel: T002, T003 with T001; T004-T007; T010-T012; the `[P]` test tasks of each story.

## Implementation strategy

MVP is Phase 1-3 (legal: the app-store and sign-in need). Then US4, US2, US3.
Shared files (`app.dart`, `app_routes.dart`, ARB, `shipped.json`) are edited in small additive hunks.

## Note on integration runs

This feature touches the Flutter app only and has no Testcontainers or Docker integration task. Any server-side check of the content and `resolve` endpoints (008) is deferred to the post-merge integration run.
