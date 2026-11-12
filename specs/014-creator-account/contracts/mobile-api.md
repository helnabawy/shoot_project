# Contract: creator account endpoints (additive to v1)

All `auth: required`, `cache: no-store`; non-creators get 403 `creators.errors.notProvider`. Paths are
under `/api/mobile/v1`. The zod file `packages/domain/src/api/v1/creator-account.ts` is the source.

| Id | Route | Body | Answer |
|---|---|---|---|
| `creatorAccount` | `GET /me/creator/account` | none | `creatorAccountV1` |
| `myCreatorProfile` | `GET /me/creator/profile` | none | `myProfileV1` |
| `creatorProfileSave` | `PATCH /me/creator/profile` | `profilePatchV1` | `myProfileV1` |
| `creatorProfileSubmit` | `POST /me/creator/profile/submit` | none | `myProfileV1` |
| `creatorProfileVisibility` | `PUT /me/creator/profile/visibility` | `{ hidden }` | `myProfileV1` |
| `creatorPhotoUpload` | `PUT /me/creator/profile/photo` | `uploadV1` | `myProfileV1` |
| `creatorSampleAdd` | `POST /me/creator/profile/samples` | `sampleAddV1` | `myProfileV1` |
| `creatorSampleRemove` | `DELETE /me/creator/profile/samples/{index}` | none | `myProfileV1` |
| `creatorIdentityUpload` | `PUT /me/creator/identity/{kind}` | `uploadV1` | `myProfileV1` |
| `creatorAvailability` | `GET /me/creator/availability` | none | `availabilityV1` |
| `creatorAvailabilitySet` | `PUT /me/creator/availability/{date}` | `{ blocked }` | `availabilityV1` |
| `creatorBookings` | `GET /me/creator/bookings` | none | `creatorBookingsV1` |
| `creatorBookingAnswer` | `POST /me/creator/bookings/{ref}/answer` | `{ decision, reason? }` | `creatorBookingsV1` |
| `creatorBookingDeliver` | `POST /me/creator/bookings/{ref}/deliver` | none | `creatorBookingsV1` |
| `creatorUpdateRead` | `POST /me/creator/updates/{id}/read` | none | `creatorBookingsV1` |

`uploadV1 = { contentType, filename, data }` (base64, decoded size at most 5 MB).

Problem codes added (all existing message keys of the web app): `creators.errors.{notProvider,noProfile,
generic,required}`, `creators.submit.incomplete`, `creators.identity.{kind,file,type,size}`,
`creators.samples.{limit,image,poster,category}`, `media.upload.{type,size}`,
`availability.errors.{notYours,generic}`, `booking.errors.{notYours,not-allowed,not-found,dateTaken}`.
