---
version: 1
slug: "quotation"
primary_target: "apps/web/src/app/(site)/[locale]/q/[ref]/[key]/page.tsx"
related_targets: ["apps/web/src/modules/booking/components/QuotationView.tsx", "apps/web/src/modules/booking/components/PriceLines.tsx", "apps/web/src/modules/booking/components/BookingStatus.tsx", "apps/web/src/modules/booking/components/PrintButton.tsx"]
---

# Quotation and booking status

## Scope and mode

Reassure, then convert. `/q/{ref}/{key}` (and `/account/bookings/{ref}` for members): the quotation document and, once accepted, the booking's status. Feature 003 (US2, US3).

## Audience, job, action

A client deciding to commit, then following their booking. One primary action per state, as the Top Hit: quoted → "Accept quotation"; accepted → none (status "Waiting for Sara Khan to confirm by 14:00 tomorrow"); confirmed → "Pay AED {total}" (feature 020, online payment on: a lock glyph, one quiet line naming card, Apple Pay and Google Pay; back from the payment page the status line becomes "Payment received. We're confirming it…" with a pulsing accent dot until paid; after leaving the page a plain "Nothing was charged" line above Pay), or with online payment off "Send receipt on WhatsApp" with the payment instructions above it; delivered → "Confirm delivery" (secondary: "Report a problem"); expired → "Get a fresh quotation"; lapsed creator → choose another (rows like step 2). "Download PDF" is always a quiet Actions row; WhatsApp too. Feature 025: from Paid until Delivered the booking's signed-in client sees one group per booked creator ("Contact {name} · {type}") right under the status, with two plain rows, Call (the number at the end, left-to-right) and Message on WhatsApp; never a second Top Hit, never printed, never for the link alone.

## Proof and constraints

The document shows only frozen facts: reference, issue date, valid until, the brief sentence, the creator per type (or "We'll choose"), the lines (tier with its deliverables, travel fee, extras, code discount, adjustments), the total in AED (VAT included), the terms text from the CMS. The status timeline lists only states that happened, with their real timestamps. Print: the same document on A4, black on white in both themes, no header/footer/toggles/buttons, lines never split across pages.

## Direction contract

THESIS: The quotation is a receipt the client can trust before paying: one panel, rows of lines with amounts aligned at the end, a hairline, the total as the Top Hit's companion. It prints as itself.

## States and ranges

quoted, accepted, confirmed, paid, scheduled, delivered, completed, on-hold, cancelled, expired; superseded version shows "Replaced by Q-…" with a link (members) or a note. 1–12 lines. Arabic labels frozen at issue.

## Deliberately absent

Stamps, fake signatures, logos the owner has not uploaded, "best price" claims, countdown timers, card-brand logo strips or "secured by" badges.

## RTL and dark

Amounts at the end edge (logical), tabular numerals, isolated LTR. Dark on screen; print always light.
