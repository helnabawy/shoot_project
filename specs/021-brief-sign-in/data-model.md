# Data model: Sign in to send a brief (021)

## Site settings (global `site-settings`, existing) — one new field

| Field | Type | Default | Notes |
|---|---|---|---|
| `briefNeedsSignIn` | checkbox | `false` (was `true` until the 2026-11-15 amendment; migration `brief_sign_in_off` sets the default and the live value to false) | "Briefs need sign-in". On: recording a brief needs a signed-in member on every channel. Off: today's behaviour. Not localized. Migration `<ts>_brief_sign_in` adds `brief_needs_sign_in boolean default true`. |

## Kept brief (website cookie `shoot-brief`; app memory) — not a record

| Field | Type | Rule |
|---|---|---|
| `v` | `1` | format version; other values are ignored |
| `at` | ISO time | when it was kept; stale after 60 minutes (`isFresh`) |
| `path` | string | the builder's `sourcePath` (`/`, `/book/…`, `/hire/…`), ≤ 200 chars, starts with `/` |
| `locale` | `en` \| `ar` | the page language |
| `sentence` | string | the composed sentence, for the sign-in screen only (never trusted) |
| `entries` | `[name, value][]` | only slot tokens, `<token>__custom`, `creator`, `pick`; ≤ 40 entries, values ≤ 200 chars |
| `error` | `{ errors: Record<string,string>, formError?: string }` | set by `GET /brief/send` when the brief could not be recorded |

Encoded as base64url JSON, ≤ 3 KB (longer is not kept: the guest gets today's generic error). Never holds a number, code, token or session (FR-017). Cleared when the brief is recorded.

App: the existing `BriefDraft` in the singleton `BriefCubit`, plus `awaitingSignIn` (bool) and the one-shot `signInNeeded` (bool) in `BriefState`.

## Pending sign-in (cookie `shoot-otp`, existing, 009) — one new field

| Field | Type | Default | Notes |
|---|---|---|---|
| `intent` | `'none'` \| `'brief'` | `'none'` | `brief`: no role question; a new number becomes a client |

## Brief (collection `briefs`, existing)

No schema change. While the switch is on every new brief has `member` set (the hook already sets it from the signed-in user).

## Mobile API v1 (additive)

- `briefBuilderV1.signInRequired?: boolean` (always sent by the server).
- Problem code `brief.errors.signInRequired` (401) on `POST briefs`.

## Booking (collection `bookings`, existing, 003) — amendment, no schema change

`member` is set by the accept transition when a signed-in member accepts a booking that has none; the
brief's `member` is set at the same time when it has none. A booking with another member is never
re-assigned. The client's step 3 name and WhatsApp number (`client`) are unchanged by the claim.

Rule (`packages/domain/src/booking/claim.ts`): `claimFor({ bookingMember, briefMember, userId })` →
`{ ok: false, reason: 'signInRequired' }` (no user) | `{ ok: false, reason: 'otherAccount' }` (booking
of another member) | `{ ok: true, claimBooking: boolean, claimBrief: boolean }`.
