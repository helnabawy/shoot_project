# Research: Mobile Quick Match and booking

**R1. "Download PDF" (FR-024).** Decision: (a) open the quotation's web page in the system
browser (`WebsiteLinks`, `/q/{ref}/{key}`), where the browser saves it as PDF as on the website.
Why: no new package, the identical document, no second renderer to keep in step with 003 FR-013.
Alternatives: an in-app PDF with the share sheet (needs a PDF package and a second layout);
leaving the button out (the boards show it). **Owner decision pending; (a) is reversible.**

**R2. Private key in the path.** `/quotations/{ref}/{key}` and `/match/{ref}/{key}` mirror the
website's links, so deep links map one to one and the key never moves to a header. A wrong key, an
unknown reference or another account's quotation all answer 404 `api.errors.notFound` (FR-020).

**R3. One tap is two calls.** "Open WhatsApp" calls `auth/otp/verify` (009) and then
`POST /match/{ref}/{key}/quotation` with the new token. The server cannot make these atomic (the
token is minted by verify). Issuing is all-or-nothing on its own (the command deletes a booking it
created if a later step fails); a failure after sign-in leaves a signed-in person with no booking
and the app retries issuing without asking for a code. FR-015's "nothing half-saved" is read as
"no half-saved booking".

**R4. Details storage.** Bookings gain `details` (`startTime` HH:MM, `duration` option value,
`venue` ≤ 200, `note` ≤ 300), nullable, so the migration changes no data.

**R5. Client name and phone.** The website asks name and WhatsApp in step 3. The app has the
member: `client.name` from `users.name`, `client.whatsapp` from `users.username` (the verified
number). The command takes these from the user, never from the body.

**R6. Price recompute on 09.** `GET /match/{ref}/{key}?date&duration` reuses the website's match
query with a duration override. Duration options come from the existing `brief-builder` answer.

**R7. Nearby days.** The domain's `nearbyDates` gives the days; each carries how many creators are
free (the minimum across sections) so 08 shows the real number (FR-006).

**R8. Cards' gallery.** One extra query selects up to three samples of the listed creators shown;
thumbs only, `kind` for the play mark. No ratings, badges or review counts are in the shape.

**R9. Booking status shape.** One `bookingView` answer: `state`, `lines`, `progress[]`, `nextStep`,
`canAccept`, `canConfirmDelivery`, `canReport`, `replacements`, `whatsappUrl` (never a phone),
`holdReason`. State words are app strings keyed by `state` (interface words, not CMS content).

**R10. Personas.** Professional-type words come from the answer (`singular`, `plural`), never ARB.
Multi-type briefs give several sections; one carousel per section, a pick in each.

**R11. Idempotency.** Accept and confirm-delivery already treat "already in that state" as success;
the commands return the current view in that case (FR-022).

**R12. Fresh quotation.** `POST /quotations/{ref}/{key}/fresh` returns the brief's reference and key
(creating the brief salt as the website does) and the previous picks; the app opens
`/match/{ref}/{key}` with a note (FR-023).

**R13. WhatsApp text.** The server composes the text (reference, private link, details) from
interface strings and returns a ready `whatsappUrl` for the business number in site settings, so
the app holds no template (FR-042). Returning from WhatsApp (FR-017): the cubit keeps the saved
reference and key, and the booking route is the screen the flow leaves the person on.
