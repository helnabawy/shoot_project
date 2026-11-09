---
version: 1
slug: "first-visit"
primary_target: "apps/web/src/modules/landing/components/LearningSteps.tsx"
related_targets: ["apps/web/src/modules/landing/components/Splash.tsx", "apps/web/src/modules/landing/components/StepStage.tsx", "apps/web/src/shared/components/FirstVisitScript.tsx", "apps/web/src/app/(site)/[locale]/page.tsx", "apps/web/src/app/(site)/[locale]/how-it-works/page.tsx"]
---

# First visit: splash and three learning steps

## Scope and mode

Build. Design system handoff "First visit and where sign-in happens", canvas screens 0, 0a–0c; spec 006 US6. Shown once per device on the landing page; reachable again from the footer as `/how-it-works`.

## Audience, job, action

Someone who has never seen the site, on a phone. Job: understand in three screens that a shoot is one sentence, that the price and who's free are shown, and that the number is the account. One action per step: "Next", "Next", "Start a brief"; a quiet "Skip" in the header of every step.

## Direction contract

THESIS: the site explains itself with its own furniture, not with pictures.

- **Splash**: the wordmark at `display` weight on the studio sweep, the hero line under it, three pulsing dots in `ink` at 25–80 % opacity (still under reduced motion). Nothing to tap. It is the first paint (the inline head script adds `first-visit` to `<html>` before CSS paints) and fades as soon as the page is interactive, or after 900 ms, whichever first.
- **Steps**: a stage (the studio sweep, 400 px tall) holding a real component as the illustration, then `meta` "1 of 3", a 30 px `h2`, one `body` paragraph, progress dots, the primary action. Illustrations: a mini Brief Bar with a filled slot and an open one plus an occasion group with one row selected (built from the active audiences and option sets); two creator rows, one selected, under a Top Hit with the price; the phone field, the six code boxes and the "Open WhatsApp" Top Hit. Shapes are the system's components, never an illustration, mascot or stock image. Copy from the `first-visit` global per language.
- **Behaviour**: the panel sits over the landing page (`aria-modal` while shown); closing moves focus to the Brief Bar. Without scripting nothing shows. The landing content stays in the HTML beneath it.

## Proof and constraints

The landing page stays static and keeps LCP ≤ 2.5 s with the overlay as its first-visit LCP element: text and components only, no images, ≤ 3 KB of new JS. No counts, ratings or claims in the copy. Reduced motion: no pulsing, no transitions. Deep addresses never show it.

## Deliberately absent

A "Get started" account prompt, a sign-in or role question, a language or theme picker inside the steps (the header has both), an app-store style carousel with illustrations, auto-advance timers.

## RTL and dark

Progress dots and the stage mirror; the step counter uses the locale's digits in copy, while the phone and code illustration stays LTR with Western digits. Dark: the sweep and panel tokens; the splash uses the theme's ground before the theme script runs (the splash and the theme class are set by the same head script order: theme first). Verify 360 / 768 / 1024 / 1440, en / ar, light / dark.
