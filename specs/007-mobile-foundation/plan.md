# Implementation Plan: Mobile foundation (design system, shell and design-fidelity check)

**Branch**: `007-mobile-foundation` | **Date**: 2026-11-11 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-mobile-foundation/spec.md`

## Summary

This feature gives the Flutter app everything that every later screen is built on, and the means
to prove each screen matches its canvas board.

- **Tokens.** The app gets the type scale the boards use, plus the missing colour roles, shadows,
  sizes and motion tiers. Each value is mirrored in `specs/design-system/tokens.css` and checked
  for contrast by a test.
- **Widget library.** One design-system widget per board component, in `apps/mobile/lib/core/widgets/`,
  with a debug-only gallery.
- **Motion.** A small motion layer in `lib/core/motion/` honours reduced motion and caps
  self-started motion at 5 s.
- **Shell.** A router that mirrors the web paths, with the `/ar` prefix and a first-run flag.
  Unknown paths go to board 37 (not found) and failures to board 39 (something went wrong).
- **Fidelity check.** It has two halves:
  - **References.** A Playwright workspace, `tools/design-fidelity/`, renders each board to a
    reference image at 2× with reduced motion. It also derives the dark and Arabic variants through
    colour roles and an Arabic string table. The method is validated against the designer's boards
    42 and 43.
  - **Comparison.** Flutter golden tests render the same screen at the same size from shared
    fixtures. The compare step fails above 1 % (2 % for text-heavy screens) or when a key element
    is more than 1 px off. Each comparison attaches side-by-side and overlay images.
- **CI.** A new `mobile` job runs format, analyze, test, goldens and fidelity on every pull request.

## Technical Context

**Language/Version**:
- Dart 3.13.7 and Flutter 3.47.9 (stable), as pinned in `apps/mobile/README.md`.
- TypeScript strict on Node 24 for `tools/design-fidelity/`.

**Primary Dependencies**:
- Existing: `flutter_bloc`, `get_it`, `go_router` 18.1.4, `flutter_localizations` and `intl`.
- New in Flutter: `flutter_svg` (exact pin), for the icons and the golden-hour scene copied
  verbatim from the boards' SVG.
- New workspace: `tools/design-fidelity`, which reuses the repo's pinned `@playwright/test`
  1.63.0 and adds no new npm package.
- Preferences come from 006 (`shared_preferences`, through `PreferencesStore`).

**Storage**: one first-run key in the 006 `PreferencesStore`. Nothing else is stored.

**Testing**:
- Flutter: `flutter_test` unit and widget tests, `bloc_test`, and golden tests tagged `golden`.
- Playwright: projects `refs` and `compare` in `tools/design-fidelity/`.
- Every test name carries its scenario id (`MF-…`).

**Target Platform**:
- iOS (iPhone and iPad) and Android phones.
- Goldens are made and checked on macOS only, with the pinned Flutter 3.47.9: on the owner's Mac
  through `tool/goldens.sh`, and in CI on a macOS runner. (Amended 2026-11-11: the plan first named a
  Linux image, `ghcr.io/cirruslabs/flutter`, which is not published for this Flutter version; the
  owner chose macOS.)

**Project Type**: mobile app (`apps/mobile`, clean architecture with a shared `core/`), plus a
repository tool workspace.

**Performance Goals**:
- Screens build in one frame.
- The arrive motion uses implicit and explicit animations with no per-frame layout work.
- The fidelity job finishes in under 10 minutes for screens 37 and 39 and the gallery.

**Constraints**:
- WCAG 2.1 AA on every text role, in both themes.
- English LTR and Arabic RTL, using directional APIs only.
- Reduced motion is honoured; self-started motion lasts at most 5 s.
- The app bundles no fonts.
- Results are deterministic: fixed clock, test fonts, `debugDisableShadows = false`.

**Scale/Scope**:
- About 35 widgets, 2 screens and 1 gallery.
- 43 manifest entries.
- 4 variants per screen.
- 5 self-baseline sizes: 393, 430, 768×1024, 1024×1366, and text scale 2.0.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (below).*

| Principle | Status | How this plan meets it |
|---|---|---|
| I. Spec-driven | Pass | Spec 007 is written and validated. This plan comes next, then tasks, then analyze. |
| II. Performance budgets | Pass | No web change. Mobile adds no network or font bytes. Icons are SVG drawn once. |
| III. Test-first | Pass | Every scenario maps to a named test ([quickstart.md](quickstart.md)). Widget tests and goldens are written before the widgets. The goldens come from the boards, which are designed before any code. |
| IV. Content in the CMS | Pass | Widgets carry no copy (FR-015). The texts on screens 37 and 39 are interface strings in ARB. The WhatsApp number on screen 39 comes from site data (feature 008), with a hidden fallback until then. |
| V. Modular | Pass | All new app code lives in `lib/core/`. The tool is its own workspace and imports nothing from `apps/web`. |
| VI. Accessible, bilingual, themed | Pass | Four variants are checked per screen and component. Also covered: 44 px targets, large text, screen-reader semantics, verification at 360, 768 and 1024, and reduced motion. |
| VII. Secure by default | Pass | Nothing sensitive is stored. The gallery is excluded from release builds by `kDebugMode` tree-shaking and is not routable. |
| VIII. Simplicity | Pass with justification | One Flutter package, one tool workspace, a few vendored test-only fonts. See Complexity Tracking. |
| IX. Designed, not generated | Pass with gate | The boards are the design authority. The impeccable detector reads HTML and CSS, not Dart, so for app screens the gate works through images: the detector runs on the boards themselves (the HTML the app must match), and the finish review is done on the app's four variant goldens and the side-by-side and overlay review images, plus the iOS simulator check. The fidelity check then holds the app to the reviewed boards. |
| Stack | Pass | Constitution 1.4.0 mobile stack. Playwright is already the repo's end-to-end tool. |

## Project Structure

### Documentation (this feature)

```text
specs/007-mobile-foundation/
├── spec.md
├── plan.md              # this file
├── research.md          # Phase 0 decisions R1–R12
├── data-model.md        # manifest, variants, references, comparison results, tokens, routes
├── quickstart.md        # how to verify; scenario → test mapping
├── contracts/
│   ├── manifest.md            # specs/design-system/canvas/manifest.json schema and rules
│   ├── fidelity-check.md      # commands, inputs, outputs, exit codes, report layout
│   ├── component-catalogue.md # every widget: board class, measurements, states, semantics
│   └── routes.md              # path table mirrored from the web, /ar, fallbacks
├── checklists/requirements.md
└── tasks.md             # /speckit-tasks
```

### Source Code

```text
specs/design-system/
├── tokens.css                       # + --text-*, + new colour roles (body-ink, …) light and dark
└── canvas/                          # boards, canvas.json, ds-tokens.json, manifest.json, build-manifest.mjs
    └── strings.ar/<board>.json      # Arabic copy per board, same text as the ARB and fixtures (R6)

tools/design-fidelity/               # new pnpm workspace (pnpm-workspace.yaml gains "tools/*")
├── package.json                     # @playwright/test 1.63.0 (same pin as apps/web)
├── playwright.config.ts             # projects: refs, compare (compare depends on refs)
├── src/
│   ├── manifest.ts                  # load and validate manifest.json (R2)
│   ├── tokenise.ts                  # hex → var(--role) using tokens.css (R5)
│   ├── localise.ts                  # dir=rtl lang=ar + strings.ar swap (R6)
│   ├── fonts.ts                     # @font-face from apps/mobile/test/fonts (R7)
│   └── review.ts                    # side-by-side and overlay drawn in a page canvas (R9)
├── tests/
│   ├── refs.spec.ts                 # renders references and key-element boxes
│   ├── manifest.spec.ts             # MF-US1-S4, S5
│   ├── derivation.spec.ts           # MF-US2-S1, S2, S4
│   └── compare.spec.ts              # MF-US1-S1..S5, MF-US2-S3
└── build/                           # git-ignored: refs/, report/

apps/mobile/
├── pubspec.yaml                     # + flutter_svg (exact pin)
├── dart_test.yaml                   # tags: golden
├── tool/goldens.sh                  # runs goldens on macOS with the pinned Flutter; --update
├── assets/icons/*.svg               # icon paths copied from the boards
├── lib/core/
│   ├── theme/
│   │   ├── shoot_colors.dart        # + bodyInk, surfaceSunk, scene shades (R4)
│   │   ├── shoot_type.dart          # type scale (R3)
│   │   ├── shoot_shadows.dart       # cssShadow() (R8)
│   │   ├── shoot_scene.dart         # ThemeExtension: scene, sweep, glow colours
│   │   ├── css_gradient.dart        # CSS linear/radial gradient → Flutter (R8)
│   │   └── shoot_tokens.dart        # + header 58, carousel ratio, arrive/ambient tiers
│   ├── motion/                      # motion_policy.dart, rise.dart, focus_in.dart, roll.dart, draw_check.dart,
│   │                                # grow.dart, deal.dart, write_in.dart, shake.dart, glint.dart, ambient_pause.dart
│   ├── widgets/                     # one file per component (contracts/component-catalogue.md)
│   ├── routing/
│   │   ├── app_routes.dart          # the one path table (contracts/routes.md)
│   │   ├── app_router.dart          # /ar prefix, first-run redirect, fallbacks
│   │   ├── not_found_page.dart      # board 37
│   │   └── error_page.dart          # board 39 (+ ErrorWidget.builder / FlutterError hook)
│   ├── first_run/first_run_store.dart
│   └── gallery/gallery_page.dart    # debug builds only
└── test/
    ├── flutter_test_config.dart     # loads test fonts, debugDisableShadows = false, fixed clock
    ├── fonts/                       # Roboto (400/500/600/700), Noto Sans Arabic (400/500/600/700) + licences
    ├── helpers/golden.dart          # pumpBoard(id, variant): size, dpr 2, locale, theme, writes boxes.json
    ├── core/theme/…_test.dart       # type, colours, shadows, gradients
    ├── core/motion/…_test.dart
    ├── core/widgets/…_test.dart     # widget test + component golden per widget
    ├── core/routing/…_test.dart
    └── goldens/screens/
        ├── 37_not_found_golden_test.dart
        ├── 39_error_golden_test.dart
        └── goldens/<id>/<variant>.png (+ .boxes.json); self-baselines under goldens/<id>/self/

.github/workflows/ci.yml             # + job `mobile`
package.json                         # + "fidelity" script; check:scenarios + 007 quickstart
scripts/check-scenario-tests.mjs     # search apps/mobile/test and tools/design-fidelity/tests (with 006 R7)
```

**Structure Decision**:
- Everything in this feature is cross-cutting design-system and shell code, so it lives in
  `apps/mobile/lib/core/`, as the README prescribes.
- Screens 37 and 39 are shell pages under `core/routing/`. They are not product features.
- The comparison tool is a repository workspace under `tools/`, so the web app's dependency tree
  is untouched. A later web-fidelity check (board 41) can reuse it.

## Post-design Constitution re-check

Nothing changed after Phase 1. The data model is files only, with no server data. The contracts
are internal: the manifest, the CLI, the widget catalogue and the route table. Every new
dependency is justified below. The gate passes.

## Complexity Tracking

| Addition | Why needed | Simpler alternative rejected because |
|---|---|---|
| `flutter_svg` package | The boards draw about 30 icons and the golden-hour scene as inline SVG (stroke 2.2, round caps). Copying the paths verbatim is the only way to be pixel-exact. | Material icons have a different geometry and would fail the diff. Hand-porting arcs into `Path` code drifts and is slow to review. `vector_graphics` needs a compile step and the `vector_graphics_compiler` package. |
| `tools/design-fidelity` workspace | FR-041 to FR-045 need a browser render of each board. Playwright already renders and image-diffs in this repo. | Putting it in `apps/web` would couple the app's checks to the web's build. A Dart image-diff would need an `image` package plus a headless browser anyway. |
| Vendored test fonts (Roboto, Noto Sans Arabic; both OFL) | Flutter tests draw text with the Ahem box font by default. Both sides of the diff must draw the same glyphs (FR-048). | Using system fonts is not deterministic across machines. SF Pro may not be redistributed. |
| macOS-only goldens (amended 2026-11-11 from Linux in Docker) | Rasterisation differs across operating systems. One platform makes the result repeatable (SC-004); the owner works on a Mac, and a macOS CI runner checks the same rasteriser. | Per-OS goldens triple the baselines and still disagree with the reference renderer. A local Linux image costs a 2 GB build and runs under emulation on Apple silicon. |
| Derived dark and Arabic references | Only English light boards exist for 01–40. FR-042 needs all four variants. | Asking the designer for about 120 more boards delays every feature. The derivation is validated against boards 42 and 43 instead. If it fails validation, the fallback is to ask the designer (research R5). |
