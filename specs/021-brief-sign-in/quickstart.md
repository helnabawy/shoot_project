# Quickstart: Sign in to send a brief (021)

Run everything against a **local** database only. `apps/web/.env` points at the production database:
override `DATABASE_URI=postgres://shoot:shoot@127.0.0.1:5432/<scratch db>` and `BLOB_READ_WRITE_TOKEN=`
for every local command, and never run `pnpm seed` against production. Integration suites start their
own Testcontainers database.

## Prerequisites

```bash
nvm use
docker compose up -d postgres
pnpm install
DATABASE_URI=postgres://shoot:shoot@127.0.0.1:5432/shoot_021 pnpm db:migrate   # applies <ts>_brief_sign_in
DATABASE_URI=postgres://shoot:shoot@127.0.0.1:5432/shoot_021 BLOB_READ_WRITE_TOKEN= pnpm seed
DATABASE_URI=… BLOB_READ_WRITE_TOKEN= OTP_PROVIDER=console pnpm --filter web dev --port 3021
```

## Walkthrough

1. Signed out, open `http://localhost:3021/`, finish the brief. Under "Find my match" a line says the
   next step sends a code to your mobile number. Tap it: `/login?next=/brief/send&for=brief` shows
   "Sign in to send your brief" and the sentence.
2. Press back: the brief is still finished. Send it again, enter a new UAE number, read the code with
   `pnpm --filter web otp:last`, enter it: no client-or-creator question; you land on step 2. In
   `/admin/collections/briefs` the brief's member is the new client.
3. Repeat in `/ar` (Arabic, RTL) and in dark mode; repeat on `/book/<code>` and `/hire/<slug>`.
4. Signed in, send a brief: step 2 at once, no line under the action.
5. In `/admin/globals/site-settings` turn "Briefs need sign-in" off: a guest's brief goes straight to
   step 2 as before.
6. App (`apps/mobile`, `--dart-define=API_BASE_URL=http://localhost:3021`): signed out, finish the
   brief bar and send: the number screen says signing in sends your brief; sign in; step 2 opens. Back
   out of sign-in instead: the bar keeps its answers.

## Checks

```bash
pnpm typecheck && pnpm lint && pnpm test
pnpm check:scenarios
cd apps/mobile && dart format --set-exit-if-changed lib test && flutter analyze && flutter test
```

## Scenario → test mapping

| Id | Scenario | Tests |
|---|---|---|
| BS-US1-S1 | Guest's complete brief: nothing recorded, kept, sign-in screen with the sentence | `brief-sign-in.int.test.ts`, `BriefBuilder.signin.test.tsx`, `KeptBrief.test.tsx`, `bs-brief-sign-in.spec.ts` |
| BS-US1-S2 | Right code: brief recorded once for the member, step 2 (WhatsApp with Quick Match off) | `brief-sign-in.int.test.ts`, `bs-brief-sign-in.spec.ts` |
| BS-US1-S3 | Creator, pick and source page survive the round trip | `brief-sign-in.int.test.ts` |
| BS-US1-S4 | Invalid brief: today's messages, no sign-in | `brief-sign-in.int.test.ts` |
| BS-US1-S5 | Without JavaScript the round trip works | `brief-sign-in.int.test.ts` |
| BS-US2-S1 | New number from a brief: no role question, client account owns the brief | `brief-sign-in.int.test.ts`, `forms.brief.test.tsx` |
| BS-US2-S2 | Sign-in not from a brief still asks the role and sends no kept brief (FR-010) | `brief-sign-in.int.test.ts`, `forms.brief.test.tsx` |
| BS-US3-S1 | Back from sign-in: the brief shows every answer | `kept.test.ts`, `BriefBuilder.signin.test.tsx` |
| BS-US3-S2 | Kept brief invalid after sign-in: nothing recorded, back to the brief with the message | `brief-sign-in.int.test.ts`, `BriefBuilder.signin.test.tsx` |
| BS-US3-S3 | Kept brief older than an hour: ordinary sign-in, not sent | `kept.test.ts`, `brief-sign-in.int.test.ts` |
| BS-US3-S4 | Sent brief is no longer kept | `brief-sign-in.int.test.ts`, `BriefBuilder.signin.test.tsx` |
| BS-US4-S1 | App: signed-out send opens sign-in, nothing recorded | `brief_cubit_sign_in_test.dart`, `landing_sign_in_test.dart`, `brief_builder_sign_in_test.dart` |
| BS-US4-S2 | App: after sign-in the brief is sent and step 2 opens | `brief_cubit_sign_in_test.dart`, `landing_sign_in_test.dart` |
| BS-US4-S3 | App: new number from the brief becomes a client, no role question | `sign_in_flow_brief_test.dart` |
| BS-US4-S4 | App: leaving sign-in keeps the brief and sends nothing later | `brief_cubit_sign_in_test.dart`, `landing_sign_in_test.dart` |
| BS-US4-S5 | App: signed-in member records at once | `brief_cubit_sign_in_test.dart` |
| BS-US5-S1 | Website: signed-in member records at once | `brief-sign-in.int.test.ts` |
| BS-US5-S2 | Guest line under the action, never for members; WhatsApp stays open | `BriefBuilder.signin.test.tsx`, `brief_bar_sign_in_test.dart` |
| BS-US5-S3 | Switch off: guests record as before (web and app) | `brief-sign-in.int.test.ts`, `mobile-api-brief.int.test.ts`, `brief_cubit_sign_in_test.dart` |
| BS-US5-S4 | Switch on: a request with no member is refused, nothing recorded | `mobile-api-brief.int.test.ts`, `brief-sign-in.int.test.ts` |
