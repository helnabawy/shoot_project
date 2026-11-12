# Implementation Plan: Mobile guides, editor-built pages and legal

**Branch**: `015-mobile-content` (worktree branch `claude/015-mobile-content`) | **Date**: 2026-11-12 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/015-mobile-content/spec.md`

## Summary

Build the app's reading screens from the approved canvas, in `apps/mobile` only:

- **33 Guides** (`/guides`, `/guides/category/{slug}`, `/guides/author/{slug}`), **34 Guide article**
  (`/guides/{slug}`), **35 Editor-built page** (`/{slug}`), **36 Legal** (`/terms`,
  `/terms/professional`, `/privacy` and their `/versions` and `/versions/{n}` paths), **38 Page removed**.
- The data layer already exists on main (008 US4): `features/content/` has the entities, models,
  datasource and `ContentRepository` for guides, article, page, legal, versions. This feature adds the
  **use cases, cubits, pages, widgets, routes and strings**, plus one small read of `GET resolve`
  to tell a removed page from an unknown one (research R2).
- Rich text is drawn from the API's reduced node tree (`RichTextDocument`) by a feature-owned
  `RichTextView`; links open in the app when the app has the path, outside it otherwise (R4).
- No web change, no new package, no new endpoint. The web app already serves every read.

## Technical Context

**Language/Version**: Dart 3.13.7, Flutter 3.47.9 (pinned in `apps/mobile/README.md`).

**Primary Dependencies**: existing only: `flutter_bloc`, `get_it`, `go_router`, `dio`, `equatable`,
`url_launcher` (through `WebsiteLinks`/`openInBrowser`), `flutter_svg`. **No new package.**

**Storage**: none (FR: no offline copy). Nothing is persisted.

**Testing**: `flutter_test`, `bloc_test`, `mocktail`. Unit (use cases, legal sections, link target),
cubit, widget (pages, rich text), golden (screens 33, 34, 35, 36, 38 in four variants, plus
self-baselines and the states with no board), API-example decode (existing files), Arabic board strings
test. Every test name carries its `MG-` id.

**Target Platform**: iOS (iPhone, iPad) and Android.

**Project Type**: mobile app feature (clean architecture by feature).

**Performance Goals**: first paint of a list or article after one request; images sized by
`ShootImage`; self-started motion ends within 5 s (arrive rise only, none under reduced motion).

**Constraints**: logical start/end only; 16 px / 1.6 body; text scales with the system; every touch
target at least 44 × 44; no copy, topic, profession or author written in code; no invented proof;
shared files are edited additively.

**Scale/Scope**: 5 screens, 4 cubits, 7 use cases, about 12 widgets, 1 route module, about 40 ARB keys.

## Constitution Check

| Principle | Status | How |
|---|---|---|
| I. Spec-driven | Pass | spec, then this plan, tasks, analyze, implement. |
| II. Performance budgets | Pass | App feature; the web budgets are untouched. One request per screen; list pages are 12 items. |
| III. Test-first | Pass | Each task lists its tests first; scenario ids in [quickstart.md](quickstart.md). |
| IV. Content in the CMS | Pass | Guides, topics, authors, pages, legal text and the call-to-brief copy come from the API. Only interface labels are ARB strings (FR-042). |
| V. Modular | Pass | Everything in `features/content/` plus a route file; cross-feature use only of `core/`. App reads product data only through `/api/mobile/v1`. |
| VI. Accessible, bilingual, themed | Pass | Headings announced, toggled/expanded states, 44 px targets, RTL start/end, English fallback laid out LTR with a notice, light and dark by tokens. |
| VII. Secure by default | Pass | Rich text is a closed node tree, never markup; links go through one `resolveLink` rule that refuses unsafe schemes. No sign-in, no payment. |
| VIII. Simplicity | Pass with note | No new package. Two small abstractions justified in Complexity Tracking. |
| IX. Designed, not generated | Pass | Built from boards 33–36 and 38 with catalogue widgets; the fidelity check proves it; one primary action per screen; no proof invented. |
| Stack (mobile, constitution 1.4.0) | Pass | cubits, get_it, ARB (en, ar), exact-pinned packages (none added), `dart format`, `flutter analyze`, 80 % of changed code. |

Post-design re-check: unchanged (Pass).

### Complexity Tracking

| Addition | Why | Simpler option rejected |
|---|---|---|
| `PathStatusRepository` (one `GET resolve` read) in `features/content` | Only `resolve` can say "removed" rather than "not found" (FR-030/031); 008's links feature (US5) is not on this branch's base and builds the same call. | Treat every 404 as removed: breaks FR-031. Wait for 008 US5: blocks 38. When `features/links` lands, replace this class' body by a call to it (one file, one test). |
| Feature-local `ContentIcons` | The core icon enum is shared and every sibling feature appends to it, so a merge conflict is certain. | Adding to `ShootIcons`: conflicts with 010–014. Moving them to core later is mechanical. |

## Project Structure

### Documentation (this feature)

```text
specs/015-mobile-content/
├── spec.md
├── plan.md              # this file
├── research.md          # decisions R1–R9
├── data-model.md        # entities used, states, derived values
├── quickstart.md        # how to verify; scenario to test mapping
├── contracts/
│   └── screens.md       # routes, screen anatomy per board, a11y names, strings
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code

```text
apps/mobile/lib/features/content/
├── content_injection.dart                  # + use cases, path-status repository, cubit factories
├── domain/
│   ├── entities/{guides,legal,editor_page}.dart   # existing (008)
│   ├── entities/path_status.dart                  # PathStatus { page, removed, notFound }
│   ├── legal_sections.dart                        # tocOf(RichTextDocument) -> LegalSection list
│   ├── link_target.dart                           # resolveLink(href, hasAppRoute) -> InApp | External
│   ├── repositories/content_repository.dart       # existing
│   ├── repositories/path_status_repository.dart
│   └── usecases/{get_guides,get_article,get_page,get_legal,get_legal_versions,
│                 get_legal_version,check_path,open_whatsapp}.dart
├── data/
│   ├── datasources/path_status_remote_data_source.dart
│   └── repositories/path_status_repository_impl.dart
└── presentation/
    ├── cubit/{content_state,guides_cubit,article_cubit,editor_page_cubit,legal_cubit}.dart
    ├── content_routes.dart                         # contentRoutes(), editorPageRoute()
    ├── pages/{guides_page,article_page,editor_page_screen,legal_page,
    │          legal_versions_page,removed_page}.dart
    └── widgets/{rich_text_view,guide_row,ready_to_brief_band,content_header,
                 page_nav,faq_list,steps_list,legal_toc,content_icons,
                 english_notice,content_loading}.dart

apps/mobile/lib/core/routing/app_routes.dart     # flip the 015 entries to built, real legal paths
apps/mobile/lib/core/di/injection.dart           # unchanged (registerContentFeature already called)
apps/mobile/lib/app.dart                         # + contentRoutes() and editorPageRoute() last
apps/mobile/lib/core/l10n/arb/app_{en,ar}.arb    # + content strings (one contiguous block)
specs/design-system/canvas/strings.ar/           # + S10b, S11, S11b, S12, S13 Arabic board strings
apps/mobile/test/features/content/...            # tests mirror lib
apps/mobile/test/goldens/screens/{33,34,35,36,38}_*_golden_test.dart (+ goldens/)
apps/mobile/test/core/l10n/board_strings_test.dart   # + the five boards
tools/design-fidelity/shipped.json                   # + "015-mobile-content"
```

**Structure Decision**: extend `features/content/` (it already owns the data layer) rather than create
`features/guides`, `features/legal` and `features/pages`; the three share rich text, the call-to-brief
band, link handling and loading/missing states.
