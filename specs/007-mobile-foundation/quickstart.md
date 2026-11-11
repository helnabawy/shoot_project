# Quickstart: Mobile foundation

How to prove feature 007 works.

- Rules and values: [data-model.md](data-model.md).
- Commands and outputs: [contracts/fidelity-check.md](contracts/fidelity-check.md).
- Widgets: [contracts/component-catalogue.md](contracts/component-catalogue.md).
- Paths: [contracts/routes.md](contracts/routes.md).

## Prerequisites

- Flutter 3.47.9 and Dart 3.13.7 (see `apps/mobile/README.md`), plus Node 24 and pnpm (`nvm use`).
- macOS with that Flutter, for the goldens (`tool/goldens.sh` refuses another OS or version).
- Feature 006 merged: it provides `primary` and `PreferencesStore`.
- An iOS simulator and an Android emulator, for the manual checks.

## Automated checks

```bash
cd apps/mobile
dart format --set-exit-if-changed lib test
flutter analyze                      # no issues
flutter test                         # unit, cubit, widget (goldens skipped without GOLDENS=1)
tool/goldens.sh                      # component and screen goldens (macOS, pinned Flutter)
```

From the repository root:

```bash
pnpm install
pnpm --filter design-fidelity exec playwright install chromium
pnpm fidelity                        # references from the boards, then compare 37 and 39 in four variants
pnpm fidelity:report                 # side-by-side and overlay images per screen and variant
pnpm check:scenarios                 # includes specs/007-mobile-foundation/quickstart.md
```

Expected results:
- every screen and variant passes, with `diffRatio ≤ 0.01` and every box within 1 px;
- the report lists screens 01–36, 38 and 40 as skipped (their feature has not shipped);
- derivation passes for 21 vs 42 and for 13 vs 43.

Running `pnpm fidelity` twice gives identical results (SC-004).

## Manual checks

Run these in English and Arabic, light and dark, on a 360 px Android emulator, an iPhone simulator
and an iPad (768 and 1024).

1. Open `/does-not-exist`. Screen 37 shows and matches its board. "Start a brief" is the one red
   action.
2. Open `/ar/does-not-exist`. The same screen shows in Arabic, right to left.
3. In a debug build, trigger the error test route from the gallery. Screen 39 shows "Try again"
   and no technical text.
4. Open `/_gallery` in a debug build. Every component from the catalogue appears in each of its
   states. Switch language and theme from the gallery's own controls.
5. Turn on the largest text size. The gallery, screen 37 and screen 39 wrap and nothing is cut off.
6. Turn on VoiceOver and TalkBack. Every interactive component announces its name, role and state.
7. Turn on reduced motion and reopen screen 39. Nothing moves, and the first frame is the
   finished screen.
8. With reduced motion off, time screen 39's arrival. All motion is over within 5 s.
9. iOS (SF Pro, not covered by the automated gate): compare screens 37 and 39 with their boards by
   eye in the simulator, as part of the impeccable finish review.
10. Build a release version and open `/_gallery`. Screen 37 shows.

## Scenario → test mapping (Principle III)

Test names start with the id in the first column. Dart paths are under `apps/mobile/`; tool paths
are under `tools/design-fidelity/`.

| Id | Layer | Test file |
|----|-------|-----------|
| MF-US1-S1 screen 37 passes the fidelity check in English light with review images | fidelity | `tools/design-fidelity/tests/compare.spec.ts` |
| MF-US1-S2 a 2 px shift of the heading fails and names the element | fidelity | `tools/design-fidelity/tests/compare.spec.ts` |
| MF-US1-S3 a colour difference over the threshold fails with the ratio | fidelity | `tools/design-fidelity/tests/compare.spec.ts` |
| MF-US1-S4 a threshold override without a reason is refused | unit | `tools/design-fidelity/tests/manifest.spec.ts` |
| MF-US1-S5 boards changed since the last export are listed for review | unit | `tools/design-fidelity/tests/manifest.spec.ts` |
| MF-US2-S1 the tokenised English light render is identical to the raw board | fidelity | `tools/design-fidelity/tests/derivation.spec.ts` |
| MF-US2-S2 derived Arabic dark of 21 and 13 match boards 42 and 43 | fidelity | `tools/design-fidelity/tests/derivation.spec.ts` |
| MF-US2-S3 screen 37 passes in all four variants | fidelity | `tools/design-fidelity/tests/compare.spec.ts` |
| MF-US2-S4 an unmapped board colour fails the derivation with its name | unit | `tools/design-fidelity/tests/derivation.spec.ts` |
| MF-US3-S1 the gallery shows every catalogue component in every state | widget | `test/core/gallery/gallery_page_test.dart` |
| MF-US3-S2 components lay out right to left and mirror direction icons | widget | `test/core/widgets/rtl_test.dart` |
| MF-US3-S3 components wrap at the largest text size and keep 44 px targets | widget | `test/core/widgets/large_text_test.dart` |
| MF-US3-S4 interactive components announce name, role and state | widget | `test/core/widgets/semantics_test.dart` |
| MF-US3-S5 the gallery is unreachable in release builds | widget | `test/core/routing/app_router_test.dart` |
| MF-US4-S1 self-started motion ends within 5 seconds | widget | `test/core/motion/motion_policy_test.dart` |
| MF-US4-S2 with reduced motion the first frame is the finished state | widget | `test/core/motion/motion_policy_test.dart` |
| MF-US4-S3 the Pause control stops every ambient loop | widget | `test/core/motion/ambient_pause_test.dart` |
| MF-US5-S1 an unknown path shows screen 37 in the link's language | widget | `test/core/routing/app_router_test.dart` |
| MF-US5-S2 an /ar link opens in Arabic, right to left | widget | `test/core/routing/app_router_test.dart` |
| MF-US5-S3 a failure shows screen 39 with Try again and no technical text | widget | `test/core/routing/error_page_test.dart` |
| MF-US5-S4 the first-run flag survives a restart | unit | `test/core/first_run/first_run_store_test.dart` |
| MF-US5-S5 a known but unbuilt route shows screen 37 | widget | `test/core/routing/app_router_test.dart` |
