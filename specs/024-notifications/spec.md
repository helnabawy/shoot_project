# Feature Specification: Notifications

**Feature**: `024-notifications` · **Test-id prefix**: `NT-` · **Created**: 2026-11-18 · **Status**: implemented

**Input**: the owner, 2026-11-18: "in Booking screen Updates section i need to put this listing in
notifications screen and add it in settings screen".

## Clarifications

### Session 2026-11-18

- Q: Who is the Notifications screen for? → A: every signed-in member, creators and clients. Today
  only creators see their notices (the "Updates" group on the creator's Bookings screen); clients'
  in-app notices (a creator said yes, a new offer) are written but never shown in the app.
- Q: Where is the "settings screen" entry? → A: the app menu's settings area (beside Language, Theme
  and Appearance), shown only when signed in. On the website: a row on the account page.
- Q: What happens to "Updates" on the Bookings screen? → A: it moves. Bookings no longer lists
  notices; the Notifications screen lists the latest ones, read and unread, unread ones marked.
- Q: The app only, or the website too? → A: both. The website gets `/account/notifications` and
  `/account/bookings` no longer lists notices.

## User Scenarios & Testing

### User Story 1: See my notifications (P1)

A signed-in member opens Notifications and sees what happened to their bookings and briefs, newest
first, with the new ones marked; a tap opens what the notice is about and marks it read.

**Acceptance scenarios**

1. **NT-US1-S1** Given a member with in-app notices, when they open Notifications, then their latest
   20 notices show newest first, read and unread, each with its time; unread ones are marked and
   counted. Another person's notices, admin notices and WhatsApp or push rows never show.
2. **NT-US1-S2** Given an unread notice, when the member taps it, then it is marked read and what it
   is about opens (the booking, the quotation, the offers page or the brief inbox).
3. **NT-US1-S3** Given a member with no notices, then a calm empty state says there is nothing yet.
4. **NT-US1-S4** Given a signed-out visitor, then the screen asks them to sign in (the app routes to
   sign-in; the API answers 401).

### User Story 2: Reach Notifications from settings (P1)

1. **NT-US2-S1** Given a signed-in member, when they open the app menu, then its settings area has a
   "Notifications" row with the unread count, which opens the screen; signed out, there is no row.
2. **NT-US2-S2** On the website, the account page has a "Notifications" row that opens
   `/account/notifications`.

### User Story 3: Bookings without notices (P2)

1. **NT-US3-S1** The creator's Bookings screen in the app and `/account/bookings` on the website no
   longer list notices.

## Requirements

- **FR-001** One read of the member's own in-app notices (audience client or creator), the latest 20,
  newest first, with the unread count. Admin rows are excluded.
- **FR-002** A member may mark only their own notice read; another person's id is "not found".
- **FR-003** Each notice says where it leads as a site path (never an absolute URL or an admin path).
- **FR-004** The app words a notice from its event (ARB strings, en and ar), with a generic line
  for an unknown event; the website shows the notice's stored text (content-area templates).
- **FR-005** API changes are additive: `GET /api/mobile/v1/me/notifications` and
  `POST /api/mobile/v1/me/notifications/{id}/read`. The creator bookings response keeps its
  `updates` field for older apps.

## Out of scope

Push preferences (feature 019), new notice events, deleting notices, paging beyond 20.
