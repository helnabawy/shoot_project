# Proposal: amend Principle VII for native-app tokens (task T090)

**Status**: proposed for the owner; not applied. To be opened as its own pull request that edits
`.specify/memory/constitution.md`, separate from feature 009 (Governance: "propose via a pull request").

## Motivation

Principle VII says "Authentication uses the CMS's built-in auth with HTTP-only, secure, same-site
cookies". Feature 009 gives the Flutter app a Payload token sent as `Authorization: Bearer`, kept in the
platform secure store. A native app has no cookie jar that the operating system protects from other
apps the way it protects the iOS Keychain or the Android Keystore, and a Bearer header rules out CSRF.
The token is still the CMS's built-in auth (a Payload JWT verified by `payload.auth`, revocable through
Payload sessions). 009's plan justifies the departure in its Complexity Tracking; this amendment makes
the text match the practice so the next feature does not need the same justification.

## Proposed text (the second bullet of Principle VII)

> - Authentication uses the CMS's built-in auth. The website keeps the session in an HTTP-only,
>   secure, same-site cookie. Native apps keep the CMS's token in the platform's secure store
>   (iOS Keychain, Android Keystore) and send it as a Bearer header; the token is short-lived with
>   refresh, revocable on the server, and never logged or put in a URL. Passwords are never logged or
>   returned; login attempts are rate-limited and accounts lock after repeated failures.

## Version: the owner chooses

- **PATCH (1.4.1)**, if this is read as a clarification of where "the CMS's built-in auth" keeps its
  token on a native client; or
- **MINOR (1.5.0)**, if it is read as materially expanding the guidance (a second, explicitly allowed
  transport).

The proposer's lean is MINOR: it adds an allowed mechanism, and reviewers of later features should see
the version move.

## How existing code complies (required for Principle VII amendments)

- The website is unchanged by this text: `apps/web/src/modules/auth/actions.ts` sets the HTTP-only,
  `Secure` (production), `SameSite=Lax` `payload-token` cookie for both the email and the code sign-in
  (`setSessionCookie`), and logout now ends the server session (009 FR-062).
- The app's Bearer path is feature 009 itself: `apps/mobile/lib/core/auth/` (secure store via
  `flutter_secure_storage`, first-run wipe, `AuthInterceptor` refreshing under 2 days left, 401 → signed
  out), the 7-day Payload session with `auth/refresh` and `auth/logout`, and no logging of `auth/*`
  traffic (009 OT-US2-S4).
- Dependent artefacts to update in the same pull request: the `mobile-api-contract` and `payload-cms`
  skills (drop "Principle VII names cookies; 009's Constitution Check records why"), and 009's
  `plan.md` Constitution Check row VII (from "Pass with justification" to "Pass").
