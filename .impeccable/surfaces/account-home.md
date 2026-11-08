---
version: 1
slug: "account-home"
primary_target: "apps/web/src/app/(site)/[locale]/account/page.tsx"
related_targets: ["apps/web/src/modules/auth/account-home.ts", "apps/web/src/modules/auth/components/AccountHome.tsx", "apps/web/src/modules/auth/components/AccountSummary.tsx", "apps/web/src/modules/brief/components/MyBriefs.tsx"]
---

# Account home

## Scope and mode

Operate. `/account` for clients (seekers) and creators (providers). Redesigned 2026-11-08 at the owner's request: "what's next" first, merged with a hub of the account's places. Read-only: shows existing data, adds no editing.

## Audience, job, action

Land, see the one thing that needs you, act on it in one tap; otherwise go to a place in the account. The one Top Hit, chosen by `pickNextUp` (`modules/auth/account-home.ts`, unit-tested):

- Creator: requests waiting for an answer ("Answer the request", soonest date first) → a profile the public cannot see (draft, in review, hidden, suspended: "Finish my profile" / "Open my profile") → the next job ("See my bookings") → nothing waiting ("Update my days off").
- Client: an open quotation ("Review the quotation") → the next booking ("Open the booking") → nothing booked ("Start a brief").

## Direction contract

THESIS: a settings window in The Brief Bar world. The start column is who you are and where you can go; the end column is the one panel (Up next) and your briefs.

- Start column (300 px from 1024 px, sticky under the toolbar): the 64 px initials tile, the name as the h1, the profession in ink, the email in mute; "In your account" rows (Bookings, and for creators My profile and Availability), each with a one-line status and a chevron; Log out last, mute, alone.
- End column: Up next, the page's only panel and only Top Hit, then "Your briefs" as rows on the ground. "Start a brief" is a row there unless the Top Hit already says it; with no briefs and that Top Hit, the section is absent.
- Phones: one column ordered name, Up next, places, briefs, Log out (CSS `order`; the start column is `display: contents` below 1024 px), so the Top Hit stays above the fold and Log out stays last.

## Proof and constraints

Statuses are real counts or nothing: "None yet", "{n} waiting for you" (ink, medium), "{n} new updates", "{n} open", "Free every day" / "{n} days off", the profile status title. No completion percentage, no ring, no badge.

## Deliberately absent

Eyebrow above the name, account-type row ("Book a professional" is a sign-up choice, not an identity), blue text links, editing of name/email/password (would need a spec).

## RTL and dark

The start column is the inline start, so it sits on the right in Arabic; chevrons mirror; email isolated with `Bidi`. Verified 360–1440 px, en/ar, light/dark (captures 2026-11-08).
