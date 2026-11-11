import 'package:flutter/material.dart';

/// The graphic-only colours from `tokens.css`: the golden-hour scene, the scene tiles, the studio
/// sweep, the corner glow, the glint and the pulse. Never a control, border or text colour, except
/// [sceneInk] on a scene tile. Read with `context.scene` (feature 007).
///
/// Generated from the `tokens.css` roles; `tokens_parity_test.dart` keeps the two equal.
@immutable
final class ShootScene extends ThemeExtension<ShootScene> {
  const ShootScene({
    required this.sweepTop,
    required this.sweepBottom,
    required this.sweepKey,
    required this.sceneSkyTop,
    required this.sceneSkyMid,
    required this.sceneSkyLow,
    required this.sceneLight,
    required this.sceneHalo,
    required this.sceneDuneFar,
    required this.sceneDuneMid,
    required this.sceneDuneNear,
    required this.sceneTileTop,
    required this.sceneTileBottom,
    required this.sceneTileKey,
    required this.sceneTileAltTop,
    required this.sceneTileAltBottom,
    required this.sceneTileDeep,
    required this.sceneTile2Top,
    required this.sceneTile2Bottom,
    required this.sceneTile3Top,
    required this.sceneTile3Bottom,
    required this.sceneTileKey2,
    required this.sceneTileKey3,
    required this.sceneDune,
    required this.sceneInk,
    required this.cornerGlow,
    required this.cornerGlowMid,
    required this.glintSheen,
    required this.pulseRing,
  });

  /// `:root` in tokens.css.
  static const light = ShootScene(
    sweepTop: Color(0xFFCBB39C),
    sweepBottom: Color(0xFF8E6D52),
    sweepKey: Color.fromRGBO(255, 246, 234, 0.9),
    sceneSkyTop: Color(0xFFF6EADB),
    sceneSkyMid: Color(0xFFECD2B3),
    sceneSkyLow: Color(0xFFCFA27A),
    sceneLight: Color(0xFFFFFAF2),
    sceneHalo: Color(0xFFFFE9CF),
    sceneDuneFar: Color(0xFFC0906A),
    sceneDuneMid: Color(0xFFA47452),
    sceneDuneNear: Color(0xFF84583D),
    sceneTileTop: Color(0xFFECD6BD),
    sceneTileBottom: Color(0xFFCAA07C),
    sceneTileKey: Color.fromRGBO(255, 246, 232, 0.92),
    sceneTileAltTop: Color(0xFFF1DCC4),
    sceneTileAltBottom: Color(0xFFE6C8A8),
    sceneTileDeep: Color(0xFFB98A66),
    sceneTile2Top: Color(0xFFE6CDB4),
    sceneTile2Bottom: Color(0xFFC0946F),
    sceneTile3Top: Color(0xFFF1E3D3),
    sceneTile3Bottom: Color(0xFFD0A886),
    sceneTileKey2: Color.fromRGBO(255, 246, 232, 0.85),
    sceneTileKey3: Color.fromRGBO(255, 246, 232, 0.9),
    sceneDune: Color.fromRGBO(132, 88, 61, 0.5),
    sceneInk: Color(0xFF4A2E20),
    cornerGlow: Color.fromRGBO(255, 244, 228, 0.95),
    cornerGlowMid: Color.fromRGBO(255, 233, 207, 0.6),
    glintSheen: Color.fromRGBO(255, 255, 255, 0.34),
    pulseRing: Color.fromRGBO(255, 140, 90, 0.35),
  );

  /// `.dark` in tokens.css.
  static const dark = ShootScene(
    sweepTop: Color(0xFF4A3A2F),
    sweepBottom: Color(0xFF1D1612),
    sweepKey: Color.fromRGBO(255, 206, 160, 0.42),
    sceneSkyTop: Color(0xFF141416),
    sceneSkyMid: Color(0xFF2A211C),
    sceneSkyLow: Color(0xFF4A3A2F),
    sceneLight: Color(0xFFFFE2BF),
    sceneHalo: Color(0xFFFFCEA0),
    sceneDuneFar: Color(0xFF3A2B25),
    sceneDuneMid: Color(0xFF2A1F1A),
    sceneDuneNear: Color(0xFF1A1310),
    sceneTileTop: Color(0xFF4A3A2F),
    sceneTileBottom: Color(0xFF2A211C),
    sceneTileKey: Color.fromRGBO(255, 226, 196, 0.28),
    sceneTileAltTop: Color(0xFF54423A),
    sceneTileAltBottom: Color(0xFF3A2D25),
    sceneTileDeep: Color(0xFF1F1813),
    sceneTile2Top: Color(0xFF46372D),
    sceneTile2Bottom: Color(0xFF261E19),
    sceneTile3Top: Color(0xFF4F3E32),
    sceneTile3Bottom: Color(0xFF2E241E),
    sceneTileKey2: Color.fromRGBO(255, 226, 196, 0.24),
    sceneTileKey3: Color.fromRGBO(255, 226, 196, 0.26),
    sceneDune: Color.fromRGBO(0, 0, 0, 0.28),
    sceneInk: Color(0xFFE6D3C0),
    cornerGlow: Color.fromRGBO(110, 78, 54, 0.4),
    cornerGlowMid: Color.fromRGBO(110, 78, 54, 0.24),
    glintSheen: Color.fromRGBO(255, 255, 255, 0.3),
    pulseRing: Color.fromRGBO(255, 140, 90, 0.35),
  );

  /// Studio sweep, top (photo placeholders).
  final Color sweepTop;
  final Color sweepBottom;
  final Color sweepKey;
  final Color sceneSkyTop;
  final Color sceneSkyMid;
  final Color sceneSkyLow;
  final Color sceneLight;
  final Color sceneHalo;
  final Color sceneDuneFar;
  final Color sceneDuneMid;
  final Color sceneDuneNear;
  final Color sceneTileTop;
  final Color sceneTileBottom;
  final Color sceneTileKey;
  final Color sceneTileAltTop;
  final Color sceneTileAltBottom;
  final Color sceneTileDeep;

  /// Scene-tile variant 2 (`.sc:nth-child(2n)`).
  final Color sceneTile2Top;
  final Color sceneTile2Bottom;

  /// Scene-tile variant 3 (`.sc:nth-child(3n)`).
  final Color sceneTile3Top;
  final Color sceneTile3Bottom;
  final Color sceneTileKey2;
  final Color sceneTileKey3;

  /// The low dune ellipse on a scene tile.
  final Color sceneDune;

  /// Text on a scene tile; graphic roles are never text colours otherwise.
  final Color sceneInk;

  /// The warm glow in the top-end corner of every screen.
  final Color cornerGlow;

  /// The corner glow's 34 % stop.
  final Color cornerGlowMid;

  /// The Top Hit glint.
  final Color glintSheen;

  /// The landing tap pulse.
  final Color pulseRing;

  /// Every role by its `tokens.css` name, for the token parity test and the gallery.
  Map<String, Color> get roles => {
    'sweep-top': sweepTop,
    'sweep-bottom': sweepBottom,
    'sweep-key': sweepKey,
    'scene-sky-top': sceneSkyTop,
    'scene-sky-mid': sceneSkyMid,
    'scene-sky-low': sceneSkyLow,
    'scene-light': sceneLight,
    'scene-halo': sceneHalo,
    'scene-dune-far': sceneDuneFar,
    'scene-dune-mid': sceneDuneMid,
    'scene-dune-near': sceneDuneNear,
    'scene-tile-top': sceneTileTop,
    'scene-tile-bottom': sceneTileBottom,
    'scene-tile-key': sceneTileKey,
    'scene-tile-alt-top': sceneTileAltTop,
    'scene-tile-alt-bottom': sceneTileAltBottom,
    'scene-tile-deep': sceneTileDeep,
    'scene-tile-2-top': sceneTile2Top,
    'scene-tile-2-bottom': sceneTile2Bottom,
    'scene-tile-3-top': sceneTile3Top,
    'scene-tile-3-bottom': sceneTile3Bottom,
    'scene-tile-key-2': sceneTileKey2,
    'scene-tile-key-3': sceneTileKey3,
    'scene-dune': sceneDune,
    'scene-ink': sceneInk,
    'corner-glow': cornerGlow,
    'corner-glow-mid': cornerGlowMid,
    'glint-sheen': glintSheen,
    'pulse-ring': pulseRing,
  };

  @override
  ShootScene copyWith({
    Color? sweepTop,
    Color? sweepBottom,
    Color? sweepKey,
    Color? sceneSkyTop,
    Color? sceneSkyMid,
    Color? sceneSkyLow,
    Color? sceneLight,
    Color? sceneHalo,
    Color? sceneDuneFar,
    Color? sceneDuneMid,
    Color? sceneDuneNear,
    Color? sceneTileTop,
    Color? sceneTileBottom,
    Color? sceneTileKey,
    Color? sceneTileAltTop,
    Color? sceneTileAltBottom,
    Color? sceneTileDeep,
    Color? sceneTile2Top,
    Color? sceneTile2Bottom,
    Color? sceneTile3Top,
    Color? sceneTile3Bottom,
    Color? sceneTileKey2,
    Color? sceneTileKey3,
    Color? sceneDune,
    Color? sceneInk,
    Color? cornerGlow,
    Color? cornerGlowMid,
    Color? glintSheen,
    Color? pulseRing,
  }) {
    return ShootScene(
      sweepTop: sweepTop ?? this.sweepTop,
      sweepBottom: sweepBottom ?? this.sweepBottom,
      sweepKey: sweepKey ?? this.sweepKey,
      sceneSkyTop: sceneSkyTop ?? this.sceneSkyTop,
      sceneSkyMid: sceneSkyMid ?? this.sceneSkyMid,
      sceneSkyLow: sceneSkyLow ?? this.sceneSkyLow,
      sceneLight: sceneLight ?? this.sceneLight,
      sceneHalo: sceneHalo ?? this.sceneHalo,
      sceneDuneFar: sceneDuneFar ?? this.sceneDuneFar,
      sceneDuneMid: sceneDuneMid ?? this.sceneDuneMid,
      sceneDuneNear: sceneDuneNear ?? this.sceneDuneNear,
      sceneTileTop: sceneTileTop ?? this.sceneTileTop,
      sceneTileBottom: sceneTileBottom ?? this.sceneTileBottom,
      sceneTileKey: sceneTileKey ?? this.sceneTileKey,
      sceneTileAltTop: sceneTileAltTop ?? this.sceneTileAltTop,
      sceneTileAltBottom: sceneTileAltBottom ?? this.sceneTileAltBottom,
      sceneTileDeep: sceneTileDeep ?? this.sceneTileDeep,
      sceneTile2Top: sceneTile2Top ?? this.sceneTile2Top,
      sceneTile2Bottom: sceneTile2Bottom ?? this.sceneTile2Bottom,
      sceneTile3Top: sceneTile3Top ?? this.sceneTile3Top,
      sceneTile3Bottom: sceneTile3Bottom ?? this.sceneTile3Bottom,
      sceneTileKey2: sceneTileKey2 ?? this.sceneTileKey2,
      sceneTileKey3: sceneTileKey3 ?? this.sceneTileKey3,
      sceneDune: sceneDune ?? this.sceneDune,
      sceneInk: sceneInk ?? this.sceneInk,
      cornerGlow: cornerGlow ?? this.cornerGlow,
      cornerGlowMid: cornerGlowMid ?? this.cornerGlowMid,
      glintSheen: glintSheen ?? this.glintSheen,
      pulseRing: pulseRing ?? this.pulseRing,
    );
  }

  @override
  ShootScene lerp(ShootScene? other, double t) {
    if (other == null) return this;
    Color mix(Color a, Color b) => Color.lerp(a, b, t)!;
    return ShootScene(
      sweepTop: mix(sweepTop, other.sweepTop),
      sweepBottom: mix(sweepBottom, other.sweepBottom),
      sweepKey: mix(sweepKey, other.sweepKey),
      sceneSkyTop: mix(sceneSkyTop, other.sceneSkyTop),
      sceneSkyMid: mix(sceneSkyMid, other.sceneSkyMid),
      sceneSkyLow: mix(sceneSkyLow, other.sceneSkyLow),
      sceneLight: mix(sceneLight, other.sceneLight),
      sceneHalo: mix(sceneHalo, other.sceneHalo),
      sceneDuneFar: mix(sceneDuneFar, other.sceneDuneFar),
      sceneDuneMid: mix(sceneDuneMid, other.sceneDuneMid),
      sceneDuneNear: mix(sceneDuneNear, other.sceneDuneNear),
      sceneTileTop: mix(sceneTileTop, other.sceneTileTop),
      sceneTileBottom: mix(sceneTileBottom, other.sceneTileBottom),
      sceneTileKey: mix(sceneTileKey, other.sceneTileKey),
      sceneTileAltTop: mix(sceneTileAltTop, other.sceneTileAltTop),
      sceneTileAltBottom: mix(sceneTileAltBottom, other.sceneTileAltBottom),
      sceneTileDeep: mix(sceneTileDeep, other.sceneTileDeep),
      sceneTile2Top: mix(sceneTile2Top, other.sceneTile2Top),
      sceneTile2Bottom: mix(sceneTile2Bottom, other.sceneTile2Bottom),
      sceneTile3Top: mix(sceneTile3Top, other.sceneTile3Top),
      sceneTile3Bottom: mix(sceneTile3Bottom, other.sceneTile3Bottom),
      sceneTileKey2: mix(sceneTileKey2, other.sceneTileKey2),
      sceneTileKey3: mix(sceneTileKey3, other.sceneTileKey3),
      sceneDune: mix(sceneDune, other.sceneDune),
      sceneInk: mix(sceneInk, other.sceneInk),
      cornerGlow: mix(cornerGlow, other.cornerGlow),
      cornerGlowMid: mix(cornerGlowMid, other.cornerGlowMid),
      glintSheen: mix(glintSheen, other.glintSheen),
      pulseRing: mix(pulseRing, other.pulseRing),
    );
  }
}

/// `context.scene.sceneTileTop` instead of `Theme.of(context).extension<ShootScene>()!`.
extension ShootSceneX on BuildContext {
  ShootScene get scene => Theme.of(this).extension<ShootScene>()!;
}
