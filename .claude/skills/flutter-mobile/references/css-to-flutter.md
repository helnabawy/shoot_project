# CSS to Flutter: conversion rules

> The helpers named here (`shoot_shadows.dart`, `css_gradient.dart`, `shoot_type.dart`) are
> **planned** for feature 007. The formulas are fixed; the helper names may change in 007's plan.

The canvas boards are plain HTML and CSS with exact pixel values. 1 CSS px = 1 Flutter logical
pixel, and both the reference render and the golden use a device pixel ratio of 2. Most fidelity
failures come from the rows below, not from layout.

| CSS | Flutter | Formula / rule |
|---|---|---|
| `font-size: 34px` | `fontSize: 34` | copy |
| `font-weight: 700` | `FontWeight.w700` | copy |
| `letter-spacing: -0.03em` | `letterSpacing: -1.02` (at 34 px) | `em × fontSize`; `px` copies |
| `line-height: 1.25` | `height: 1.25` with `TextLeadingDistribution.even` | even leading is set once on the theme; always an explicit `height` |
| `line-height: 20px` | `height: 20 / fontSize` | convert to a multiplier, plus `even` |
| `font-variant-numeric: tabular-nums` | `fontFeatures: [FontFeature.tabularFigures()]` | in `shoot_type.dart`, on figures and money |
| `text-align: start` | `TextAlign.start` | never `left` |
| `box-shadow: x y B s c` | `BoxShadow(offset: Offset(x, y), blurRadius: r, spreadRadius: s, color: c)` | `r = max(0, (B/2 − 0.5) / 0.57735)` |
| `filter: blur(x)`, `backdrop-filter: blur(x)` | `ImageFilter.blur(sigmaX: x, sigmaY: x)` | CSS `x` is already σ |
| `linear-gradient(a, …)` | `CssLinearGradient` (`css_gradient.dart`) | gradient line through the centre at angle `a` (0deg = up, clockwise), length `|w·sin a| + |h·cos a|`; computed from the painted `Rect` |
| `radial-gradient(…)` | `CssRadialGradient` | default `ellipse farthest-corner at center`; the ellipse is a `GradientTransform` scale; supports `circle`, `closest-side` … `farthest-corner`, px sizes and `at <position>` |
| `border-radius: 14px` | `BorderRadius.circular(14)` | per-corner radii use `BorderRadiusDirectional` |
| `border: 1px solid var(--hair)` | `Border.all(color: colors.hair, width: 1)` | CSS borders sit inside the box with `box-sizing: border-box` (check the board's sizing) |
| `padding-inline-start: 16px` | `EdgeInsetsDirectional.only(start: 16)` | logical only |
| `inset-inline-end: 0` | `PositionedDirectional(end: 0)` | |
| `opacity: .86` on a panel | the role colour with its alpha (`panel` is already translucent) | do not wrap whole subtrees in `Opacity` |
| `transition: … 180ms var(--ease-standard)` | `ShootMotion.base`, `ShootMotion.standard` | see Motion in SKILL.md |
| `@media (prefers-reduced-motion)` | `MediaQuery.disableAnimationsOf(context)` | end state at once |

## Worked examples

**Shadow.** `--shadow-panel: 0 24px 60px rgba(40,25,12,.22)` → σ = 30 →
`blurRadius = (30 − 0.5) / 0.57735 ≈ 51.1`:

```dart
const BoxShadow(offset: Offset(0, 24), blurRadius: 51.1, color: Color(0x3828190C));
```

A naive `blurRadius: 60` gives σ ≈ 35.1, a visibly softer, wider halo that fails the diff around
every panel edge.

**Display.** `34px / 700 / line-height 1.2 / letter-spacing -0.03em`:

```dart
const TextStyle(
  fontSize: 34,
  fontWeight: FontWeight.w700,
  height: 1.2,
  leadingDistribution: TextLeadingDistribution.even, // also set once on the theme (007 R3)
  letterSpacing: -1.02,
);
```

Without `even`, the text sits about 1–3 px off vertically and the geometry gate fails on `.h1`.

## Physical CSS on a board

Boards are hand-written; some use `left`/`right`. Translate to the logical edge the design means.
CSS gradients and shadow offsets are physical in the browser, so the derived Arabic reference keeps
them unmirrored unless the board's CSS mirrors them (for example under `[dir="rtl"]`). Match the
reference: mirror a gradient or an x-offset in Arabic only when the reference does.

## Reading a failed diff

| What the diff shows | Usual cause |
|---|---|
| a uniform 1–3 px vertical shift of text | missing `TextLeadingDistribution.even` or a wrong `height` |
| text slightly wider or narrower, growing along the line | letter-spacing left in em, or the wrong font weight |
| a soft halo around panels or sheets | CSS blur pasted into `blurRadius` |
| banding or a shifted highlight in a gradient | `Alignment`-based gradient on a non-square box |
| an element on the wrong side in Arabic only | `left`/`right` or `EdgeInsets` instead of the directional API |
| colour off by a few levels everywhere | a raw hex instead of a role, or the wrong theme variant |
