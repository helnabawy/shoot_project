# Contract: app routes

The one path table is `apps/mobile/lib/core/routing/app_routes.dart`. Paths mirror the web
(`apps/web/src/app/(site)/[locale]/…`), so a link shared from the website opens the same place in
the app. Every path also works with an `/ar` prefix: the router strips the prefix and switches to
Arabic. The `built` column says whether 007 registers a page for the path.

## Routes

| Path | Screen(s) | Owner | Built in 007 | Auth (from 009) |
|---|---|---|---|---|
| `/` | 05 landing | 010 | no (until then: the service-health placeholder) | none |
| `/welcome/:step` (app only, 1–3) | 02–04 | 010 | no | none |
| `/menu` (app only) | 06 | 010 | no | none |
| `/creators` | 15 | 011 | no | none |
| `/creators/:code` | 16 | 011 | no | none |
| `/book/:code` | 17 | 011 | no | none |
| `/work/:specialty` | 18 | 011 | no | none |
| `/hire/:slug` | 19 | 011 | no | none |
| `/match/:ref/:key` | 07, 08 | 012 | no | none |
| `/match/:ref/:key/details` | 09 | 012 | no | none |
| `/match/:ref/:key/number`, `/match/:ref/:key/code` (app only) | 10, 11 | 012 | no | none |
| `/q/:ref/:key` | 12, 13, 14, 40 | 012 | no | none |
| `/login`, `/login/code` | 20, 21, 22 | 009 | no | none |
| `/register` | 23 | 009 | no | none |
| `/account` | 24, 27 | 013, 014 | no | required |
| `/account/finish` (app only) | 25 | 013 | no | required |
| `/account/bookings`, `/account/bookings/:ref` | 26, 32 | 013, 014 | no | required |
| `/account/profile` | 28, 29, 30 | 014 | no | required |
| `/account/availability` | 31 | 014 | no | required |
| `/guides`, `/guides/:slug`, `/guides/category/:slug`, `/guides/author/:slug` | 33, 34 | 015 | no | none |
| `/terms/**`, `/terms/professional/**`, `/privacy/**` | 36 | 015 | no | none |
| `/:slug` (editor-built page; resolved through the API) | 35, 38 | 015 | no | none |
| `/_gallery` (debug builds only) | gallery | 007 | **yes** | none |
| anything else | 37 not found | 007 | **yes** | none |
| error boundary | 39 something went wrong | 007 | **yes** | none |

## Rules

- **Unbuilt routes.** A route whose page is not built yet resolves to screen 37 in the link's
  language (FR-031, MF-US5-S5). A feature makes a route live by registering its page and flipping
  `built` in the same change.
- **`/ar` prefix.** `/ar` and `/ar/<path>` set the locale to `ar` through `LocaleCubit`, which
  saves the choice as in 006. The router then strips the prefix. Paths without the prefix keep the
  current locale; they do not force English.
- **First run.** The first-run redirect to `/welcome/1` is active only once feature 010 sets
  `built` for it. 007 provides the stored flag and the redirect hook. Deep links never redirect to
  the welcome steps; only a plain launch does.
- **Gallery.** `/_gallery` is registered only under `kDebugMode`. In release builds it falls to
  not-found (MF-US3-S5).
- **Errors.** Screen 39 is shown for router `errorBuilder` failures and, in release builds, by
  `ErrorWidget.builder`. It shows no exception text. "Try again" re-runs the failed navigation, and
  the WhatsApp row uses the site number once 008 provides it. Until then the row is hidden.
- **Deep links.** Associated Domains, App Links and the `.well-known` files belong to 008.
