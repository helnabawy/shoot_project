---
version: 1
slug: "account-bookings"
primary_target: "apps/web/src/app/(site)/[locale]/account/bookings/page.tsx"
related_targets: ["apps/web/src/app/(site)/[locale]/account/availability/page.tsx", "apps/web/src/modules/booking/components/CreatorBookingRow.tsx", "apps/web/src/modules/booking/components/AvailabilityList.tsx", "apps/web/src/modules/booking/components/NotificationList.tsx"]
---

# Account: bookings and availability

## Scope and mode

Operate. `/account/bookings` for seekers (their quotations and bookings, in-app notices) and providers (bookings assigned to them), `/account/availability` for providers. Feature 003 (US2-S6, US3, FR-002).

## Audience, job, action

Seeker: find a booking and open it (each row is the link). Provider: answer pending requests before the deadline — "Confirm" is the one primary action on a pending row, "Decline" secondary with an optional reason; scheduled rows offer "Mark delivered". Availability: one row per date for the next 90 days, grouped by month; each row toggles Block / Free; booked dates are set rows that cannot be toggled.

## Proof and constraints

Providers see the client's first name, the date, the emirate, the brief sentence and the price; never the client's phone. Respond-by time is real (from the booking), shown as a time, not a ticking timer. Works without JavaScript (one form per row).

## Direction contract

THESIS: The account is the same panel world as the brief: groups ("Waiting for you", "Coming up", "Done"), rows, one action per row.

## States and ranges

No bookings: one open row "Nothing here yet" with a link to start a brief (seekers) or to the profile (providers). 0–200 rows; paginate by 20. Notices: unread first, mark as read on open.

## Deliberately absent

Earnings dashboards, charts, badges, gamified streaks.

## RTL and dark

As the rest of the site: logical layout, isolated dates and codes, night tokens.
