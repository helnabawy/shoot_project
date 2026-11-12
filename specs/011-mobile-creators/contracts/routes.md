# Contract: routes and API use

| Path | Screen | Reads | Primary action |
|---|---|---|---|
| `/creators` | 15 | `GET creators?type&specialty&place&page` | "Tell us the shoot, we'll match you" to `/` |
| `/creators/:code` | 16 | `GET creators/{code}`, `GET site` (WhatsApp number) | "Book with {first}" to `/book/:code` |
| `/book/:code` | 17 | `GET creators/{code}`, `GET brief-builder`, `GET site` | "Book with {first}" to WhatsApp (until 012) |
| `/work/:specialty` | 18 | `GET work/{specialty}` | "Start a {specialty} brief" to `/` |
| `/hire/:slug` | 19 | `GET hire/{slug}`, `GET site` | "See who's free" to WhatsApp (until 012) |

404 on a read: screen 37 (`NotFoundPage`); network or 5xx: screen 39 with "Try again".
`/creators` accepts `?type=&specialty=&place=` (used by "See all n"). `/ar` is handled by the router.
