import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/shoot_colors.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// Builds the Material themes from the semantic roles in [ShootColors], so
/// stock widgets pick up the tokens and custom widgets read the roles
/// directly through [ShootThemeX.colors].
abstract final class AppTheme {
  static final ThemeData light = _build(ShootColors.light, Brightness.light);
  static final ThemeData dark = _build(ShootColors.dark, Brightness.dark);

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

    // No fontFamily: system fonts, like the web stack (SF / Roboto; Arabic
    // falls back to the platform Arabic face). No font package until the
    // brand needs one.
    final base = ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: scheme,
    );

    final text = base.textTheme.apply(bodyColor: c.ink, displayColor: c.ink);

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
        style: FilledButton.styleFrom(
          backgroundColor: c.accent,
          foregroundColor: c.onAccent,
          minimumSize: const Size.fromHeight(ShootSize.topHitHeight),
          textStyle: text.titleMedium?.copyWith(fontWeight: FontWeight.w600),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(ShootRadius.row),
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
      extensions: [c],
    );
  }
}

/// `context.colors.ink` instead of `Theme.of(context).extension<...>()!`.
extension ShootThemeX on BuildContext {
  ShootColors get colors => Theme.of(this).extension<ShootColors>()!;
}
