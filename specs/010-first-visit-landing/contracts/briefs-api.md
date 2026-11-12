# Contract: POST /api/mobile/v1/briefs

Auth: opt (a Bearer token links the member). Cache: no-store. `X-Shoot-Install` is the visitor id.

Request `briefRecordV1`:
```json
{"selections":[{"token":"persona","value":"photographer"},
  {"token":"occasion","value":"wedding"},{"token":"location","value":"dubai"}],
 "date":"2026-12-05"}
```
A multi-choice slot repeats its token (one entry per value, in the order picked). `date` is
`YYYY-MM-DD` or null. Labels are re-derived on the server from the CMS, never trusted.

Response 201 `briefReceiptV1`:
```json
{"reference":"B-2026-0142","sentence":"I need a photographer for weddings in Dubai.",
 "whatsappUrl":"https://wa.me/...","matchPath":"/match/B-2026-0142/k"}
```
`matchPath` is null when Quick Match is off. The same selections from the same install within 60 s
return the first reference with 200.

Problems (problem+json, error codes are message keys): 422 `brief.errors.required` (field = token),
422 `brief.errors.optionGone`, 422 `brief.errors.pastDate`, 429 `brief.errors.tooMany`,
503 `brief.errors.generic` when the builder is switched off.
