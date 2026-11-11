import 'package:flutter/painting.dart';

/// The type roles read from the canvas boards (feature 007, research R3), mirrored from the
/// `--text-*` tokens in `specs/design-system/tokens.css`.
///
/// - Letter-spacing is CSS `em × fontSize`.
/// - `height` is the CSS line-height, with the half-leading split evenly as CSS does
///   ([TextLeadingDistribution.even]); without it text sits 1–3 px off its board.
/// - No font family: the platform face (Roboto on Android, SF on iOS); Arabic falls back to
///   Noto Sans Arabic, the face the goldens and the board references are drawn with.
/// - Colours come from the roles at the use site (`body` is `bodyInk`, `meta` is `mute`).
abstract final class ShootType {
  static const _fallback = ['Noto Sans Arabic'];

  static TextStyle _role(
    double size,
    FontWeight weight,
    double height, {
    double em = 0,
  }) => TextStyle(
    fontSize: size,
    fontWeight: weight,
    height: height,
    letterSpacing: em * size,
    leadingDistribution: TextLeadingDistribution.even,
    fontFamilyFallback: _fallback,
  );

  /// `.wm`: 22/700, line-height 1, -0.03em.
  static final TextStyle wordmark = _role(22, FontWeight.w700, 1, em: -0.03);

  /// `.h1`: 34/700, 1.2, -0.03em.
  static final TextStyle display = _role(34, FontWeight.w700, 1.2, em: -0.03);

  /// `.h1` on the sign-in boards: 30/700.
  static final TextStyle displaySignIn = _role(
    30,
    FontWeight.w700,
    1.2,
    em: -0.03,
  );

  /// `.h2`: 26/700, 1.25, -0.025em.
  static final TextStyle title = _role(26, FontWeight.w700, 1.25, em: -0.025);

  /// `.h3`: 20/600, 1.3, -0.01em.
  static final TextStyle heading = _role(20, FontWeight.w600, 1.3, em: -0.01);

  /// `.top`, the Top Hit: 17/600.
  static final TextStyle action = _role(17, FontWeight.w600, 1.2);

  /// `.row`, fields: 16, 1.3.
  static final TextStyle row = _role(16, FontWeight.w400, 1.3);

  /// `.btn2`, secondary buttons: 16/500.
  static final TextStyle button = _role(16, FontWeight.w500, 1.2);

  /// `.body`: 15, 1.6, colour `bodyInk`.
  static final TextStyle body = _role(15, FontWeight.w400, 1.6);

  /// `.chip`: 15 (500 when on).
  static final TextStyle chip = _role(15, FontWeight.w400, 1.2);

  /// `.meta`: 13, 1.4, colour `mute`.
  static final TextStyle meta = _role(13, FontWeight.w400, 1.4);

  /// `.badge`: 13/500.
  static final TextStyle badge = _role(13, FontWeight.w500, 1.2);

  /// `.gl`: 11/600, 0.06em, uppercase, colour `mute`.
  static final TextStyle groupLabel = _role(11, FontWeight.w600, 1.3, em: 0.06);

  /// [style] with tabular figures, for prices, codes and counts.
  static TextStyle num(TextStyle style) => style.copyWith(
    fontFeatures: [...?style.fontFeatures, const FontFeature.tabularFigures()],
  );
}
