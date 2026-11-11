# Test fonts (feature 007)

Test-only. The Flutter goldens and the board references (`tools/design-fidelity`) both draw with
these files, so the fidelity diff compares layout, not two different rasterisations of two faces
(research R7). They are **not** listed under `flutter: fonts:` in `pubspec.yaml`; the app itself
ships no font and uses the platform face.

| Files | Source | Licence |
|---|---|---|
| `Roboto-{Regular,Medium,SemiBold,Bold}.ttf` | `android/Roboto[ital,wdth,wght].ttf` from [googlefonts/roboto-3-classic](https://github.com/googlefonts/roboto-3-classic) release **v3.016** (2026-06-17), the variable face Android ships | SIL OFL 1.1, `OFL-Roboto.txt` |
| `NotoSansArabic-{Regular,Medium,SemiBold,Bold}.ttf` | `NotoSansArabic/full/ttf/` from [notofonts/arabic](https://github.com/notofonts/arabic) release **NotoSansArabic-v2.013** (2025-10-15), unchanged | SIL OFL 1.1, `OFL-NotoSansArabic.txt` |

The Roboto release has no static SemiBold (600), which the boards use for the Top Hit, headings and
group labels, so all four Roboto weights are static instances of the one variable font, made with
fontTools 4.60.1:

```bash
for pair in Regular:400 Medium:500 SemiBold:600 Bold:700; do
  fonttools varLib.instancer 'Roboto[ital,wdth,wght].ttf' wght=${pair##*:} wdth=100 ital=0 \
    --update-name-table -o Roboto-${pair%%:*}.ttf
done
```

Roboto is now under the OFL (the 007 plan said Apache 2.0; that was Roboto 2). SF Pro is never
vendored: its licence forbids it, so the pixel gate is exact for Android and iOS is checked by eye
in the simulator.
