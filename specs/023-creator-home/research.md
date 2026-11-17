# Research: Creator home (023)

Findings from the code on `feat/phone-country-code` (2026-11-17) and the decisions they lead to.

## R1. Showing the creator home at `/` without slowing the landing

**Found**: the landing (`apps/web/src/app/(site)/[locale]/page.tsx`) is statically generated per locale
(`generateStaticParams` in the layout, revalidated by tag). Reading the session in it would make it
dynamic for every visitor and break SC-005 and Principle II. `proxy.ts` already runs on `/` and `/ar`
before the cache. The session cookie is Payload's JWT (`payload-token`); today it carries `roles` only
(`saveToJWT`), not `accountType`.

**Decision**: route in `proxy.ts`. Add `saveToJWT: true` to `users.accountType`. For a request whose
path is exactly `/` or `/ar`, the proxy decodes the JWT payload (no verification, a routing hint only)
and, when `accountType === 'provider'`, hands next-intl a request for `/creator-home` (or
`/ar/creator-home`) instead, so the address bar keeps `/`. The new dynamic route
`(site)/[locale]/creator-home/page.tsx` verifies the session with `getCurrentUser()`.

- The route is the security boundary, never the hint. A forged or stale hint reaches a page that checks
  the real user.
- Not a provider on that route: when the request came through the rewrite (`x-pathname` is `/` or
  `/ar`) it renders the landing content itself (no redirect, so no loop); on a direct visit to
  `/creator-home` it redirects to `/`.
- `x-pathname` keeps the original path, as today.
- The route sets `robots: noindex` and has no `alternates`.

**Rationale**: guests and clients keep the static landing byte for byte; creators pay one dynamic render.
No schema change (`saveToJWT` only changes the token), no new cookie to keep in step with the session.

**Alternatives considered**: reading the session in the landing page (breaks the static landing);
a separate hint cookie set at sign-in and cleared at sign-out (a second thing to keep in step, and two
sign-in paths plus `/admin` to cover); a client-side redirect from the landing (flash of the wrong page,
extra JS on the landing); redirecting creators to `/account` (the owner asked for the home, and Up next
stays unchanged).

**Consequence to accept**: a creator signed in before this ships has a token without `accountType` and
sees the landing until their token is next issued (sign-in or refresh). Task: check whether the web
session refreshes its token on use; if it does not, the creator home's own link in the menu covers the
gap (FR-003 gives the menu a "Creator home" row for providers).

**To prove in e2e**: next-intl's `as-needed` prefix still resolves the swapped path for English, and the
static landing is still served from cache for a guest (response header check).

## R2. The queue and its rules

**Found**: booking requests waiting for a creator come from `requestsOf` / `bookingsView` in
`modules/booking/commands/creator.ts` (`waiting`: `answer === 'pending' && state === 'accepted' &&
respondBy !== null`, sorted by `respondBy`). Open matching briefs come from `creatorInbox(ctx, userId)`
in `modules/inbox/queries.ts` (`open`, `null` when the profile is not live). Both are already scoped to
the caller.

**Decision**: one pure function in `packages/domain/src/account/creator-home.ts`:
`buildQueue(waiting, openBriefs)` returns booking items (by `respondBy` ascending) followed by brief
items (by `sentAt` descending); `homeCounts(...)`; `homeMode(profileStatus)` (`live` | `incomplete` |
`review` | `paused`); `NEXT_LIMIT = 5`. No new matching or booking rule (FR-009).

**Alternatives considered**: building the queue in each client (two implementations of the order);
a new stored "task" entity (nothing new needs storing).

## R3. Answering from the home

**Found**: the API answers a booking through the command `answerRequest(ctx, ref, { decision, reason })`
and a brief through `answerBrief(actor, ref, body, onAccepted)`. The website's booking form still uses
the server action `respondToAssignment`, which holds its own copy of the logic and redirects to
`/account/bookings`; the inbox action `answerBriefAction` already calls the command.

**Decision**: the home adds two thin server actions in `modules/creator-home/actions.ts`:
`answerBookingFromHome` calls `answerRequest`, `answerBriefFromHome` calls `answerBrief` with
`onAccepted`. Both revalidate `/`, `/account`, `/account/bookings`, `/account/inbox` and return to `/`
with the problem code when there is one. `respondToAssignment` is left as it is in this feature (moving
it onto the command is a separate clean-up; noted in tasks as optional). The app calls the existing
endpoints `creatorBookingAnswer` and `answerCreatorBrief`, then reloads the home.

**Check before coding**: `answerRequest` and `respondToAssignment` must give the same result for
confirm (date blocked, `date-taken` lapse) and decline; an integration test compares them on one
fixture. If they differ, the difference is fixed in the command, not copied into the home.

## R4. Decline with the optional reason (clarified 2026-11-17)

**Found**: a brief's reject form is `modules/inbox/components` (RejectForm: reasons from the option set
`brief-reject-reasons`, optional note); a booking's decline takes a free-text `reason` (max 200) on
`/account/bookings`. The app has `features/creator_account/presentation/widgets/reject_sheet.dart`.

**Decision**: Decline on the card opens the existing step for that kind. Website: a native
`<details>`-style disclosure under the card (works without JavaScript) holding the brief's RejectForm or
the booking's reason field, with "Decline" as its submit and "Back" to close. App: the existing reject
sheet for a brief; for a booking the same sheet shape with one optional text field. No new reasons
content.

## R5. What a queue item needs that the API does not give yet

**Found**: `bookingRequestV1` has `occasion` (in fact the brief sentence), `emirate`, `date`,
`profession`, `client`, `respondBy`; no start time and no length. `Booking` stores `startTime` and
`duration` (an option slug, set `DURATION_SET`). `briefItemV1` has `occasion`, `emirate`, `date`,
`profession`, `sentAt`.

**Decision**: a home-specific item shape (`homeItemV1`, see contracts) that carries, for both kinds,
`occasion` and `emirate` as content words for the title ("{occasion} in {emirate}", from a message key;
falls back to the profession when the brief has no occasion), and for a booking `time` and `length`
(the duration option's label in the request language), both nullable. The existing shapes are not
changed. The client's name stays first name plus initial, produced on the server (FR-026).

## R6. Counts, next shoot and today's availability

- **To answer** = queue length. **Coming up** = `upcoming.length`. **Completed** = `done.length`, all
  time (clarified). `requestsOf` reads every booking assigned to the creator; if it is capped, Completed
  uses a count query instead (task: check the cap).
- **Next shoot** = `upcoming[0]` with `paid`; hidden when empty.
- **Availability today** = from `creatorAvailability`'s days: `blocked` or `booked` → "Busy today",
  otherwise "Free today". Today is the business day (Asia/Dubai), as `AvailabilityV1.today` already is.
- Count links: To answer → `#answer` on the home; Coming up and Completed → `/account/bookings`.

## R7. The app's first screen

**Found**: `createAppRouter` starts at `AppRoutes.home`; its `redirect` already runs the first-run
welcome, the `/ar` strip and `authRedirect(uri, session.state)`, and re-runs when the session changes.
`Session.accountType` is `seeker | provider | unknown`.

**Decision**: no new path. The `/` route's builder shows `CreatorHomePage` when the session is signed in
with `accountType == provider`, otherwise `LandingPage`. For FR-003 both menus gain one row for creators,
"Book a shoot", that opens the client landing at `/?view=client` on both: the website's proxy leaves
that request alone (it skips the swap when the query is present), and the app's `/` builder shows
`LandingPage` when the query is present, so app paths keep mirroring the website's. The landing page never reads the query, so it stays static. First-run welcome and deep links
are untouched (FR-005).

**Alternatives considered**: a redirect from `/` to `/home` in the app (changes the path deep links and
the web mirror agree on).

## R8. Design import and fidelity

The three boards are on the Shoot design canvas as 64 to 66 (`S14-creator-home`,
`S14b-creator-home-clear`, `S14-creator-home-ar`). Before any app screen: re-export the canvas into
`specs/design-system/canvas/`, add manifest entries (ids 64, 65; the Arabic dark board 66 validates the
derived `ar-dark` variant of 64), boxes `.hd`, `.wm`, `.top`, `.stats`, `.panel`. Thresholds: default
0.01. The not-live home gets its own board, 67 (`S14c-creator-home-not-live`), drawn in the same style
from the step panel of boards 27 and 28 under the new identity row, approved by the owner and added to
the manifest before the app builds that state. The booking's decline step reuses the reject sheet's
layout (board 07f) with one optional field; it is proved by widget test, not by pixel diff.

Imported 2026-11-17 (canvas `1794950460-927b`). The pixel-diff renderer stubs `support.js`, so a
board is plain HTML to it, and a board that fills itself from a script renders its placeholders and
every branch. Decision (owner, 2026-11-17): static copies on the canvas. 64 and 67 are stills of their
first state (64: the booking request as the card, "1 of 3"; 67: not live, 3 of 5 steps); their working
versions are the "Play · …" boards in the row below, which `build-manifest.mjs` skips. A change to
either copy is made to both. Boards 07, 28 and 31 of earlier features still rely on the runtime.

The website needs a surface brief (`.impeccable/surfaces/creator-home.md`) before any component is
written (constitution IX); it is derived from boards 64 to 67 and `account-home.md`.

The website builds the same layout in "The Brief Bar" tokens, at the account column width (560 px) from
768 px up.

## R9. Feature 022 (creator offers)

Not on this branch. If it merges first: a brief item gains the client's price and "Accept" sends the
offer at that price; the home's item shape gets the additive fields 022 defines and the note under the
buttons changes. The queue, order, counts and the two actions are unaffected. Tasks carry one item to
re-read this section against 022 before implementation starts.

## R10. Refresh

Website: the route is `force-dynamic`; actions revalidate. App: the cubit loads on open, on app resume
and on pull to refresh, and after each answer. A push for a new request already opens its own page; when
the home is in front the app reloads it on the push (uses the existing `core/push` tap/foreground hook).
No socket, no polling.
