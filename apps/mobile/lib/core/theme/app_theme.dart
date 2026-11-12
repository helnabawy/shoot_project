import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';
import 'package:shoot_mobile/core/theme/shoot_colors.dart';
import 'package:shoot_mobile/core/theme/shoot_scene.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// Builds the Material themes from the semantic roles in [ShootColors], so
/// stock widgets pick up the tokens and custom widgets read the roles
/// directly through [ShootThemeX.colors].
///
/// The accent decides the selection roles and the primary action colour, so
/// the choice is visible on every screen. The default ([ShootAccent.brand])
/// keeps the brand red primary.
abstract final class AppTheme {
  static final Map<(ShootAccent, Brightness), ThemeData> _cache = {};

  /// The theme for [accent] in [brightness], built once per pair.
  static ThemeData of(ShootAccent accent, Brightness brightness) {
    return _cache.putIfAbsent((accent, brightness), () {
      final dark = brightness == Brightness.dark;
      final roles = dark ? accent.dark : accent.light;
      var colors = (dark ? ShootColors.dark : ShootColors.light).withAccent(
        roles,
      );
      if (accent == ShootAccent.brand) return _build(colors, brightness);
      final hsl = HSLColor.fromColor(roles.accent);
      final hover = hsl
          .withLightness((hsl.lightness + (dark ? 0.06 : -0.06)).clamp(0, 1))
          .toColor();
      colors = colors.copyWith(
        primary: roles.accent,
        primaryHover: hover,
        onPrimary: roles.onAccent,
      );
      return _build(colors, brightness);
    });
  }

  static final ThemeData light = of(ShootAccent.brand, Brightness.light);
  static final ThemeData dark = of(ShootAccent.brand, Brightness.dark);

  static ThemeData _build(ShootColors c, Brightness brightness) {
    final isDark = brightness == Brightness.dark;
    final scheme = ColorScheme(
      brightness: brightness,
      primary: c.accent,
      onPrimary: c.onAccent,
      secondary: c.accentInk,
      onSecondary: c.panelSolid,
      // The danger roles are tinted backgrounds; Material's `error` is used
      // as a foreground, so it takes the on-danger ink.
      error: c.onDanger,
      onError: isDark ? c.danger : c.onAccent,
      errorContainer: c.danger,
      onErrorContainer: c.onDanger,
      surface: c.panelSolid,
      onSurface: c.ink,
      onSurfaceVariant: c.mute,
      surfaceContainerHighest: c.tile,
      outline: c.controlBorder,
      outlineVariant: c.hair,
    );

    // No fontFamily: the platform face, like the web stack (SF / Roboto). Arabic falls back to
    // Noto Sans Arabic (ShootType). The app bundles no font.
    final base = ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
    );

    // The board roles (research R3) fill Material's text theme so stock widgets match too.
    final text = base.textTheme
        .merge(
          TextTheme(
            displayLarge: ShootType.display,
            displayMedium: ShootType.display,
            displaySmall: ShootType.display,
            headlineLarge: ShootType.display,
            headlineMedium: ShootType.title,
            headlineSmall: ShootType.title,
            titleLarge: ShootType.heading,
            titleMedium: ShootType.action,
            titleSmall: ShootType.button,
            bodyLarge: ShootType.row,
            bodyMedium: ShootType.body,
            bodySmall: ShootType.meta,
            labelLarge: ShootType.button,
            labelMedium: ShootType.badge,
            labelSmall: ShootType.groupLabel,
          ),
        )
        .apply(bodyColor: c.ink, displayColor: c.ink);

    return base.copyWith(
      scaffoldBackgroundColor: c.ground,
      canvasColor: c.ground,
      dividerColor: c.hair,
      focusColor: c.focus.withValues(alpha: 0.24),
      textTheme: text,
      textSelectionTheme: TextSelectionThemeData(
        cursorColor: c.accent,
        selectionColor: c.selectionWash,
        selectionHandleColor: c.accent,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: c.ground,
        foregroundColor: c.ink,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: text.titleLarge?.copyWith(fontWeight: FontWeight.w600),
      ),
      dividerTheme: DividerThemeData(color: c.hair, thickness: 1, space: 1),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          foregroundColor: c.ink,
          minimumSize: const Size.square(ShootSize.iconButton),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style:
            FilledButton.styleFrom(
              backgroundColor: c.primary,
              foregroundColor: c.onPrimary,
              minimumSize: const Size.fromHeight(ShootSize.topHitHeight),
              textStyle: text.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(ShootRadius.row),
              ),
            ).copyWith(
              backgroundColor: WidgetStateProperty.resolveWith(
                (states) =>
                    states.contains(WidgetState.pressed) ||
                        states.contains(WidgetState.hovered)
                    ? c.primaryHover
                    : c.primary,
              ),
            ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: c.accentInk,
          minimumSize: const Size(ShootSize.iconButton, ShootSize.iconButton),
        ),
      ),
      popupMenuTheme: PopupMenuThemeData(
        color: c.panelSolid,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(ShootRadius.panel),
          side: BorderSide(color: c.hair),
        ),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(color: c.accent),
      extensions: [c, isDark ? ShootScene.dark : ShootScene.light],
    );
  }
}

/// `context.colors.ink` instead of `Theme.of(context).extension<...>()!`.
extension ShootThemeX on BuildContext {
  ShootColors get colors => Theme.of(this).extension<ShootColors>()!;
}
