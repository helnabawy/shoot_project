# Contract: website routes and actions (023)

## Routing

| Request | Session | Result |
|---|---|---|
| `GET /` or `/ar` | no cookie, or token without `accountType: 'provider'` | the static landing, unchanged |
| `GET /` or `/ar` | token says `provider` | the creator home; the address stays `/` or `/ar` |
| `GET /?view=client` or `/ar?view=client` | any | the static landing (the creator's way to the client page) |
| `GET /creator-home` or `/ar/creator-home` | verified provider | the creator home (`noindex`) |
| same | anyone else | redirect to `/` or `/ar` |
| swapped request whose session turns out not to be a provider | — | the landing content, rendered by the route; no redirect |

The proxy decides from the token's payload without verifying it and without a database call. The route
verifies the session. `x-pathname` keeps the path the visitor asked for.

Caching: the creator home's response is `Cache-Control: private, no-store`. The landing's caching
headers are unchanged, and a browser must not show a stored landing at `/` to a member who has just
signed in as a creator (checked end to end).

## Page states

| State | Shown |
|---|---|
| live, queue not empty | identity, three counts, card with position, Accept and Decline, the note, up to 5 "Next" rows, a "See all" row beyond that, next shoot (if any), Manage |
| live, queue empty | "You are up to date" in place of the card; no Accept or Decline |
| incomplete | status "Not live yet", the missing steps, primary action "Finish my profile" → `/account/profile`; no counts, no queue |
| review | status "In review", the review message, no primary action |
| paused (paused or suspended) | the status and message the profile rules define; no queue, no primary action |
| answer refused | the card of the next request plus the "no longer open" message |
| answer not sent | a failed submission records nothing; the request is the card again when the page is next shown (FR-020). No client-side retry UI on the website |

Messages arrive as a problem code in the query the existing way (`?error=<message key>`), rendered in
an `aria-live` region.

## Server actions (`modules/creator-home/actions.ts`)

Both take a `FormData`, require a signed-in provider, call the existing command, revalidate `/`,
`/account`, `/account/bookings` and `/account/inbox`, and return to the home.

| Action | Fields | Calls |
|---|---|---|
| `answerBookingFromHome` | `locale`, `ref`, `decision` (`confirm` \| `decline`), `reason?` | `answerRequest` |
| `answerBriefFromHome` | `locale`, `ref`, `persona`, `decision` (`accept` \| `reject`), `reason?`, `note?` | `answerBrief` with `onAccepted` |

Accept is a one-button form. Decline opens the decline step (a disclosure that works without
JavaScript) holding the existing reason fields for that kind and its own submit.

## Links

| Element | Target |
|---|---|
| To answer | `#answer` |
| Coming up, Completed, Bookings | `/account/bookings` |
| "See all" under the Next rows | `/account/inbox` when any hidden item is a brief, otherwise `/account/bookings` |
| Next shoot | `/account/bookings/{ref}` |
| Availability | `/account/availability` |
| My profile | `/account/profile` |
| Menu row "Book a shoot" (providers only) | `/?view=client` |
| Menu row "Creator home" (providers only) | `/creator-home` (covers a session whose token predates the account-type hint) |
