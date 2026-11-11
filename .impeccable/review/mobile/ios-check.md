# iOS check of screens 37 and 39 (feature 007, T071, 2026-11-11)

iPhone 17 simulator (402 × 874 pt), debug build, Flutter 3.47.9, the system face (SF Pro and SF
Arabic), so this is the by-eye check the pixel gate cannot make (SF may not be vendored).

- **Screen 37**, opened by launching on `/creators`, a known route not built yet (MF-US5-S5):
  `37-iphone-en-light.png`, `37-iphone-ar-light.png`.
  - Matches the board's structure and proportions: header, the 44 px tile, `404`, the heading, the
    body at 260 px, two hairline rows, the red Top Hit clear of the home indicator.
  - Arabic: the whole screen mirrors; the corner glow moves to the inline end; chevrons point left;
    the language action reads "English". The Arabic type rules (designer request) are not applied
    yet, so Arabic text uses the English line heights.
  - SF draws slightly wider than Roboto, so lines wrap a little differently from the Android-exact
    goldens, as expected.
- **Screen 39** cannot be triggered on a debug build (Flutter shows its own red error screen there;
  screen 39 is installed for release builds). It is covered by its goldens in four variants, the
  fidelity check (0.30 % and 0.31 %) and `error_page_test.dart`.
