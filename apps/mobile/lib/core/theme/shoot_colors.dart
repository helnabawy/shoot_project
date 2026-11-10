import 'package:flutter/material.dart';

/// Semantic colour roles, one value per theme.
///
/// Mirrors the web roles in `specs/design-system/tokens.css` (direction
/// "Brief Bar II"): same names in camelCase, same values. Widgets read roles
/// (`context.colors.ink`), never a raw colour. When a token changes on the
/// web, change it here too.
///
/// Not mirrored yet: the graphic-only scene, sweep and glow colours and the
/// shadows. Add them with the spec that first needs them.
@immutable
final class ShootColors extends ThemeExtension<ShootColors> {
  const ShootColors({
    required this.ground,
    required this.panel,
    required this.panelSolid,
    required this.ink,
    required this.mute,
    required this.hair,
    required this.controlBorder,
    required this.tile,
    required this.tileInk,
    required this.accent,
    required this.onAccent,
    required this.accentInk,
    required this.selected,
    required this.selectedHover,
    required this.selectionWash,
    required this.focus,
    required this.attention,
    required this.onAttention,
    required this.success,
    required this.onSuccess,
    required this.danger,
    required this.onDanger,
    required this.photoScrim,
    required this.whatsappInk,
  });

  /// `:root` in tokens.css.
  static const light = ShootColors(
    ground: Color(0xFFEFE9E3),
    panel: Color.fromRGBO(255, 255, 255, 0.86),
    panelSolid: Color(0xFFFCFBFA),
    ink: Color(0xFF1D1D1F),
    mute: Color(0xFF6B6560),
    hair: Color.fromRGBO(0, 0, 0, 0.08),
    controlBorder: Color.fromRGBO(0, 0, 0, 0.32),
    tile: Color(0xFFF1EEEA),
    tileInk: Color(0xFF5C5752),
    accent: Color(0xFF0A60FF),
    onAccent: Color(0xFFFFFFFF),
    accentInk: Color(0xFF0848C2),
    selected: Color.fromRGBO(10, 96, 255, 0.12),
    selectedHover: Color.fromRGBO(10, 96, 255, 0.18),
    selectionWash: Color.fromRGBO(10, 96, 255, 0.1),
    focus: Color(0xFF0A60FF),
    attention: Color(0xFFFFE3D6),
    onAttention: Color(0xFF6A1F00),
    success: Color(0xFFE3F3E8),
    onSuccess: Color(0xFF0F5A2E),
    danger: Color(0xFFFDE3E1),
    onDanger: Color(0xFF9B1C1C),
    photoScrim: Color.fromRGBO(255, 255, 255, 0.25),
    whatsappInk: Color(0xFF0F6E3F),
  );

  /// `.dark` in tokens.css.
  static const dark = ShootColors(
    ground: Color(0xFF141416),
    panel: Color.fromRGBO(40, 40, 44, 0.82),
    panelSolid: Color(0xFF28282C),
    ink: Color(0xFFF5F5F7),
    mute: Color(0xFFA29D98),
    hair: Color.fromRGBO(255, 255, 255, 0.1),
    controlBorder: Color.fromRGBO(255, 255, 255, 0.36),
    tile: Color(0xFF3A3A3F),
    tileInk: Color(0xFFD6D2CD),
    accent: Color(0xFF2B6BEB),
    onAccent: Color(0xFFFFFFFF),
    accentInk: Color(0xFFB7D0FF),
    selected: Color.fromRGBO(77, 141, 255, 0.24),
    selectedHover: Color.fromRGBO(77, 141, 255, 0.32),
    selectionWash: Color.fromRGBO(43, 107, 235, 0.14),
    focus: Color(0xFF7AA7FF),
    attention: Color(0xFF4A2416),
    onAttention: Color(0xFFFFD9C7),
    success: Color(0xFF15301F),
    onSuccess: Color(0xFFA6E6BD),
    danger: Color(0xFF44181A),
    onDanger: Color(0xFFFFB4B0),
    photoScrim: Color.fromRGBO(0, 0, 0, 0.35),
    whatsappInk: Color(0xFF7FD49A),
  );

  /// Page background.
  final Color ground;

  /// Translucent surface of the bar/panel (blurred over [ground]).
  final Color panel;

  /// Opaque fallback for [panel] (sheets, reduced transparency).
  final Color panelSolid;

  /// Primary text.
  final Color ink;

  /// Secondary text; still AA on [ground] and [panelSolid].
  final Color mute;

  /// Hairline dividers.
  final Color hair;

  /// Borders of inputs and other controls (3:1 non-text contrast).
  final Color controlBorder;

  /// Icon tile background in a row.
  final Color tile;

  /// Icon colour on a [tile].
  final Color tileInk;

  /// The one primary action (Top Hit) background.
  final Color accent;

  /// Text and icons on [accent].
  final Color onAccent;

  /// Accent used as text (links, selected labels).
  final Color accentInk;

  /// Selected row background.
  final Color selected;

  /// Selected row background while pressed or hovered.
  final Color selectedHover;

  /// Text-selection highlight.
  final Color selectionWash;

  /// Focus ring.
  final Color focus;

  final Color attention;
  final Color onAttention;
  final Color success;
  final Color onSuccess;
  final Color danger;
  final Color onDanger;

  /// Wash over photos so overlaid text stays readable.
  final Color photoScrim;

  /// WhatsApp action text.
  final Color whatsappInk;

  @override
  ShootColors copyWith({
    Color? ground,
    Color? panel,
    Color? panelSolid,
    Color? ink,
    Color? mute,
    Color? hair,
    Color? controlBorder,
    Color? tile,
    Color? tileInk,
    Color? accent,
    Color? onAccent,
    Color? accentInk,
    Color? selected,
    Color? selectedHover,
    Color? selectionWash,
    Color? focus,
    Color? attention,
    Color? onAttention,
    Color? success,
    Color? onSuccess,
    Color? danger,
    Color? onDanger,
    Color? photoScrim,
    Color? whatsappInk,
  }) {
    return ShootColors(
      ground: ground ?? this.ground,
      panel: panel ?? this.panel,
      panelSolid: panelSolid ?? this.panelSolid,
      ink: ink ?? this.ink,
      mute: mute ?? this.mute,
      hair: hair ?? this.hair,
      controlBorder: controlBorder ?? this.controlBorder,
      tile: tile ?? this.tile,
      tileInk: tileInk ?? this.tileInk,
      accent: accent ?? this.accent,
      onAccent: onAccent ?? this.onAccent,
      accentInk: accentInk ?? this.accentInk,
      selected: selected ?? this.selected,
      selectedHover: selectedHover ?? this.selectedHover,
      selectionWash: selectionWash ?? this.selectionWash,
      focus: focus ?? this.focus,
      attention: attention ?? this.attention,
      onAttention: onAttention ?? this.onAttention,
      success: success ?? this.success,
      onSuccess: onSuccess ?? this.onSuccess,
      danger: danger ?? this.danger,
      onDanger: onDanger ?? this.onDanger,
      photoScrim: photoScrim ?? this.photoScrim,
      whatsappInk: whatsappInk ?? this.whatsappInk,
    );
  }

  @override
  ShootColors lerp(ShootColors? other, double t) {
    if (other == null) return this;
    Color mix(Color a, Color b) => Color.lerp(a, b, t)!;
    return ShootColors(
      ground: mix(ground, other.ground),
      panel: mix(panel, other.panel),
      panelSolid: mix(panelSolid, other.panelSolid),
      ink: mix(ink, other.ink),
      mute: mix(mute, other.mute),
      hair: mix(hair, other.hair),
      controlBorder: mix(controlBorder, other.controlBorder),
      tile: mix(tile, other.tile),
      tileInk: mix(tileInk, other.tileInk),
      accent: mix(accent, other.accent),
      onAccent: mix(onAccent, other.onAccent),
      accentInk: mix(accentInk, other.accentInk),
      selected: mix(selected, other.selected),
      selectedHover: mix(selectedHover, other.selectedHover),
      selectionWash: mix(selectionWash, other.selectionWash),
      focus: mix(focus, other.focus),
      attention: mix(attention, other.attention),
      onAttention: mix(onAttention, other.onAttention),
      success: mix(success, other.success),
      onSuccess: mix(onSuccess, other.onSuccess),
      danger: mix(danger, other.danger),
      onDanger: mix(onDanger, other.onDanger),
      photoScrim: mix(photoScrim, other.photoScrim),
      whatsappInk: mix(whatsappInk, other.whatsappInk),
    );
  }
}
