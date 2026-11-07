---
version: 1
slug: "provider-profile"
primary_target: "apps/web/src/app/(site)/[locale]/account/profile/page.tsx"
related_targets: ["apps/web/src/modules/creators/components/ProfileForm.tsx", "apps/web/src/modules/creators/components/SampleManager.tsx", "apps/web/src/modules/creators/components/StatusBanner.tsx", "apps/web/src/modules/auth/components/AccountSummary.tsx"]
---

# My profile (provider)

## Scope and mode

Operate. `/account/profile`, the signed-in provider's one-page editor for their public profile: status, basics, specialties and places, samples, links. Feature 002 (US3). Inherits The Brief Bar and the account page's 560 px column; extends the account summary with a "My profile" row for providers only. The admin's review happens in Payload and is out of this surface.

## Audience, job, action

Creators (photographers and videographers today, any profession tomorrow) who registered as providers, on a phone as often as a laptop, often in Arabic, setting up once and returning to adjust. Job: complete a profile in under 10 minutes (SC-003), understand at every moment what the public sees, and get it approved. Primary action (one per state, in the closing bar at the end of the form): "Save and send for review" when the profile is complete and not yet live or has pending changes; "Save" otherwise; "Save and publish" when the site publishes verified creators' edits immediately. Secondary actions are rows: "View my public profile", "Hide my profile" / "Show my profile", "Save without sending".

## Proof and constraints

The page shows the provider's own data and the admin's review note, nothing else. Never promise approval times. The upload note is honest: "Images you upload can be opened by anyone who has their link, even before your profile is approved." Limits are stated where they bite (30 samples, 5 MB, JPEG/PNG/WebP), in plain words. Works without JavaScript: one form for the profile fields, sample actions as buttons in the same form; uploads with JavaScript show a preview and progress. EN/AR; light and dark; WCAG AA; touch targets 44 px.

## Direction history

2026-11-07 (T004 shaping): one page in sections, not a wizard, as research §15 decided (the brief builder's step-by-step suits a one-sentence brief, not a profile edited over weeks). No owner choice was needed beyond the two directory and profile decisions.

## Direction contract

THESIS: The profile editor is the account page continued: a quiet stack of field rows on the ground, bracketed by two small bars, a status bar at the top that says what the public sees and a closing bar at the end that holds the one action. It refuses the dashboard default (progress rings, completion percentages, tabs, a sidebar of steps) and the long form with a button at every section.

OWN-WORLD: Inherited from DESIGN.md: fields are bar rows (13 px mute label, 44 px input, hairline stroke, 9 px corners), section titles at Section Title size, hairlines between groups, peach for attention. The two bars are `size="sm"` panels, the page's two panels (The Two Panels Rule). Localised fields are pairs: English and Arabic side by side from 640 px, stacked below it with the page language's field first; each input carries its own `lang` and `dir`, and its label names the language in that language ("English", "العربية"). The sample manager reuses the photo tile from `creators-directory.md` (44 px) as each sample row's thumbnail.

STORY: The provider opens "My profile" from their account. The status bar reads their state in one row (Draft, Waiting for review, Live, Live with changes waiting for review, Hidden by you, Suspended) with what it means in a meta line ("The public sees the version approved on 3 Nov. Your changes are waiting for review."), the admin's review note as a peach message when there is one, and the secondary actions as rows. Below, on the ground: Basics (display name, bio), Specialties and places (professional types, specialties grouped under each type, cities grouped under each emirate, languages), Samples (the list, then "Add a sample"), Links (up to six). A completeness line sits above the closing bar and names exactly what is missing ("Add a city and a language to send for review."). The closing bar holds the Top Hit for the current state; when the profile is complete and unsent, a "Save without sending" row sits under it.

FIRST VIEWPORT: Phone 390 px: the quiet top bar; headline "My profile" (Headline style); the status bar (state row, meaning, review note if any, "View my public profile" row); the first fields of Basics peek below. Desktop: the same at 560 px centred, localised pairs side by side.

SIGNATURE INTERACTION: The page always answers "what does the public see?". The status bar updates after every save without moving the page; field errors appear next to their field as one plain sentence and the page scrolls to the first; a successful save confirms in the status bar's meta line, not with a toast. Samples are rows (thumbnail tile, caption pair, specialty select, trailing move up / move down / remove buttons at 44 px); moving or removing is immediate in the draft and announced politely to screen readers. "Add a sample" opens a row with the file control (image) or the URL field (video link, poster required), and refuses a wrong type or oversize file before upload with JavaScript and after it without. Hiding the profile is a single row action with a one-line confirmation in place, never a modal.

FORM: The account page and macOS System Settings forms: labels above fields, one column, sections by hairline, actions at the end. Raises kept: one rhythm for every field; state in words, not icons; one action per screen. Surface-scope addition: no new concept roll. It inherits the owner-pinned Spotlight world (re-roll round 1 of seed 0ba1ece0, recorded in the landing contract).

FINISH: unreviewed and undocumented is unfinished; this surface ends with the impeccable detector, captures at 360 and 1440 px in en/ar and light/dark, a keyboard-only pass of the whole form, a `ship` finish review, and the documenter recording the localised field pair, the sample row and the status bar in DESIGN.md.

## States and ranges

- Status: draft, in review, live, live with changes, paused (hidden by the provider), suspended (by an admin: the bar says so, shows the review note, offers no action except contact on WhatsApp).
- Auto-publish on (Site settings): the live state's action is "Save and publish"; the status line says changes go live at once.
- First visit: the profile does not exist until the first save; the form is prefilled with the registration persona and categories, display name from the account name.
- Samples 0 to 30: at 30 the add row is replaced by "You have 30 samples, the most a profile can have."; upload refused for type, size, the 60-file account quota or the hourly limit, each with its own sentence.
- Personas: a provider may offer up to four types; a type that has left the site's audience stays if already chosen and is marked "not shown on the site right now"; specialties list only those of the chosen types.
- Validation: display name 2 to 60, bio up to 600 per language, captions up to 140; English required for the name, Arabic optional (English shown in its place).

## Deliberately absent

Completion percentages, progress rings, gamified prompts, tabs or a stepper, toasts, modals for confirmation, autosave, a live preview pane beside the form (the "View my public profile" row opens the real page), approval time promises.

## RTL and dark

Field pairs put the page language first in reading order; Arabic inputs right-to-left, English inputs left-to-right regardless of page direction; counters and codes isolated LTR. Sample row controls on the end side; move up / move down are vertical and never flip. Dark: peach review note uses night attention under night on-attention; the photo tile in sample rows is unbordered.

## Constraints and open decisions

- Components: `BriefBar` (size `sm`, twice), `ResultGroup`, `ResultRow`, `TopHit`, `GlyphTile`, the shared `Field`, `Input`, `FormError` parts, the photo tile; the sample uploader is the page's only client island beyond form enhancement.
- Server actions per `contracts/routes-and-actions.md`; uploads go through the `addSample` action (6 MB body limit); the profile and its listing are always the signed-in user's.
- Copy in `messages/{en,ar}.json` (`creators.form.*`, `creators.status.*`, `creators.samples.*`, error keys).
- Open: whether providers can preview the pending draft as the public would see it is not in scope; the status line states the difference instead.
