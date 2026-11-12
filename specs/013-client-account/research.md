# Research: Mobile client account

**R1 Endpoints.** Decision: `GET me/account`, `GET me/bookings?page`, `GET me/briefs?page`, `PATCH me`
(name, email, `finishShown`). Rationale: one round trip for screen 24; lists page; one write for 25.
Rejected: the website's server actions (not an API); one fat `me` (it is cached in the session and must stay small).

**R2 Booking pages are 012's.** Rows carry `reference`; the app opens `/account/bookings/:ref` (route
table owner "013, 014"). 013 registers a stub destination (`BookingDestination` builder passed to
`accountRoutes`) until 012 supplies the quotation and booking screens. 013 duplicates no booking command.

**R3 Server-computed rules.** Up next, status keys, upcoming/past (business day via `dubaiToday`) and the
finish checklist are pure functions in `packages/domain/src/account/` (100 % coverage), in FR-003's order:
quotation to accept (soonest `quoteValidUntil`), delivery to confirm, awaiting payment, declined by the professional.

**R4 Finish shown once.** Server field `users.accountFinishDismissedAt`; `finish.autoOpen` is true when the
client has at least one booking and the field is empty. The app sets it (`PATCH me {finishShown:true}`) the
moment 25 is displayed, so it opens on its own exactly once (FR-020, SC-003); "Later" just leaves. A device
flag was rejected: a second device would show it again.

**R5 Email.** Format-checked (zod) and checked for use by another account; `account.errors.emailInvalid`,
`account.errors.emailInUse`; no confirmation step (spec assumption). **Name** 2-80 (`account.errors.nameLength`).

**R6 Language and theme** are device preferences (006): no endpoint; the row status ("English · auto") is
built in the app from `LocaleCubit` and `ThemeModeCubit`.

**R7 Account removal (FR-031)** stays NEEDS CLARIFICATION: an owner decision. Not implemented; US4-S3 open.
Suggestion: a Settings-tab row; deletion refused while a booking is in progress, else details removed and
bookings anonymised.

**R8 Log out** = `SessionCubit` sign-out (009) then `go('/')`; account cubits are created per route and hold nothing after.

**R9 Creator on /account**: `accountType == provider` is redirected to `/account/profile` when 014 has built it.
`me/account` answers 404 `api.errors.notFound` to a creator account.

**R10 Goldens.** Three screens x four variants plus app-owned baselines, through `tool/goldens.sh` (macOS, pinned
Flutter). Fidelity against the canvas stays open if the pipeline is not green.
