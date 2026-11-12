import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';
import 'package:shoot_mobile/core/theme/shoot_colors.dart';

void main() {
  test(
    'MA-US1-S3 the primary action follows the accent; Default keeps brand red',
    () {
      for (final accent in ShootAccent.values) {
        for (final brightness in Brightness.values) {
          final theme = AppTheme.of(accent, brightness);
          final colors = theme.extension<ShootColors>()!;
          final style = theme.filledButtonTheme.style!;

          final resting = style.backgroundColor!.resolve(<WidgetState>{});
          final pressed = style.backgroundColor!.resolve({WidgetState.pressed});
          final hovered = style.backgroundColor!.resolve({WidgetState.hovered});

          final label = '${accent.id} ${brightness.name}';
          if (accent == ShootAccent.brand) {
            expect(resting, const Color(0xFFE01414), reason: label);
            expect(pressed, const Color(0xFFC00F0F), reason: label);
            expect(hovered, pressed, reason: label);
          } else {
            expect(resting, colors.accent, reason: label);
            expect(pressed, isNot(colors.accent), reason: label);
            expect(hovered, pressed, reason: label);
            expect(colors.onPrimary, colors.onAccent, reason: label);
          }
          expect(style.foregroundColor!.resolve({}), colors.onPrimary);

          // Stock widgets follow the accent through ColorScheme.primary.
          expect(theme.colorScheme.primary, colors.accent, reason: label);
          expect(
            colors.accent,
            (brightness == Brightness.dark ? accent.dark : accent.light).accent,
            reason: label,
          );
        }
      }
    },
  );

  test('themes are built once per accent and brightness', () {
    expect(
      identical(
        AppTheme.of(ShootAccent.teal, Brightness.dark),
        AppTheme.of(ShootAccent.teal, Brightness.dark),
      ),
      isTrue,
    );
    expect(
      identical(
        AppTheme.light,
        AppTheme.of(ShootAccent.brand, Brightness.light),
      ),
      isTrue,
    );
    expect(
      identical(AppTheme.dark, AppTheme.of(ShootAccent.brand, Brightness.dark)),
      isTrue,
    );
  });
}
