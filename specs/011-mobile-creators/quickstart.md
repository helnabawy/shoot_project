# Quickstart: Mobile creators

1. `nvm use`; `docker compose up -d postgres`; `pnpm db:migrate && pnpm seed && pnpm dev`.
2. In `apps/mobile`: `flutter run --dart-define=API_BASE_URL=http://localhost:3000` (see README).
3. Scenarios (each has a test named with its id; `pnpm check:scenarios`):
   - MC-US1: `/creators/SH-0087`: sections, WhatsApp, share, viewer; unlisted gives screen 37.
   - MC-US2: "Book with ...", answer the brief, continue: WhatsApp opens with the message.
   - MC-US3: filter, "Show more", back keeps filters.
   - MC-US4: `/work/weddings`: counts, emirate chip, "See all n".
   - MC-US5: `/hire/<slug>`: presets filled, change one, questions expand.
4. Checks (also see the mapping below) in `apps/mobile`: `dart format --set-exit-if-changed lib test`, `flutter analyze`,
   `flutter test`, `tool/goldens.sh`; at the root `pnpm fidelity`, `pnpm check:scenarios`.

## Scenario → test mapping (Principle III)

Test names start with the id in the first column. Paths are under `apps/mobile/`. P = `test/features/creators/presentation/pages/`, C = `test/features/creators/presentation/cubit/creators_cubits_test.dart`, R = `test/features/creators/presentation/creators_routes_test.dart`, D = `test/features/creators/domain/brief/brief_rules_test.dart`.

| Id | Layer | Test file |
|----|-------|-----------|
| MC-US1-S1 profile shows photo or scene tile, name, code, facts, primary action | widget, cubit | `test/features/creators/presentation/pages/profile_book_pages_test.dart` `test/features/creators/presentation/cubit/creators_cubits_test.dart` |
| MC-US1-S2 no verified mark, no ratings | widget | `test/features/creators/presentation/pages/profile_book_pages_test.dart` |
| MC-US1-S3 an unlisted creator shows screen 37 | cubit, routes | `test/features/creators/presentation/cubit/creators_cubits_test.dart` `test/features/creators/presentation/creators_routes_test.dart` |
| MC-US1-S4 samples open in a viewer with swipe; video opens outside | widget | `test/features/creators/presentation/pages/profile_book_pages_test.dart` |
| MC-US1-S5 Ask on WhatsApp | widget | `test/features/creators/presentation/pages/profile_book_pages_test.dart` |
| MC-US1-S6 share | widget | `test/features/creators/presentation/pages/profile_book_pages_test.dart` |
| MC-US1-S7 no samples | widget | `test/features/creators/presentation/pages/profile_book_pages_test.dart` |
| MC-US1-S8 Arabic right to left | widget | `test/features/creators/presentation/pages/profile_book_pages_test.dart` |
| MC-US2-S1 creator card, limited type and place | widget, cubit, domain | `test/features/creators/presentation/pages/profile_book_pages_test.dart` `test/features/creators/presentation/cubit/creators_cubits_test.dart` `test/features/creators/domain/brief/brief_rules_test.dart` |
| MC-US2-S2 one offered type is already in the sentence | widget, domain | `test/features/creators/presentation/pages/profile_book_pages_test.dart` `test/features/creators/domain/brief/brief_rules_test.dart` |
| MC-US2-S3 days the creator is not free cannot be chosen (open: needs the API, research R2) | none yet | |
| MC-US2-S4 a complete brief opens WhatsApp with the creator named | widget, cubit | `test/features/creators/presentation/pages/profile_book_pages_test.dart` `test/features/creators/presentation/cubit/creators_cubits_test.dart` |
| MC-US2-S5 Change keeps the answers | widget, cubit, domain | `test/features/creators/presentation/pages/profile_book_pages_test.dart` `test/features/creators/presentation/cubit/creators_cubits_test.dart` `test/features/creators/domain/brief/brief_rules_test.dart` |
| MC-US2-S6 no account needed hint | widget | `test/features/creators/presentation/pages/profile_book_pages_test.dart` |
| MC-US3-S1 cards in the API order with the count | widget, cubit | `test/features/creators/presentation/pages/directory_specialty_hire_pages_test.dart` `test/features/creators/presentation/cubit/creators_cubits_test.dart` |
| MC-US3-S2 type control from the CMS | widget, cubit | `test/features/creators/presentation/pages/directory_specialty_hire_pages_test.dart` `test/features/creators/presentation/cubit/creators_cubits_test.dart` |
| MC-US3-S3 emirate and occasion chips, More | widget, cubit | `test/features/creators/presentation/pages/directory_specialty_hire_pages_test.dart` `test/features/creators/presentation/cubit/creators_cubits_test.dart` |
| MC-US3-S4 Show more | widget, cubit | `test/features/creators/presentation/pages/directory_specialty_hire_pages_test.dart` `test/features/creators/presentation/cubit/creators_cubits_test.dart` |
| MC-US3-S5 empty state | widget, cubit | `test/features/creators/presentation/pages/directory_specialty_hire_pages_test.dart` `test/features/creators/presentation/cubit/creators_cubits_test.dart` |
| MC-US3-S6 a card is one link announced with its name | widget | `test/features/creators/presentation/pages/directory_specialty_hire_pages_test.dart` |
| MC-US4-S1 specialty page content | widget, cubit | `test/features/creators/presentation/pages/directory_specialty_hire_pages_test.dart` `test/features/creators/presentation/cubit/creators_cubits_test.dart` |
| MC-US4-S2 zero counts left out | widget, cubit | `test/features/creators/presentation/pages/directory_specialty_hire_pages_test.dart` `test/features/creators/presentation/cubit/creators_cubits_test.dart` |
| MC-US4-S3 emirate filter | widget, cubit | `test/features/creators/presentation/pages/directory_specialty_hire_pages_test.dart` `test/features/creators/presentation/cubit/creators_cubits_test.dart` |
| MC-US4-S4 Start a brief | widget | `test/features/creators/presentation/pages/directory_specialty_hire_pages_test.dart` |
| MC-US4-S5 See all | widget | `test/features/creators/presentation/pages/directory_specialty_hire_pages_test.dart` |
| MC-US4-S6 unknown specialty is screen 37 | cubit, routes | `test/features/creators/presentation/cubit/creators_cubits_test.dart` `test/features/creators/presentation/creators_routes_test.dart` |
| MC-US5-S1 presets filled and changeable | widget | `test/features/creators/presentation/pages/directory_specialty_hire_pages_test.dart` |
| MC-US5-S2 an inactive preset leaves its word open | widget, cubit | `test/features/creators/presentation/pages/directory_specialty_hire_pages_test.dart` `test/features/creators/presentation/cubit/creators_cubits_test.dart` |
| MC-US5-S3 up to six creators, See all | widget | `test/features/creators/presentation/pages/directory_specialty_hire_pages_test.dart` |
| MC-US5-S4 questions expand and collapse | widget, cubit | `test/features/creators/presentation/pages/directory_specialty_hire_pages_test.dart` `test/features/creators/presentation/cubit/creators_cubits_test.dart` |
| MC-US5-S5 See who's free records the brief (WhatsApp until 012) | widget | `test/features/creators/presentation/pages/directory_specialty_hire_pages_test.dart` |
| MC-US5-S6 unknown hire page is screen 37 | cubit, routes | `test/features/creators/presentation/cubit/creators_cubits_test.dart` `test/features/creators/presentation/creators_routes_test.dart` |
