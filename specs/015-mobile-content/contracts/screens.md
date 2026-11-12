# Contract: routes and screens (015)

## Routes (mirror the website; `/ar` is handled by the router)

| Path | Screen | Reads | Notes |
|---|---|---|---|
| `/guides` | 33 | `guides?page` | `?page=n` |
| `/guides/category/:slug` | 33 | `guides?category` | title = category name |
| `/guides/author/:slug` | 33 | `guides?author` | title = author name |
| `/guides/:slug` | 34 | `guides/{slug}` | 404 then `resolve` |
| `/terms`, `/terms/professional`, `/privacy` | 36 | `legal/{kind}` | switch changes path |
| `.../versions` | 36 earlier | `legal/{kind}/versions` | list |
| `.../versions/:version` | 36 | `legal/{kind}/versions/{n}` | newer-version line |
| `/:slug` (last route) | 35, 38, 37 | `pages/{slug}` | 404 then `resolve` |

`kind` wire names: `terms`, `professional-terms`, `privacy`. The feed is `/guides/feed` on the website,
opened in the browser, never routed.

## Screen anatomy (boards are the authority; see `specs/design-system/canvas/manifest.json`)

| Screen | Board | Header | Content (top to bottom) | Primary action |
|---|---|---|---|---|
| 33 | S11-guides | wordmark; language, account, menu | h1 "Guides" (or topic/author), line, topic chips, guide rows, Previous / Page n of m / Next, RSS link, "Ready to brief?" band | "Start a brief" (inside band) |
| 34 | S11b-guide | back to guides; language | topic label, h1 (30), author · minutes, cover (16:10, radius 12, bleeds 8), lead (18/500), rich text, band, "More guides" | "Start a brief" |
| 35 | S12-page | as 33 | h1, intro, numbered steps, "Questions" list (expandable), the Top Hit | "Start a brief" |
| 36 | S13-legal | as 33 | "Legal" label, h1, version line, document chips, governing-language note, "In this document" rows, numbered sections, "Earlier versions · All versions" row | none |
| 38 | S10b-removed | wordmark; language | mark, "410", h1, one line, rows "Read the guides", "Ask us on WhatsApp", Top Hit | "Start a brief" |

Fidelity keys: `fidelity:header`, `fidelity:wordmark`, `fidelity:h1`, `fidelity:topHit` as the manifest
names them (36 has no `topHit`).

## Accessibility names (English; Arabic equivalents in ARB)

"Topics" (chip group), "Pages" (pagination), "Legal documents" (document chips), "Back to the guides"
(34 back), "Where to next" (38 rows), "Versions" (36 foot). Headings are `Semantics(header)`. Chips are
toggled buttons; a question is a button with `expanded`; the cover has the CMS alt text.

## Strings (ARB, interface labels only; copy comes from the CMS)

`guidesTitle` "Guides", `guidesIntro`, `guidesTopics`, `guidesAll`, `guidesPrevious`, `guidesNext`,
`guidesPageOf`, `guidesByline`, `guidesReadingTime`, `guidesRss`, `guidesMore`, `guidesBack`,
`briefBandTitle`, `briefBandBody`, `briefBandAction`, `briefBandWhatsapp`, `legalLabel`,
`legalVersionLine`, `legalUpcoming`, `legalGoverns`, `legalInThisDocument`, `legalEarlierVersions`,
`legalAllVersions`, `legalNewerInForce`, `legalArabicUnavailable`, `legalDocTerms`,
`legalDocProfessional`, `legalDocPrivacy`, `pageQuestions`, `pageOpenOnWebsite`, `removedCode`,
`removedTitle`, `removedBody`, `removedGuides`, `removedWhatsapp`, `removedAction`, `englishOnly`,
`accountAction`, `menuAction`.

The guides line ("Plain answers for briefing, booking and preparing a shoot.") is on the board as CMS
text, but the API has no guides-intro field in `guideListV1`; it is an interface string `guidesIntro`
(decision for the owner: move to CMS when the API gains the field).
