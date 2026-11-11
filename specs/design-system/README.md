# Shoot design system — handoff

Decided 2026-11-09. Brand working name **Shoot** (Arabic **شوت**). Direction **A · Brief Bar II**
chosen over B (The Sentence) and C (The Thread).

| What | Where |
|---|---|
| Design system (brand book, tokens with contrast ratios, 13 components in LTR/RTL and light/dark, Arabic & RTL rules, motion & states, handoff notes) | https://claude.ai/artifact/JRVi8Z5AuEPujeFgE4Lqjk |
| Design canvas: three directions (page "Directions") and the screens (page "Screens": 40 screens at 360 px, numbered 01–40, landing at 1440 px (41), sign-in code and booking in Arabic dark (42, 43)) | https://claude.ai/artifact/HeYx13fA2XFumiydvHeoTV |
| **The screens, in the repo** (the source of truth for the app's pixel diff): every board, `canvas.json`, the design system's `tokens.json` (`ds-tokens.json`) and `manifest.json` (screen id → board file, size, variants, geometry boxes, threshold, sha256, owning feature) | [`canvas/`](canvas/) |
| The prompt the system was built from | [`../DESIGN-SYSTEM-PROMPT.md`](../DESIGN-SYSTEM-PROMPT.md) |
| Token CSS ready for `globals.css` and Tailwind v4 `@theme inline` | [`tokens.css`](tokens.css) |

Both artifacts are private until shared from their Share menu.

## What changed against the current site

- **Sign-in is mobile number + OTP** (SMS or WhatsApp), one flow for login and register. Email/password stays only as an editor fallback behind a footer link.
- **Sign-in happens at the end of the brief, not before it** (owner, 9 Nov): brief → choose a creator → details → *your number (3b)* → *code (3c)* → WhatsApp opens and the booking is saved. Step 3 no longer asks for a phone number. The standalone sign-in (9a/9b) stays for the header's account icon and for creators, and is the only place the role question is asked.
- **First visit**: a splash, then three skippable learning steps built from the real components (say it in one line; see the price and who's free; your number is your account), shown once per device. After the first booking, a one-time **Finish your account** checklist (number ✓, name ✓, email, language and theme) with a progress bar; nothing beyond number and name is mandatory. See the design system's section *First visit and where sign-in happens* and screens 0, 0a–0c, 3b, 3c and 7b on the canvas. This is a product change and needs its own spec before implementation (it adds an SMS/WhatsApp OTP provider, which the constitution requires a Complexity Tracking entry for).
- **New semantic roles**: `control-border`, `accent-ink` (replaces `selected-ink`), `selection-wash`, `success`/`on-success`, `danger`/`on-danger`, `whatsapp-ink`, sweep colours, message/photo/sheet/pill radii, `shadow-sheet`, motion tokens, size tokens.
- **Motion and graphics, revised 10 Nov** (design system Version 4, section *Motion and states*): motion has three tiers. *React* (120/180/260 ms) answers the person; *Arrive* (Rise, Focus, Roll, Tick, Grow, Deal, Write-in, Shake) plays once when a thing first appears; *Ambient* (Key light, Glint, Drift, Pulse, Tap) is rationed: only the landing loops, under one Pause control, and every other screen keeps self-started motion under 5 s (WCAG 2.2.2). All of it is CSS keyframes and transitions, no animation library, and `prefers-reduced-motion` removes it. Photo slots with no photo are **scene tiles**, the hero/splash/learning steps/confirmed booking sit on the **golden-hour scene** (inline SVG), other screens get a still corner glow. New tokens: `duration-rise` … `duration-pulse`, `stagger-step`, `ease-ambient`, `ease-drift`, `scene-*`, `scene-tile-*`, `scene-ink`, `corner-glow`, `glint-sheen`, `pulse-ring` (all in [`tokens.css`](tokens.css)). Not in the app code yet; needs a spec.
- **Components named in the system that the code does not have yet**: `PhoneOtp`, `StatusBadge`, `Chip`, `QuoteLines` as a standalone, `EmptyState` as a standalone. The rest map onto existing `.impeccable/surfaces/` work.

## How to take it into the codebase

1. Spec it: `/speckit-specify` for the OTP sign-in (feature 009, see `specs/ROADMAP.md`) and a small spec or tasks entry for the token swap.
2. Replace the token block in `apps/web/src/app/(site)/globals.css` with `tokens.css` (keep `.dark` as the theme selector; `[data-theme="dark"]` is there for parity with the design system's generated CSS).
3. Regenerate nothing in Payload; the change is presentational. Run `pnpm check:scenarios`, Lighthouse in both themes, and the RTL Playwright suite.
4. Update `DESIGN.md` from the shipped build with the impeccable documenter, so the repo's design record is derived from code, not from the artifact.

## The canvas in the repo (`canvas/`)

Exported 2026-11-11 from canvas version `1794329096-280b`. The Flutter app (features 007–015) is
built from these boards pixel-for-pixel, and the pipeline in `tools/design-fidelity/` (feature 007)
renders each board with Playwright and diffs it against the app's golden for the same screen. See
`.claude/skills/design-fidelity/SKILL.md`.

- Board files keep the canvas names (`S03-details.dc.html` is screen **09**). Use `manifest.json`
  to go from a screen number to its file; never guess from the name.
- Boards are plain HTML and CSS: 1 CSS px = 1 Flutter logical px. They load `./support.js` (the
  canvas runtime), which is not exported; the renderer stubs it.
- The boards hard-code hex colours. Only English light exists for 01–40, plus the designer's
  Arabic dark 42 (= 21) and 43 (= 13). Dark and Arabic references are derived in feature 007 and
  checked against 42 and 43.
- Never edit a board here. Change the canvas, then re-export:
  1. Read each `project/*.dc.html`, `project/canvas.json` and `project/ds/shoot/tokens.json` from
     the canvas artifact and copy them into `canvas/` (tokens as `ds-tokens.json`).
  2. `CANVAS_VERSION=<version> EXPORTED_AT=<now> node specs/design-system/canvas/build-manifest.mjs`.
     Boards whose sha256 changed are flagged `changedSinceLastExport`; their goldens must be
     re-checked.
