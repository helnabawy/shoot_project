# Research: Sign in to send a brief (021)

## R1 — Where the website keeps the guest's brief

- **Decision**: a first-party cookie `shoot-brief`: base64url JSON `{ v: 1, at, path, locale, sentence, entries, error? }`, `Path=/`, `SameSite=Lax`, `Secure` in production, `Max-Age=3600`, **not** HttpOnly. Written by the server action, read by `GET /brief/send` and by the builder island.
- **Rationale**: the round trip is full-page navigations (`/login` → `/login/code` → server redirect), so in-memory state is gone; the action already sets cookies (`sp_vid`); a cookie needs no JavaScript. The builder must restore answers on static pages, so the browser must be able to read it. Its contents are the visitor's own answers (no number, code, token or session), and the server re-validates everything when it records.
- **Alternatives**: draft collection (Principle VIII: a table for one-hour data); `sessionStorage` (no no-JS path, invisible to the server); HttpOnly cookie plus dynamic pages (loses static caching of `/`, Principle II); answers in the `next` URL (personal data in a URL, Privacy rule; long URLs).

## R2 — How sign-in hands back to the brief

- **Decision**: the action redirects (no JS) or returns `{ status: 'signIn', loginUrl }` (JS) with `loginUrl = /login?next=/brief/send&for=brief` (prefixed `/ar` in Arabic). `PhoneStep` posts `intent=brief`; `requestCodeAction` stores `intent: 'brief'` in the existing HTTP-only `shoot-otp` pending cookie with `next` = `/brief/send` (passes `safeNext`). `verifyCodeAction` redirects to `next` as today.
- **Rationale**: reuses 009's `next` mechanism and its open-redirect guard; no new auth surface.

## R3 — Recording on arrival: `GET /brief/send`

- **Decision**: a route handler under `app/(site)/[locale]/brief/send/route.ts` that re-exports `sendKeptBrief` from `modules/brief`. Signed out → `/login?next=/brief/send&for=brief`. No or stale kept brief → `/account`. Otherwise it rebuilds the form from `entries`, runs the same recording core as `submitBrief` (`commands/send-brief.ts`) with the member, then: success → clear the cookie, redirect to the match URL (or WhatsApp when Quick Match is off, as the no-JS path does today); failure → rewrite the cookie with `error` (field errors or form error key) and redirect to the brief's `path`. Responses are `Cache-Control: no-store`.
- **Amended during implementation (2026-11-15)**: the code step's action sends the kept brief itself and redirects
  straight to step 2. Going through `/brief/send` left that address in the browser bar (the client router followed
  the redirect without updating it), so a reload re-ran the route; and cookies changed before `redirect()` in a
  route handler were not sent, so the brief was sent twice in the browser check. The route stays for a member
  who is already signed in, and sets its cookie change on the 303 response.
- **Rationale**: sign-in ends with a GET redirect; only a route handler or an action may change cookies. The side effect is limited to the caller's own kept brief; the duplicate window (60 s, fingerprint) makes repeats harmless.
- **Alternatives**: record in `verifyCodeAction` (auth would import the brief module and the app path would differ); a client page that posts on load (needs JS).

## R4 — The builder restores the kept brief

- **Decision**: after hydration, `BriefBuilder` reads `shoot-brief` from `document.cookie`; when its `path` equals the builder's `sourcePath`, its `locale` the config's locale, and its creator code the builder's creator (or both none), the answers fill the builder (values, typed words, skipped optional steps, "Continue" steps confirmed) and `error` shows like a server answer. Nothing else is read.
- **Rationale**: FR-008 and FR-009 with static pages. Matching on path, locale and creator avoids restoring a brief on the wrong builder.

## R5 — New numbers from a brief become clients

- **Decision**: with `intent: 'brief'` the code step never shows the role rows and posts no `askRole`; `verifyCodeAction` verifies with `signup: { accountType: 'seeker' }`, which signs a returning number in (signup ignored) and creates a client for a new one (009 research R12). The app's `SignInFlowCubit` does the same with `SignupChoice.seeker()` and `askIfNew: false` when opened `?for=brief`.
- **Rationale**: someone sending a brief is hiring; the role question would be a decision the flow does not need (Principle IX).

## R6 — Knowing if the visitor is signed in on a static page (guest line, FR-013)

- **Decision**: export `useSignedIn()` from `shared/components/SessionNav.tsx`, reusing the header's one `/api/session` request per page (`null` while unknown, then `true`/`false`). The line shows only when `false`.
- **Rationale**: no extra request; the page stays static. Before the answer arrives the line is hidden (no layout shift: it sits under the Top Hit, which appears only when the brief is complete, long after the session is known).

## R7 — Mobile API: additive only

- **Decision**: `briefBuilderV1` gains `signInRequired: z.boolean().optional()` (the server always sends it; older apps ignore it). `POST briefs` stays `auth: 'optional'`; while the switch is on, `recordBrief` answers `401 brief.errors.signInRequired` for no member. A new problem code is additive (clients fall back to a generic message). The snapshot is regenerated.
- **Rationale**: changing the declared auth to `required` would be a breaking v1 change; with the switch the endpoint genuinely is optional. The app is not in the stores (no public version affected).

## R8 — The app keeps and sends the draft

- **Decision**: `BriefCubit` gets `isSignedIn()` and a `signIns` stream (from `SessionCubit`). `submit()` on a complete brief with `config.signInRequired` and no session emits a one-shot `signInNeeded` and sets `awaitingSignIn`. The landing pushes `/login?next=/&for=brief`. When the session signs in while `awaitingSignIn`, the cubit submits; the landing handles the receipt (also on mount, for a receipt that arrived during the redirect). When the push returns with the person still signed out, the landing calls `signInAbandoned()` so a later sign-in from the menu does not send the brief (FR-010). A `401 brief.errors.signInRequired` answer (switch turned on after the builder loaded) is treated the same as `signInNeeded`.
- **Rationale**: the cubit is already a singleton for the app run (010), so the draft survives the sign-in screens without storage.

## R9 — Existing tests that send guest briefs

- **Decision**: test worlds that exist to test later steps (booking, inbox, creators) turn the switch off in their setup, as they already raise `briefLimitPerHour`; the new `BS-` tests cover the switch on, and the switch-off path is asserted to equal today's behaviour (BS-US5-S3).
- **Rationale**: those suites test step 2 onwards, not the gate; signing in a member in ~60 call sites would change what they test.

## R10 — Content that promises "No account needed"

- **Decision**: the default content (`seed/content.ts`) trust chip becomes "Reply on WhatsApp"-style honest copy ("Sign in with your number", "سجّل الدخول برقمك") and the "Why book this way" item becomes "Your briefs in one place". The live site is edited by the owner in the content area (seed is never run against production).
