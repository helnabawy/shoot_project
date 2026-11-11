import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

void main() {
  // Research R3: size, weight, CSS line-height, letter-spacing in em.
  final roles = <String, (TextStyle, double, FontWeight, double?, double)>{
    'wordmark': (ShootType.wordmark, 22, FontWeight.w700, 1, -0.03),
    'display': (ShootType.display, 34, FontWeight.w700, 1.2, -0.03),
    'displaySignIn': (ShootType.displaySignIn, 30, FontWeight.w700, 1.2, -0.03),
    'title': (ShootType.title, 26, FontWeight.w700, 1.25, -0.025),
    'heading': (ShootType.heading, 20, FontWeight.w600, 1.3, -0.01),
    'action': (ShootType.action, 17, FontWeight.w600, 1.2, 0),
    'row': (ShootType.row, 16, FontWeight.w400, 1.3, 0),
    'button': (ShootType.button, 16, FontWeight.w500, 1.2, 0),
    'body': (ShootType.body, 15, FontWeight.w400, 1.6, 0),
    'chip': (ShootType.chip, 15, FontWeight.w400, 1.2, 0),
    'meta': (ShootType.meta, 13, FontWeight.w400, 1.4, 0),
    'badge': (ShootType.badge, 13, FontWeight.w500, 1.2, 0),
    'groupLabel': (ShootType.groupLabel, 11, FontWeight.w600, 1.3, 0.06),
  };

  for (final MapEntry(key: name, value: (style, size, weight, height, em))
      in roles.entries) {
    test('$name is ${size.toInt()}/${weight.value} at ${height}x, ${em}em', () {
      expect(style.fontSize, size);
      expect(style.fontWeight, weight);
      expect(style.height, height);
      // CSS em is relative to the font size.
      expect(style.letterSpacing, closeTo(em * size, 1e-9));
      // CSS splits the half-leading evenly; so must every role.
      expect(style.leadingDistribution, TextLeadingDistribution.even);
      expect(style.fontFamilyFallback, contains('Noto Sans Arabic'));
    });
  }

  test('the theme text styles use even leading', () {
    for (final theme in [AppTheme.light, AppTheme.dark]) {
      final t = theme.textTheme;
      for (final style in [
        t.displayLarge,
        t.headlineSmall,
        t.titleLarge,
        t.titleMedium,
        t.bodyLarge,
        t.bodyMedium,
        t.bodySmall,
        t.labelLarge,
        t.labelSmall,
      ]) {
        expect(style?.leadingDistribution, TextLeadingDistribution.even);
      }
      expect(t.bodyMedium?.fontSize, 15);
      expect(t.bodyLarge?.fontSize, 16);
    }
  });

  test('num adds tabular figures and keeps the role', () {
    final n = ShootType.num(ShootType.action);
    expect(n.fontFeatures, contains(const FontFeature.tabularFigures()));
    expect(n.fontSize, 17);
    expect(n.fontWeight, FontWeight.w600);
  });
}
