import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_colors.dart';

/// WCAG 2.1 contrast ratio between two opaque colours.
double _contrast(Color a, Color b) {
  final la = a.computeLuminance();
  final lb = b.computeLuminance();
  return (math.max(la, lb) + 0.05) / (math.min(la, lb) + 0.05);
}

void main() {
  final themes = {'light': ShootColors.light, 'dark': ShootColors.dark};

  for (final MapEntry(key: name, value: c) in themes.entries) {
    // Text roles on the surfaces they sit on: AA needs 4.5:1.
    final pairs = <String, (Color, Color)>{
      'ink on ground': (c.ink, c.ground),
      'ink on panel-solid': (c.ink, c.panelSolid),
      'mute on ground': (c.mute, c.ground),
      'mute on panel-solid': (c.mute, c.panelSolid),
      'tile-ink on tile': (c.tileInk, c.tile),
      'on-accent on accent': (c.onAccent, c.accent),
      'accent-ink on panel-solid': (c.accentInk, c.panelSolid),
      'on-attention on attention': (c.onAttention, c.attention),
      'on-success on success': (c.onSuccess, c.success),
      'on-danger on danger': (c.onDanger, c.danger),
    };

    for (final MapEntry(key: pair, value: (fg, bg)) in pairs.entries) {
      test('$name: $pair meets WCAG AA (4.5:1)', () {
        expect(_contrast(fg, bg), greaterThanOrEqualTo(4.5));
      });
    }
  }

  test('each theme exposes its own roles through the ThemeData', () {
    expect(AppTheme.light.extension<ShootColors>(), ShootColors.light);
    expect(AppTheme.dark.extension<ShootColors>(), ShootColors.dark);
    expect(AppTheme.light.scaffoldBackgroundColor, ShootColors.light.ground);
    expect(AppTheme.dark.scaffoldBackgroundColor, ShootColors.dark.ground);
  });

  test('lerp ends on the other theme and copyWith replaces one role', () {
    expect(
      ShootColors.light.lerp(ShootColors.dark, 1).ground,
      ShootColors.dark.ground,
    );
    const ink = Color(0xFF000000);
    expect(ShootColors.light.copyWith(ink: ink).ink, ink);
    expect(
      ShootColors.light.copyWith(ink: ink).ground,
      ShootColors.light.ground,
    );
  });
}
