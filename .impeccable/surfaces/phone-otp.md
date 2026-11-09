---
version: 1
slug: "phone-otp"
primary_target: "apps/web/src/modules/auth/otp/components/CodeScreen.tsx"
related_targets: ["apps/web/src/modules/auth/otp/components/NumberScreen.tsx", "apps/web/src/modules/auth/otp/components/PhoneField.tsx", "apps/web/src/modules/auth/otp/components/CountrySheet.tsx", "apps/web/src/modules/auth/otp/components/CodeBoxes.tsx", "apps/web/src/modules/auth/otp/components/WelcomeStep.tsx", "apps/web/src/modules/booking/components/SavedBooking.tsx", "apps/web/src/app/(site)/[locale]/match/[ref]/[key]/number/page.tsx", "apps/web/src/app/(site)/[locale]/match/[ref]/[key]/code/page.tsx", "apps/web/src/app/(site)/[locale]/login/page.tsx"]
---

# Phone sign-in (steps 3b, 3c and the standalone 9a, 9b)

## Scope and mode

Build. The `PhoneOtp` component of the design system handoff (`specs/design-system/README.md`, canvas screens 3b, 3c, 9a, 9b), spec 006 US1, US3, US4, US5. Two places, one component: at the end of the brief flow with the booking summary above it, and standalone from the header's account icon.

## Audience, job, action

A client on a phone who has just described a shoot and wants it kept, or a returning member or professional who wants in. Job: prove the number is theirs in two screens. One action per screen: "Send code" → "Continue" (or the device's autofill submits) → "Open WhatsApp" (brief flow) / "Done" (standalone first visit).

## Direction contract

THESIS: the Brief Bar holds one question at a time, and the number is asked only once there is something worth saving.

- **Number screen**: in the brief flow, the summary rows (sentence, creator per type, price) sit as `set` rows above the field, so the person sees what the number is for. The field is a `TextField` with a leading country segment fixed to +971 as a quiet button; tapping opens the country sheet (UAE first, searchable). The number formats as typed (`50 123 4567`). `type="tel"`, `inputmode="numeric"`, `autocomplete="tel-national"`, `dir="ltr"` on both sites, Western digits (Arabic-Indic typed → Western shown). Under the Top Hit "Send code": the `meta` line "We'll send a 6-digit code by SMS. Prefer WhatsApp?" where the last part is a quiet button; in the brief flow the line reads what the code does (signs you in, saves this booking, opens the chat).
- **Code screen**: the masked number in `body` with a quiet "Change number" at its end. Six 44×52 boxes, `radius-row`, `control-border`, 24 px tabular digits, 8 px gap, active box has the `focus` border; one real `<input autocomplete="one-time-code" inputmode="numeric" maxlength="6">` drives them (paste and SMS autofill), boxes are presentation; without scripting the single field shows. Primary "Continue", enabled at six digits; autofill may submit. Below: "Resend code in 0:42" as `meta` → quiet "Resend code" at zero; "Sent by SMS" / "Sent on WhatsApp". First visit adds a name field ("What should Omar call you?" in the brief flow, "Your name" standalone) and the acceptance line with the legal links above the primary. Errors as a `danger` message above the primary: wrong ("That code isn't right. 2 tries left"), expired ("That code expired. We sent a new one"), locked ("Too many tries. Sign in again in 15 minutes").
- **Saved state (brief flow)**: a `success` message ("Your booking is saved") replaces the boxes; the one Top Hit becomes "Open WhatsApp" (WhatsApp ink); a quiet "See your quotation" link under it.
- **Welcome (standalone only)**: role as two `ResultRow`s with labels from the CMS, the name field, the acceptance line, Top Hit "Done".
- **Confirm identity**: "Is this you, Omar?" as a `body` line with two rows, Yes / No; nothing else about the account.

## Proof and constraints

No password field anywhere in these screens. The number and the code never appear in an address. States are never colour-only: every message is text next to its control with `role="alert"`; the active box has a border change, not only a colour change. Touch targets ≥ 44 px (boxes 44 wide, rows 44 tall, the country button 44). Reduced motion: the sheet, the active box and the countdown do not animate. Keyboard: country button → field → channel button → Top Hit; code: field → resend → change number.

## Deliberately absent

"Log in / Register" tabs or question, a remember-me checkbox, social sign-in, a password or email field, a progress bar on the sign-in itself (the brief flow's steps already say "3 of 4"), illustrations, marketing copy beside the field.

## RTL and dark

Labels, messages and buttons flip; the number and code fields stay LTR with the +971 segment at the inline start of the field; Arabic digits typed are shown Western. Dark: tokens only (`control-border`, `danger`, `success`, `whatsapp-ink`); no flash. Verify 360 / 768 / 1024 / 1440, en / ar, light / dark before the finish review.
