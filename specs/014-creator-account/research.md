# Research: Mobile creator account

- **R1 Where the endpoints live.** Decision: `/api/mobile/v1/me/creator/*`; `me` is 009's prefix and 013
  adds `PATCH me`, so `me/creator` cannot clash. Rejected: `/creator/*`, which reads as public.
- **R2 Access.** Every endpoint is `auth: 'required'`; commands check `user.accountType === 'provider'`
  else 403 `creators.errors.notProvider`. Ownership is the profile found by `user`.
- **R3 One view for the whole profile.** `GET me/creator/profile` returns profile, steps (from
  `profileStrength`), identity states, samples, options and limits in one answer; every write answers
  with the same view, so the app replaces its state.
- **R4 Save semantics.** `PATCH` takes any subset of fields (the step being left). A failure is 422 with
  field paths `body.<field>` so the app opens the step of the first error (FR-015). Same draft/publish
  rule as the website's `saveProfile`.
- **R5 Uploads.** JSON base64 with the same type and size checks as the actions; replaced identity files
  are deleted server side.
- **R6 Availability.** `GET` returns today, the window and the non-free days; the app builds months.
  `PUT availability/{date}` `{ blocked }` creates or deletes the block through the collection's access
  and hooks (booked and past days are refused with `availability.errors.*`).
- **R7 Bookings.** One read returns updates, waiting (accepted, pending, before the deadline, nearest
  first), lapsed, upcoming, done. Clients appear by first name only. Answering uses `respond`,
  `blockDateFor`, `applyTransition` exactly like `respondToAssignment`.
- **R8 Words.** Problem codes are existing message keys, mapped in `failure_message.dart`. Step names and
  state lines are ARB strings built from codes (`required: ['gender']`), never server text.
- **R9 Fidelity.** Boards compared at full scroll height; goldens need macOS and the pinned Flutter
  (`tool/goldens.sh`); step panels with no board are the app's own baselines.
