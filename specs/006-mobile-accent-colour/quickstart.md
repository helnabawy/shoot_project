# Quickstart: Mobile accent colour setting

How to prove feature 006 works. Values and rules: [data-model.md](data-model.md); the sheet: [contracts/appearance-sheet.md](contracts/appearance-sheet.md); storage: [contracts/preferences-store.md](contracts/preferences-store.md).

## Prerequisites

- Flutter 3.47.2 / Dart 3.13.2 (see `apps/mobile/README.md`).
- An iOS simulator or Android emulator for the manual checks. The web app is not needed: this feature makes no network calls.

## Automated checks

```bash
cd apps/mobile
flutter pub get
flutter analyze            # no issues
flutter test               # all pass, including every MA- test below
```

From the repository root:

```bash
pnpm check:scenarios       # includes specs/006-mobile-accent-colour/quickstart.md
```

## Manual checks (in English and Arabic, light and dark; on a 360 px-wide phone and on an iPad in portrait, 768 px, and landscape, 1024 px)

1. Fresh install, launch: the app looks as before (blue selection) except that primary buttons are now the fixed red (SC-005).
2. Tap the Appearance button: the sheet shows Theme (Match device checked) and Accent colour (Blue checked, first).
3. Tap Violet: the caret, focus ring, progress and any selected row or tile turn violet while the sheet is open; the primary button stays red.
4. Switch to Dark in the same sheet: the swatches and the app switch to the dark values.
5. Switch the language to Arabic: the sheet reads right to left with Arabic names, Violet still checked.
6. Fully close the app (swipe it away) and launch it again: it opens in Arabic, dark, violet, with no blue frame first.
7. Turn on the largest system text size: the rows grow and names wrap; every row is still easy to tap.
8. Turn on VoiceOver / TalkBack: each option is announced with its name and whether it is selected.
9. Time it: from any screen with the app bar, changing the accent takes under 10 seconds (SC-001).
10. Turn on airplane mode and repeat steps 2–3: the setting works offline (FR-013).

## Scenario → test mapping (Principle III)

Test names start with the id in the first column. Paths are under `apps/mobile/`.

| Id | Layer | Test file |
|----|-------|-----------|
| MA-US1-S1 first launch lists the accents in order, Blue first and selected | widget | `test/core/widgets/appearance_sheet_test.dart` |
| MA-US1-S2 tapping an accent applies it to every selection role at once | widget | `test/core/widgets/appearance_sheet_test.dart` |
| MA-US1-S3 the primary action colour is the same under every accent | unit | `test/core/theme/app_theme_test.dart` |
| MA-US1-S4 Arabic names, right to left, choice kept | widget | `test/core/widgets/appearance_sheet_test.dart` |
| MA-US1-S5 each option announces name and selected state | widget | `test/core/widgets/appearance_sheet_test.dart` |
| MA-US2-S1 a saved accent is applied on the first frame | widget | `test/app_test.dart` |
| MA-US2-S2 theme mode and language are restored | unit (cubit) | `test/core/preferences/appearance_cubits_test.dart` |
| MA-US2-S3 an unknown saved accent falls back to Blue | unit (cubit) | `test/core/preferences/appearance_cubits_test.dart` |
| MA-US2-S4 unreadable preferences give the defaults without an error | unit (cubit) | `test/core/preferences/appearance_cubits_test.dart` |
| MA-US3-S1 every accent passes every contrast pair in both themes | unit | `test/core/theme/accent_palette_test.dart` |
| MA-US3-S2 no accent is close to the primary red or the danger state | unit | `test/core/theme/accent_palette_test.dart` |
