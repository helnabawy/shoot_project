# Contract: Payload REST surface (feature 002)

Payload generates the endpoints; this file records which are relied on and
what each caller gets. Locale via `?locale=en|ar&fallback-locale=en`.

| Endpoint | Anonymous | Provider (owner) | Provider (other's) | Editor/Admin |
|----------|-----------|------------------|--------------------|--------------|
| `GET /api/creator-profiles` | published ∧ listing active ∧ not suspended only; **no `user` field** | same, plus own profile with `?draft=true` (own `user` visible) | other drafts never; no `user` field | all |
| `GET /api/creator-profiles/:id` | 404 unless public; no `user` field | own, any state with `?draft=true` | 404 unless public; no `user` field | all |
| `POST /api/creator-profiles` | 403 | allowed once (`accountType = provider`, no existing profile); stored as draft; `user` and `code` (5 chars, no prefix) set by hook; listing created | — | allowed |
| `PATCH /api/creator-profiles/:id` | 403 | own only; `_status` forced to `draft` (unless auto-publish and the listing has `verifiedAt`); `code`/`user` rejected | 403 | allowed; publishing verifies |
| `DELETE /api/creator-profiles/:id` | 403 | 403 | 403 | admin; refused while briefs reference it; deletes the listing |
| `GET /api/creator-profiles/:id/versions` | 403 | own | 403 | all |
| `GET /api/creator-listings` | **empty / 403** (never readable) | own listing only (incl. `reviewNote`) | never | all |
| `PATCH /api/creator-listings/:id` | 403 | own, `active` only (other fields rejected by field access) | 403 | all fields except `profile`, `user`, `verifiedAt` |
| `POST/DELETE /api/creator-listings` | 403 | 403 | 403 | 403 (created and deleted by profile hooks only) |
| `GET /api/locations` | allowed (active) | allowed | allowed | all |
| `POST/PATCH/DELETE /api/locations` | 403 | 403 | 403 | admin; delete refused while referenced |
| `POST /api/media` | 403 | JPEG/PNG/WebP ≤ 5 MB, `uploadedBy` set; refused past 60 owned files (`media.upload.quota`, 400), 20 per account per hour or 40 per visitor per hour (`media.upload.tooMany`, 429) | — | allowed (any image, no quota) |
| `PATCH/DELETE /api/media/:id` | 403 | only files they uploaded | 403 | allowed |
| `POST /api/briefs` | allowed (unchanged); a client-supplied `creator` is discarded | same | same | allowed |

## Error shapes

Unchanged Payload format `{ errors: [{ message, name, data }] }`. Messages
added by this feature (translated through Payload's `i18n` for the admin and
through `messages/*.json` for the site):

`creators.code.immutable`, `creators.persona.inactive`,
`creators.specialty.notInPersona`, `creators.samples.limit`,
`creators.samples.host`, `creators.samples.poster`,
`creators.submit.incomplete`, `locations.parent.depth`,
`media.upload.type`, `media.upload.size`, `media.upload.quota`,
`media.upload.tooMany`.

## Compatibility

Additive only. Existing 001 endpoints, collections and the brief submit
contract keep their behaviour; `briefs` gains one optional read-only field.
