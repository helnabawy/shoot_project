import 'package:flutter/foundation.dart';
import 'package:flutter/painting.dart';

/// The seven roles an accent decides, for one theme. [ShootColors.withAccent]
/// swaps exactly these into the base roles; every other role, including the
/// fixed `primary` action colour, is untouched.
@immutable
final class AccentRoles {
  const AccentRoles({
    required this.accent,
    required this.onAccent,
    required this.accentInk,
    required this.selected,
    required this.selectedHover,
    required this.selectionWash,
    required this.focus,
  });

  /// Selection fill (progress, checked controls, the caret).
  final Color accent;

  /// Text and icons on [accent]; dark ink on Graphite's light dark-theme fill.
  final Color onAccent;

  /// The accent as text (links, selected labels).
  final Color accentInk;

  /// Selected row background.
  final Color selected;

  /// Selected row background while pressed or hovered.
  final Color selectedHover;

  /// Text-selection highlight.
  final Color selectionWash;

  /// Focus ring.
  final Color focus;
}

const _blueLight = AccentRoles(
  accent: Color(0xFF0A60FF),
  onAccent: Color(0xFFFFFFFF),
  accentInk: Color(0xFF0848C2),
  selected: Color.fromRGBO(10, 96, 255, 0.12),
  selectedHover: Color.fromRGBO(10, 96, 255, 0.18),
  selectionWash: Color.fromRGBO(10, 96, 255, 0.1),
  focus: Color(0xFF0A60FF),
);

const _blueDark = AccentRoles(
  accent: Color(0xFF2B6BEB),
  onAccent: Color(0xFFFFFFFF),
  accentInk: Color(0xFFB7D0FF),
  selected: Color.fromRGBO(77, 141, 255, 0.24),
  selectedHover: Color.fromRGBO(77, 141, 255, 0.32),
  selectionWash: Color.fromRGBO(43, 107, 235, 0.14),
  focus: Color(0xFF7AA7FF),
);

/// The curated accents, in the order the Appearance sheet lists them. Blue is
/// first and the fallback; its values are the app's original colours.
///
/// Values are copied from the R1 table in
/// `specs/006-mobile-accent-colour/research.md`; change both together, and
/// `accent_palette_test.dart` proves the contrast pairs. Ids are saved on the
/// device: never change one once shipped.
enum ShootAccent {
  /// The default: blue selection roles and the brand red primary action.
  brand(id: 'brand', light: _blueLight, dark: _blueDark),
  blue(id: 'blue', light: _blueLight, dark: _blueDark),
  teal(
    id: 'teal',
    light: AccentRoles(
      accent: Color(0xFF00756A),
      onAccent: Color(0xFFFFFFFF),
      accentInk: Color(0xFF005F56),
      selected: Color.fromRGBO(0, 117, 106, 0.12),
      selectedHover: Color.fromRGBO(0, 117, 106, 0.18),
      selectionWash: Color.fromRGBO(0, 117, 106, 0.1),
      focus: Color(0xFF00756A),
    ),
    dark: AccentRoles(
      accent: Color(0xFF00796D),
      onAccent: Color(0xFFFFFFFF),
      accentInk: Color(0xFF8FE3D4),
      selected: Color.fromRGBO(46, 196, 173, 0.22),
      selectedHover: Color.fromRGBO(46, 196, 173, 0.3),
      selectionWash: Color.fromRGBO(0, 121, 109, 0.16),
      focus: Color(0xFF4FD1BD),
    ),
  ),
  violet(
    id: 'violet',
    light: AccentRoles(
      accent: Color(0xFF6B3FD6),
      onAccent: Color(0xFFFFFFFF),
      accentInk: Color(0xFF5A2FC2),
      selected: Color.fromRGBO(107, 63, 214, 0.12),
      selectedHover: Color.fromRGBO(107, 63, 214, 0.18),
      selectionWash: Color.fromRGBO(107, 63, 214, 0.1),
      focus: Color(0xFF6B3FD6),
    ),
    dark: AccentRoles(
      accent: Color(0xFF7048E0),
      onAccent: Color(0xFFFFFFFF),
      accentInk: Color(0xFFD2C3FF),
      selected: Color.fromRGBO(157, 128, 255, 0.24),
      selectedHover: Color.fromRGBO(157, 128, 255, 0.32),
      selectionWash: Color.fromRGBO(112, 72, 224, 0.16),
      focus: Color(0xFFB39BFF),
    ),
  ),
  magenta(
    id: 'magenta',
    light: AccentRoles(
      accent: Color(0xFFB0287A),
      onAccent: Color(0xFFFFFFFF),
      accentInk: Color(0xFF981F68),
      selected: Color.fromRGBO(176, 40, 122, 0.12),
      selectedHover: Color.fromRGBO(176, 40, 122, 0.18),
      selectionWash: Color.fromRGBO(176, 40, 122, 0.1),
      focus: Color(0xFFB0287A),
    ),
    dark: AccentRoles(
      accent: Color(0xFFB62E80),
      onAccent: Color(0xFFFFFFFF),
      accentInk: Color(0xFFFFB6DF),
      selected: Color.fromRGBO(255, 111, 191, 0.22),
      selectedHover: Color.fromRGBO(255, 111, 191, 0.3),
      selectionWash: Color.fromRGBO(182, 46, 128, 0.16),
      focus: Color(0xFFFF8CCC),
    ),
  ),
  graphite(
    id: 'graphite',
    light: AccentRoles(
      accent: Color(0xFF1D1D1F),
      onAccent: Color(0xFFFFFFFF),
      accentInk: Color(0xFF1D1D1F),
      selected: Color.fromRGBO(29, 29, 31, 0.09),
      selectedHover: Color.fromRGBO(29, 29, 31, 0.14),
      selectionWash: Color.fromRGBO(29, 29, 31, 0.08),
      focus: Color(0xFF1D1D1F),
    ),
    dark: AccentRoles(
      accent: Color(0xFFE8E6E3),
      onAccent: Color(0xFF1D1D1F),
      accentInk: Color(0xFFF5F5F7),
      selected: Color.fromRGBO(255, 255, 255, 0.16),
      selectedHover: Color.fromRGBO(255, 255, 255, 0.22),
      selectionWash: Color.fromRGBO(255, 255, 255, 0.12),
      focus: Color(0xFFE8E6E3),
    ),
  );

  const ShootAccent({
    required this.id,
    required this.light,
    required this.dark,
  });

  /// Saved on the device; `[a-z]+`, never changed once shipped.
  final String id;
  final AccentRoles light;
  final AccentRoles dark;

  static ShootAccent get fallback => brand;

  /// The accent saved under [id], or `null` for a missing or unknown id.
  static ShootAccent? fromId(String? id) {
    for (final accent in values) {
      if (accent.id == id) return accent;
    }
    return null;
  }
}
