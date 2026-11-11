import 'dart:math' as math;
import 'dart:ui' show Brightness;

import 'package:flutter/painting.dart';

/// A CSS `box-shadow` as a [BoxShadow] that paints the same blur.
///
/// CSS blurs with sigma = blur / 2; Flutter turns `blurRadius` r into sigma = 0.57735·r + 0.5.
/// So `blurRadius = (blur / 2 − 0.5) / 0.57735`. Offsets and spread copy as they are.
BoxShadow cssShadow(
  double x,
  double y,
  double blur,
  double spread,
  Color color,
) => BoxShadow(
  offset: Offset(x, y),
  blurRadius: math.max(0, (blur / 2 - 0.5) / 0.57735),
  spreadRadius: spread,
  color: color,
);

/// The shadows in `tokens.css`, per theme.
final class ShootShadows {
  const ShootShadows._({
    required this.panel,
    required this.sheet,
    required this.lift,
  });

  /// `--shadow-panel`: the floating Brief Bar panel.
  final List<BoxShadow> panel;

  /// `--shadow-sheet`: bottom sheets, cast upwards.
  final List<BoxShadow> sheet;

  /// `--shadow` (lift): cards and photo tiles.
  final List<BoxShadow> lift;

  static final light = ShootShadows._(
    panel: [cssShadow(0, 24, 60, 0, const Color.fromRGBO(40, 25, 12, 0.22))],
    sheet: [cssShadow(0, -8, 32, 0, const Color.fromRGBO(40, 25, 12, 0.14))],
    lift: [cssShadow(0, 1, 2, 0, const Color.fromRGBO(0, 0, 0, 0.06))],
  );

  static final dark = ShootShadows._(
    panel: [cssShadow(0, 24, 60, 0, const Color.fromRGBO(0, 0, 0, 0.5))],
    sheet: [cssShadow(0, -8, 32, 0, const Color.fromRGBO(0, 0, 0, 0.5))],
    lift: [cssShadow(0, 1, 2, 0, const Color.fromRGBO(0, 0, 0, 0.4))],
  );

  static ShootShadows of(Brightness brightness) =>
      brightness == Brightness.dark ? dark : light;
}
