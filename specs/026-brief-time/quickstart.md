# Quickstart: Start time in the brief (026)

Run against a **local** database only (`apps/web/.env` points at production). Integration tests use
Testcontainers.

## Walkthrough

1. Apply the migration locally (`DATABASE_URI=postgres://…/local pnpm db:migrate`): the site settings
   get the "Start time" tab and an option set "Start times" (07:00–21:00) is created and linked.
2. Open `/` : the brief is exactly as before (switch off).
3. Admin → Site settings → Start time: tick "Ask for a start time", save. Within a minute `/` asks
   "Start time" right after the date; the step count grows by one.
4. Pick a date, then "16:00": the sentence reads "… on Thu 19 Nov at 16:00 for …". Send: the brief in
   the admin shows "Start time 16:00"; the WhatsApp message carries "at 16:00".
5. Start again, choose "any date": no time step, no time in the sentence.
6. Tick "Clients must choose a time": the "any time" row is gone (only with a date).
7. `/ar`: the time reads left to right ("الساعة 16:00").
8. App (`apps/mobile`): the same steps on the landing's brief bar; on step 3 of Quick Match the time
   field starts with the brief's time.
9. Untick the switch: `/` and `GET /api/mobile/v1/brief-builder` are as in step 2.

## Scenario → test mapping

Every scenario is covered by a test whose name starts with its id; `pnpm check:scenarios` checks that each file named here carries it.

| Id | Scenario | Tests |
|---|---|---|
| BT-US1-S1 | Time step after the date, counted | `config.test.ts`, `BriefBuilder.time.test.tsx` |
| BT-US1-S2 | Time token in the sentence, left to right in Arabic | `domain/brief/time.test.ts`, `config.test.ts`, `BriefBuilder.time.test.tsx` |
| BT-US1-S3 | "Any time" skips; a required time must be chosen | `config.test.ts`, `submit.test.ts`, `BriefBuilder.time.test.tsx`, `brief_engine_test.dart` |
| BT-US1-S4 | "Any date" waives the time step and drops a time | `submit.test.ts`, `BriefBuilder.time.test.tsx`, `brief_engine_test.dart`, `brief_bar_test.dart` |
| BT-US1-S5 | The app asks the time the same way (en, ar) | `site.test.ts`, `site_models_test.dart`, `brief_engine_test.dart`, `brief_bar_test.dart` |
| BT-US2-S1 | The brief, its selection, sentence and WhatsApp carry the time; website and app | `domain/brief/time.test.ts`, `submit.test.ts`, `brief-time.int.test.ts`, `brief_data_test.dart` |
| BT-US2-S2 | Step 2 carries the time; step 3 pre-filled; booking `details.startTime` | `booking.test.ts`, `brief-time.int.test.ts`, `book_flow_cubit_test.dart` |
| BT-US3-S1 | Off: everything as before | `domain/brief/time.test.ts`, `config.test.ts`, `submit.test.ts`, `brief-time.int.test.ts` |
| BT-US3-S2 | The owner edits the switch and words in Site settings | `brief-time.int.test.ts` |
