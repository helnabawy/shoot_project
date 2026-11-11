import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';
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
      'on-primary on primary': (c.onPrimary, c.primary),
      'on-primary on primary-hover': (c.onPrimary, c.primaryHover),
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
    // The default theme is Blue, whose roles are the original base values.
    for (final (theme, base) in [
      (AppTheme.light, ShootColors.light),
      (AppTheme.dark, ShootColors.dark),
    ]) {
      final c = theme.extension<ShootColors>()!;
      expect(c.ground, base.ground);
      expect(c.ink, base.ink);
      expect(c.accent, base.accent);
      expect(c.accentInk, base.accentInk);
      expect(c.selected, base.selected);
      expect(c.focus, base.focus);
      expect(c.primary, base.primary);
      expect(theme.scaffoldBackgroundColor, base.ground);
    }
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

  test('primary roles are the same in both themes and never accent-driven', () {
    expect(ShootColors.light.primary, const Color(0xFFE01414));
    expect(ShootColors.light.primaryHover, const Color(0xFFC00F0F));
    expect(ShootColors.light.onPrimary, const Color(0xFFFFFFFF));
    expect(ShootColors.dark.primary, ShootColors.light.primary);
    expect(ShootColors.dark.primaryHover, ShootColors.light.primaryHover);
    expect(ShootColors.dark.onPrimary, ShootColors.light.onPrimary);
  });

  test('withAccent replaces exactly the seven accent roles', () {
    for (final MapEntry(key: base, value: roles) in {
      ShootColors.light: ShootAccent.violet.light,
      ShootColors.dark: ShootAccent.violet.dark,
    }.entries) {
      final c = base.withAccent(roles);
      expect(c.accent, roles.accent);
      expect(c.onAccent, roles.onAccent);
      expect(c.accentInk, roles.accentInk);
      expect(c.selected, roles.selected);
      expect(c.selectedHover, roles.selectedHover);
      expect(c.selectionWash, roles.selectionWash);
      expect(c.focus, roles.focus);

      // Everything else is untouched, including the primary roles.
      expect(c.primary, base.primary);
      expect(c.primaryHover, base.primaryHover);
      expect(c.onPrimary, base.onPrimary);
      expect(c.ground, base.ground);
      expect(c.panelSolid, base.panelSolid);
      expect(c.ink, base.ink);
      expect(c.attention, base.attention);
      expect(c.success, base.success);
      expect(c.danger, base.danger);
      expect(c.whatsappInk, base.whatsappInk);
    }
  });

  test('copyWith and lerp carry the primary roles', () {
    const red = Color(0xFFAA0000);
    final changed = ShootColors.light.copyWith(
      primary: red,
      primaryHover: red,
      onPrimary: red,
    );
    expect(changed.primary, red);
    expect(changed.primaryHover, red);
    expect(changed.onPrimary, red);

    const other = ShootColors.dark;
    final end = changed.lerp(other, 1);
    expect(end.primary, other.primary);
    expect(end.primaryHover, other.primaryHover);
    expect(end.onPrimary, other.onPrimary);
    expect(changed.lerp(other, 0).primary, red);
  });
}
