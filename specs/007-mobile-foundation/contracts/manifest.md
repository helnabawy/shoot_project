# Contract: design manifest

- **Location:** `specs/design-system/canvas/manifest.json`.
- **Generator:** `build-manifest.mjs`, in the same folder. The manifest is never edited by hand.
- **Readers:** `tools/design-fidelity` (to render the references and to compare) and
  `apps/mobile/test/helpers/golden.dart` (screen sizes and box names).

## Shape

```jsonc
{
  "canvas": { "title": "…", "url": "https://claude.ai/artifact/…", "version": "1794329096-280b", "exportedAt": "2026-11-11T00:00:00Z" },
  "designSystem": { "title": "Shoot Design System", "url": "…", "version": "1794229253-2600" },
  "defaults": { "scale": 2, "threshold": 0.01, "geometryTolerancePx": 1, "reducedMotion": true },
  "screens": [
    {
      "id": "09",                       // canvas number, "01"–"43", unique
      "title": "Quick Match · details",
      "board": "S03-details.dc.html",   // file in this folder
      "w": 360, "h": 780,               // logical px
      "target": "mobile",               // "mobile" | "web"
      "feature": "012-mobile-quick-match",
      "variants": ["en-light", "en-dark", "ar-light", "ar-dark"],
      "boxes": { "header": ".hd", "wordmark": ".wm", "h1": ".h1", "topHit": ".top" },
      "threshold": 0.02,                // optional; requires "reason"
      "reason": "…",
      "variantOf": "21",                // only on designer variants 42, 43
      "sha256": "…",
      "changedSinceLastExport": true    // only when the board changed since the last export
    }
  ]
}
```

## Rules

1. **Box keys and app widget keys.** Every `boxes` key has a matching `Key` on the Flutter side:
   `ValueKey('fidelity:<name>')`, for example `ValueKey('fidelity:topHit')`. A box present on the
   board but missing in the app fails the geometry gate.
2. **Thresholds.** A `threshold` without a `reason` makes the check refuse that screen
   (MF-US1-S4). Raising a threshold also needs the owner's approval in the pull request.
3. **Changed boards.** `changedSinceLastExport` screens are listed at the top of the report as
   needing review (MF-US1-S5). The flag clears on the next export once the goldens are updated.
4. **Scope.** Only screens with `target: "mobile"` and a non-null `feature` are compared. Screens
   whose feature has not shipped are skipped, and their skip is listed in the report.
5. **Designer variants.** Screens with `variantOf` (42, 43) are used only by the derivation
   validation (MF-US2-S2).
6. **Box selectors.** A `boxes` selector must match exactly one element on the board. Zero or
   several matches fail the reference step.
