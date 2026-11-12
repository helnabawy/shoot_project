# Quickstart: verifying feature 015

Prerequisites: Node 24 (`nvm use`) for the web checks, Flutter 3.47.9 on macOS for goldens.

```bash
cd apps/mobile
dart format --set-exit-if-changed lib test
flutter analyze
flutter test --coverage test/features/content test/core/l10n test/core/routing   # logic, widgets, strings
tool/goldens.sh test/goldens/screens/33_guides_golden_test.dart                  # also 34, 35, 36, 38
cd ../.. && pnpm fidelity                                                        # needs Playwright browsers
pnpm check:scenarios                                                             # every MG- id has a test
```

Manual (staging or `pnpm dev` + the app pointed at it): publish Terms v1 and v2, a future v3, three
articles in two topics (one future-dated), a "How it works" page; delete a page; open each address.

## Scenario to test map

| Scenario | Test (file under `apps/mobile/test/`) |
|---|---|
| MG-US1-S1..S2 | `features/content/presentation/pages/legal_page_test.dart`, golden 36 |
| MG-US1-S3 | `legal_page_test.dart` (tap a row scrolls; heading semantics) |
| MG-US1-S4 | `legal_cubit_test.dart`, `legal_page_test.dart` (upcoming line) |
| MG-US1-S5 | `legal_versions_page_test.dart` |
| MG-US1-S6 | `legal_page_test.dart` (Arabic fallback, LTR body, notice) |
| MG-US1-S7 | `domain/legal_sections_test.dart` |
| MG-US2-S1..S2 | `guides_page_test.dart`, `guides_cubit_test.dart`, golden 33 |
| MG-US2-S3 | `guides_page_test.dart` (the server omits it; list and More guides render only what is sent), `article_cubit_test.dart` (404 not removed -> 37) |
| MG-US2-S4 | `article_page_test.dart`, golden 34 |
| MG-US2-S5 | `domain/link_target_test.dart`, `rich_text_view_test.dart` |
| MG-US2-S6 | `article_page_test.dart` (English fallback in Arabic) |
| MG-US2-S7..S8 | `guides_page_test.dart`, `ready_to_brief_band_test.dart` |
| MG-US3-S1..S3 | `editor_page_screen_test.dart`, golden 35 |
| MG-US3-S4 | `editor_page_screen_test.dart` (skipped types, fallback row) |
| MG-US3-S5 | `editor_page_cubit_test.dart` (404 + notFound -> 37) |
| MG-US3-S6 | `content_cubits_reload_test.dart` (reload on open, no cache) |
| MG-US3-S7 | `editor_page_cubit_test.dart` (answer's `path` differs: router replaces) |
| MG-US4-S1..S3 | `removed_page_test.dart`, `check_path_test.dart`, golden 38 |

Server-driven scenarios (S4 of US1, S3 of US2, S6/S7 of US3) are decided by the API (008); the app side
is that it shows exactly what the answer says and reloads on every open.
