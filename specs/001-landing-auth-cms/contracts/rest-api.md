# Contract: REST API (Payload-generated, used by tests and future clients)

Base path `/api`. JSON bodies. Auth via HTTP-only cookie `payload-token`
(set by login) or `Authorization: JWT <token>`. Errors follow Payload's shape
`{ errors: [{ message, data? }] }`. The site's own forms use server actions
(see `routes-and-actions.md`); these endpoints are the external contract.

## Users / auth

| Method | Path | Auth | Body | Response | Notes |
|--------|------|------|------|----------|-------|
| POST | `/api/users` | none | `{ email, password, name, accountType, persona?, categories?, phone? }` | 201 `{ doc, message }` | `roles` in body ignored (field access). Duplicate email → 400 `ValidationError`. |
| POST | `/api/users/login` | none | `{ email, password }` | 200 `{ user, token, exp }` + cookie | Wrong creds → 401. Locked → 401 with lock message. 5 failures lock 15 min. |
| POST | `/api/users/logout` | cookie | — | 200 | Clears cookie. `?allSessions=true` supported. |
| GET | `/api/users/me` | cookie | — | 200 `{ user \| null, token?, exp? }` | Never includes `password`/`hash`/`salt`. |
| POST | `/api/users/refresh-token` | cookie | — | 200 `{ user, refreshedToken, exp }` | |
| POST | `/api/users/forgot-password` | none | `{ email }` | 200 | No-op response regardless of existence; email sending disabled until configured. |
| POST | `/api/users/reset-password` | none | `{ token, password }` | 200 | |
| POST | `/api/users/unlock` | admin | `{ email }` | 200 | |
| GET | `/api/users/:id` | self or admin | — | 200 doc | Other member → 403/404. |
| PATCH | `/api/users/:id` | self or admin | partial | 200 | `roles` only by admin. |

## Localisation on every read

Append `?locale=ar` to receive Arabic values (`?fallback-locale=en` is the
default behaviour when a value is missing; `?locale=all` returns every
language as `{ en, ar }` objects and is used by the untranslated-fields
check). Writes to a specific language use `?locale=ar` on `POST`/`PATCH`.

## Personas and categories (public read, admin write)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/personas?where[active][equals]=true&sort=order` | none | public |
| GET | `/api/categories?where[active][equals]=true&depth=1` | none | `personas` populated at depth 1 |
| POST/PATCH/DELETE | `/api/personas`, `/api/personas/:id` | admin | DELETE refused (400) while referenced |
| POST/PATCH/DELETE | `/api/categories`, `/api/categories/:id` | admin | DELETE refused while referenced by users |

## Option sets and briefs

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/option-sets?where[slug][equals]=occasions&locale=ar` | none | options with persona filter data |
| POST/PATCH/DELETE | `/api/option-sets`, `/api/option-sets/:id` | editor | DELETE refused while a slot references it |
| POST | `/api/briefs` | none | `{ persona, selections[], date?, locale, sourcePath, contact? }`; honeypot field `website` must be empty and the per-visitor limit applies (both enforced in a `briefs` `beforeChange` hook, so this endpoint and the server action behave the same; over the limit → 429); 201 `{ doc: { id, reference } }` |
| — | `/api/rate-limits` | — | not exposed: access denies every operation |
| GET | `/api/briefs?where[status][equals]=new` | admin | members get only their own (`read` access query) |
| PATCH | `/api/briefs/:id` | admin | `status` only |

The site's builder submits through the `submitBrief` server action (see
`routes-and-actions.md`); the REST endpoint is the contract for feature 003
(resume the matching flow from a brief id) and for tests.

## Globals

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/api/globals/site-settings?depth=1&locale=ar` | none | `activePersonas` populated; Arabic message/labels |
| POST | `/api/globals/site-settings` | admin | invalid `whatsappNumber` → 400 with format message |
| GET | `/api/globals/landing-page?depth=2` | none | published version only |
| GET | `/api/globals/landing-page?draft=true` | editor | latest draft |
| POST | `/api/globals/landing-page` | editor | `_status: draft \| published` |

## Media

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | `/api/media` (multipart, `alt` required) | editor | returns `sizes.{thumbnail,card,hero}.url` |
| GET | `/api/media/:id` | none | |

## Site utility routes (Next.js, not Payload)

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/next/preview?secret=&path=` | editor cookie + `PREVIEW_SECRET` | enables `draftMode`, redirects to `path` |
| GET | `/next/exit-preview` | — | disables draft mode |
| GET | `/api/health` | none | `{ status: 'ok', db: 'ok' }` for load balancers |
| GET | `/sitemap.xml`, `/robots.txt` | none | generated |

## Contract tests

Playwright `request` fixture (`tests/e2e/api.spec.ts`) covers: register
(201, roles ignored, duplicate 400), login (cookie set, 401 wrong, lock after
5), me (with/without cookie), member cannot read another member, anonymous
cannot write personas, invalid WhatsApp number rejected, draft landing not
public, `/api/health` 200, `?locale=ar` returns Arabic hero headline and
falls back to English for an untranslated field, `POST /api/briefs` 201 for
a valid brief / 400 for a past date / 429 over the limit, member reads only
own briefs.
