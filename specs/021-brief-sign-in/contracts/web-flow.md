# Contract: the website's brief sign-in round trip (021)

## `submitBrief` server action (`modules/brief/actions.ts`)

Unchanged input (the builder's form). New behaviour when `briefNeedsSignIn` is on and there is no member:

1. Parse and validate exactly as today (creator resolution, persona rules). Invalid → today's `{ status: 'error', errors }`.
2. Valid → write `shoot-brief` (data-model) and:
   - with JavaScript (`js=1`): return `{ status: 'signIn', loginUrl }`;
   - without: `redirect(loginUrl)`.
3. Nothing is recorded; no announcement; no visitor allowance is used.

`loginUrl` = `/login?next=%2Fbrief%2Fsend&for=brief`, `/ar/login?…` in Arabic.

`BriefState` gains `{ status: 'signIn'; loginUrl: string }`.

## `/login?for=brief` (page)

- With a fresh kept brief: heading `auth.otp.briefTitle` ("Log in to send your brief", the header's verb), intro `auth.otp.briefIntro`, the kept sentence in a set row with `auth.otp.briefChange` linking to the kept `path`. `PhoneStep` posts `intent=brief` and `next=/brief/send`.
- Without a fresh kept brief: the ordinary sign-in page (the `for` parameter is ignored).
- Signed in already: redirects to `next` as today (so a member lands on `/brief/send`, which sends their kept brief).

## `/login/code` with `intent: 'brief'`

- No role rows, no `askRole`; Continue verifies with `signup: seeker`; a returning number signs in whatever its type.
- Success → the action sends the kept brief itself (`sendKept`, the same core as `GET /brief/send`) and redirects
  straight to step 2 (or WhatsApp, or back to the brief with its error). It does not go through `/brief/send`:
  the client router would keep that address in the bar, and a reload would find the brief already sent.

## `GET /brief/send` (`app/(site)/[locale]/brief/send/route.ts`)

For a member who is already signed in when they reach `/login?for=brief` (the login page sends them on here).
The cookie change is set on the 303 response itself (cookies changed before `redirect()` in a route handler are
not sent).

| Situation | Result |
|---|---|
| no member | 303 → `/login?next=/brief/send&for=brief` (locale-prefixed) |
| no, unreadable or stale kept brief | 303 → `/account` |
| recorded (or a duplicate within 60 s) | clear cookie; 303 → step 2 / details step (creator pick) / WhatsApp URL (Quick Match off) |
| invalid now, or `tooMany` | rewrite cookie with `error`; 303 → kept `path` (locale-prefixed) |

Always `Cache-Control: no-store`. Records with `user` = the member and `visitorId` = `sp_vid`, the creator only when it can still be booked (as today).

## Builder restore (`BriefBuilder`)

After hydration, reads `shoot-brief`; restores when `path === sourcePath`, `locale === config.locale` and the creator code matches. With `error`, shows it as the server's answer (field errors reopen their step). On `{ status: 'signIn' }` the builder navigates to `loginUrl`.

## Guest line

Under the Top Hit of a complete brief, when `signInRequired` and `useSignedIn() === false`: `brief.signInNext` ("Next, we'll send a code to your mobile number to log you in.").

## New message keys (`messages/{en,ar}.json`)

`brief.errors.signInRequired`, `brief.signInNext`, `brief.signingIn`, `auth.otp.briefTitle`, `auth.otp.briefIntro`, `auth.otp.briefChange`, `auth.otp.briefLabel`.
