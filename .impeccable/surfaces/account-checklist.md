---
version: 1
slug: "account-checklist"
primary_target: "apps/web/src/modules/auth/components/AccountChecklist.tsx"
related_targets: ["apps/web/src/app/(site)/[locale]/account/page.tsx", "apps/web/src/modules/auth/account-actions.ts", "apps/web/src/app/(site)/[locale]/account/number/page.tsx"]
---

# Finish your account

## Scope and mode

Build, inside the existing account home (surface `account-home`). Design system handoff "Completing the account", canvas screen 7b; spec 006 US7 and US9. A one-time panel after the first booking.

## Audience, job, action

A client who just saved a first booking with a number and a name. Job: see what the account already is and, if they wish, add an email for quotes and receipts and set language and theme. One primary action for the next missing item ("Add email", then "Choose language and theme"); "Later" quiet in the panel header.

## Direction contract

THESIS: a settings panel that tells the truth about what is done, and asks for nothing it does not need.

- A 4 px progress bar in `accent` on `hair` with "2 of 4" as `meta`; a panel of four rows (mobile verified ✓, name ✓, email for quotes and receipts, language and theme), each with a quiet action at its end (Change number, Edit name, Add email, Choose); then three facts under "What your account does" (bookings in one place; your number stays private; the next brief is one tap), from the CMS.
- One Top Hit for the next missing item; "Later" in the panel header. The panel sits above "Up next" on the account page and shares its column; on phones it comes first.
- Email and language/theme rows are plain forms that work without scripting; language switches the site to the chosen locale on save; theme applies on this device after save and on others at sign-in.
- The verified number is shown formatted for reading (`+971 50 123 4567`, LTR, `Bidi`), with "Change number" leading to the number screen in change mode.

## Proof and constraints

Progress is a real count of four rows, nothing invented; no percentages, rings or badges. Nothing beyond the number and the name is required anywhere; dismissing never changes what the account can do. The panel disappears everywhere once all four rows are done, and on this device after "Later".

## Deliberately absent

Password or email verification steps, marketing opt-ins, profile photo, notification preferences, a "complete your profile" nag on later visits.

## RTL and dark

Progress bar fills from the inline start; ticks and chevrons mirror; the number stays LTR inside RTL lines. Dark: `accent`, `hair`, `success` tokens. Verify 360 / 768 / 1024 / 1440, en / ar, light / dark.
