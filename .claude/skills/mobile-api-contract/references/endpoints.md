# Planned endpoint inventory (`/api/mobile/v1`)

> **Status: planned and indicative.** Paths below are the expected shape, grouped by the feature
> that adds them (`specs/ROADMAP.md`). Each feature's `contracts/mobile-api.md` is the binding list;
> update this table when a feature's plan lands. Reads in 008 are `none` so shared caches can keep
> them; moving one to `opt` later is additive.

Auth: **none** (anonymous only), **opt** (works with or without a token), **req** (token required).
Cache: **public** (`public, s-maxage=60`, `Vary: Accept-Language`, private when a token is sent),
**no-store**.

| Feature | Endpoint | Auth | Cache | Built on |
|---|---|---|---|---|
| 008 mobile-api | `GET site`, `GET navigation`, `GET personas`, `GET brief-builder`, `GET landing` | none | public | site-settings, pages, personas, brief, landing queries |
| 008 | `GET creators`, `GET creators/{code}`, `GET work/{specialty}`, `GET hire/{slug}` | none | public | creators and pages queries (no `fromPrice` yet; 011 adds it additively) |
| 008 | `GET guides`, `GET guides/{slug}`, `GET pages/{slug}`, `GET legal/{kind}`, `GET legal/{kind}/versions[/{version}]` | none | public | guides, pages, legal queries; reduced rich-text tree for `RichContent` |
| 008 | `GET resolve?path=` → `page` / `removed` / `notFound` / `private` (always 200) | none | public | `pages` `resolvePath` |
| 008 | `GET /.well-known/apple-app-site-association`, `GET /.well-known/assetlinks.json` (site root, not under v1) | none | `public, max-age=3600` | env-configured app ids |
| 009 otp-sign-in | `POST otp/request` | none | no-store | `domain/auth/otp.ts`, `otp-challenges`, provider adapter |
| 009 | `POST otp/verify` → `{ token, exp, user }` | none | no-store | find-or-create by phone, session, `jwtSign` |
| 009 | `POST refresh`, `POST logout` | req | no-store | user sessions |
| 009 | `GET me` (at `/api/mobile/v1/me`, not under `auth/`) | req | no-store | users |
| 010 first-visit-landing | `POST brief/preview` | opt | no-store | brief domain rules |
| 011 mobile-creators | adds `fromPrice` to the 008 creator shapes (additive) | none | public | price rules |
| 011 | `POST creators/{code}/book` | opt | no-store | book-this-creator command |
| 012 mobile-quick-match | `POST match`, `GET match/{ref}/{key}`, `POST match/{ref}/{key}/details`, `GET q/{ref}/{key}`, `POST q/{ref}/{key}/accept` | opt | no-store | booking commands extracted from `booking/actions.ts` |
| 013 client-account | `PATCH me`, `GET account/bookings` | req | no-store | users, booking queries |
| 014 creator-account | `GET`/`PATCH account/profile`, `POST account/profile/review`, `POST account/uploads`, `GET`/`PUT account/availability`, `GET account/assignments` | req | no-store | creators and booking commands |
| 015 mobile-content | none new (reads come from 008); block renderer in the app | — | — | — |

Paths mirror the web's public paths where one exists, so a deep link and its API read share an
identifier (`/creators/{code}` ↔ `GET creators/{code}`).
