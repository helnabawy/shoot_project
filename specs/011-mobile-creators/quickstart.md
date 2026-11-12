# Quickstart: Mobile creators

1. `nvm use`; `docker compose up -d postgres`; `pnpm db:migrate && pnpm seed && pnpm dev`.
2. In `apps/mobile`: `flutter run --dart-define=API_BASE_URL=http://localhost:3000` (see README).
3. Scenarios (each has a test named with its id; `pnpm check:scenarios`):
   - MC-US1: `/creators/SH-0087`: sections, WhatsApp, share, viewer; unlisted gives screen 37.
   - MC-US2: "Book with ...", answer the brief, continue: WhatsApp opens with the message.
   - MC-US3: filter, "Show more", back keeps filters.
   - MC-US4: `/work/weddings`: counts, emirate chip, "See all n".
   - MC-US5: `/hire/<slug>`: presets filled, change one, questions expand.
4. Checks in `apps/mobile`: `dart format --set-exit-if-changed lib test`, `flutter analyze`,
   `flutter test`, `tool/goldens.sh`; at the root `pnpm fidelity`, `pnpm check:scenarios`.
