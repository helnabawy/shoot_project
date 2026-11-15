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

**Since the 2026-11-15 amendment** (defaults): signed out, send a brief: step 2 at once. Pick a creator,
step 3, give a name and number: the quotation opens. Under Accept a line says a code comes next. Tap
Accept: "Log in to accept your quotation". Enter a new number and the code (`pnpm --filter web otp:last`):
no client-or-creator question; you are back on the quotation; tap Accept: accepted, and the booking is in
`/account/bookings`. In the app, open that quotation's link signed out and tap Accept: the number screen
says signing in accepts it; after the code you are back on the quotation. Steps 1–6 below need "Briefs
need sign-in" turned on in the site settings.


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
| BS-US1-S1 | Guest's complete brief: nothing recorded, kept, sign-in screen with the sentence | `brief-sign-in.int.test.ts`, `BriefBuilder.signin.test.tsx`, `forms.brief.test.tsx`, `bs-brief-sign-in.spec.ts` |
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
| BS-US4-S1 | App: signed-out send opens sign-in, nothing recorded | `brief_cubit_sign_in_test.dart`, `landing_sign_in_test.dart`, `brief_builder_sign_in_test.dart`, `number_page_brief_test.dart` |
| BS-US4-S2 | App: after sign-in the brief is sent and step 2 opens | `brief_cubit_sign_in_test.dart`, `landing_sign_in_test.dart` |
| BS-US4-S3 | App: new number from the brief becomes a client, no role question | `sign_in_flow_brief_test.dart` |
| BS-US4-S4 | App: leaving sign-in keeps the brief and sends nothing later | `brief_cubit_sign_in_test.dart`, `landing_sign_in_test.dart` |
| BS-US4-S5 | App: signed-in member records at once | `brief_cubit_sign_in_test.dart` |
| BS-US5-S1 | Website: signed-in member records at once | `brief-sign-in.int.test.ts` |
| BS-US5-S2 | Guest line under the action, never for members; WhatsApp stays open | `BriefBuilder.signin.test.tsx`, `landing_sign_in_test.dart` |
| BS-US5-S3 | Switch off: guests record as before (web and app) | `brief-sign-in.int.test.ts`, `mobile-api-brief.int.test.ts`, `brief_cubit_sign_in_test.dart` |
| BS-US5-S4 | Switch on: a request with no member is refused, nothing recorded | `mobile-api-brief.int.test.ts`, `brief-sign-in.int.test.ts` |
| BS-US6-S1 | Default settings: a guest's brief is recorded at once and goes to step 2, no guest line | `accept-sign-in.int.test.ts`, `BriefBuilder.signin.test.tsx` |
| BS-US6-S2 | App: a guest's brief is recorded and step 2 opens, no sign-in screen | `brief_cubit_sign_in_test.dart` |
| BS-US6-S3 | Website step 3 issues a guest's quotation with no sign-in; the booking has no member | `accept-sign-in.int.test.ts` |
| BS-US6-S4 | Fresh settings: "Briefs need sign-in" is off | `accept-sign-in.int.test.ts` |
| BS-US7-S1 | Guest line under Accept; none for members | `BookingStatus.test.tsx` |
| BS-US7-S2 | Guest taps Accept: login with `for=accept`, booking unchanged | `accept-sign-in.int.test.ts` |
| BS-US7-S3 | Code with the accept intent: new number is a client (no role question), back on the quotation | `accept-sign-in.int.test.ts`, `forms.brief.test.tsx` |
| BS-US7-S4 | One tap accepts; booking and brief belong to the member | `accept-sign-in.int.test.ts`, `claim.test.ts` |
| BS-US7-S5 | Another member's quotation is not accepted | `accept-sign-in.int.test.ts`, `claim.test.ts` |
| BS-US7-S6 | A member accepts their own quotation at once | `accept-sign-in.int.test.ts`, `claim.test.ts` |
| BS-US8-S1 | Accept without a member is refused (401 on the API), nothing changes | `accept-sign-in.int.test.ts`, `claim.test.ts` |
| BS-US8-S2 | App: Accept while signed out opens sign-in with the accept line | `booking_view_cubit_sign_in_test.dart`, `booking_page_sign_in_test.dart`, `number_page_accept_test.dart` |
| BS-US8-S3 | App: after sign-in, back on the quotation; new number is a client | `sign_in_flow_accept_test.dart`, `booking_page_sign_in_test.dart` |
| BS-US8-S4 | Another member's booking: 409 `booking.errors.otherAccount` | `accept-sign-in.int.test.ts`, `booking_view_cubit_sign_in_test.dart` |
