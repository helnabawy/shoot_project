import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';
import 'package:shoot_mobile/core/theme/shoot_colors.dart';

/// WCAG 2.1 contrast ratio between two opaque colours.
double _contrast(Color a, Color b) {
  final la = a.computeLuminance();
  final lb = b.computeLuminance();
  return (math.max(la, lb) + 0.05) / (math.min(la, lb) + 0.05);
}

/// Distance between two hues on the colour wheel, 0 to 180 degrees.
double _hueDistance(Color a, Color b) {
  final d = (HSLColor.fromColor(a).hue - HSLColor.fromColor(b).hue).abs();
  return d > 180 ? 360 - d : d;
}

void main() {
  final themes = {
    'light': (ShootColors.light, (ShootAccent a) => a.light),
    'dark': (ShootColors.dark, (ShootAccent a) => a.dark),
  };

  test('MA-US3-S1 every accent passes every contrast pair in both themes', () {
    for (final accent in ShootAccent.values) {
      for (final MapEntry(key: theme, value: (base, rolesOf))
          in themes.entries) {
        final r = rolesOf(accent);
        final label = '${accent.id} $theme';
        final surfaces = {
          'ground': base.ground,
          'panel-solid': base.panelSolid,
        };

        expect(
          _contrast(r.onAccent, r.accent),
          greaterThanOrEqualTo(4.5),
          reason: '$label: onAccent on accent',
        );

        for (final MapEntry(key: surfaceName, value: surface)
            in surfaces.entries) {
          expect(
            _contrast(r.accentInk, surface),
            greaterThanOrEqualTo(4.5),
            reason: '$label: accentInk on $surfaceName',
          );
          expect(
            _contrast(r.focus, surface),
            greaterThanOrEqualTo(3),
            reason: '$label: focus on $surfaceName',
          );
          for (final MapEntry(key: tintName, value: tint) in {
            'selected': r.selected,
            'selectedHover': r.selectedHover,
          }.entries) {
            final flat = Color.alphaBlend(tint, surface);
            expect(
              _contrast(r.accentInk, flat),
              greaterThanOrEqualTo(4.5),
              reason: '$label: accentInk on $tintName over $surfaceName',
            );
          }
        }
      }
    }
  });

  test(
    'MA-US3-S2 no accent is close to the primary red or the danger state',
    () {
      for (final accent in ShootAccent.values) {
        for (final MapEntry(key: theme, value: (base, rolesOf))
            in themes.entries) {
          final r = rolesOf(accent);
          final reds = {'primary': base.primary, 'onDanger': base.onDanger};
          for (final MapEntry(key: roleName, value: role) in {
            'accent': r.accent,
            'selected': r.selected,
            'focus': r.focus,
          }.entries) {
            // Achromatic accents (Graphite) have no hue to confuse.
            if (HSLColor.fromColor(role).saturation < 0.10) continue;
            for (final MapEntry(key: redName, value: red) in reds.entries) {
              expect(
                _hueDistance(role, red),
                greaterThanOrEqualTo(30),
                reason: '${accent.id} $theme: $roleName vs $redName',
              );
            }
          }
        }
      }
    },
  );

  test('accent ids are unique, lower-case letters, Default first', () {
    final ids = ShootAccent.values.map((a) => a.id).toList();
    expect(ids.toSet(), hasLength(ids.length));
    for (final id in ids) {
      expect(id, matches(RegExp(r'^[a-z]+$')));
    }
    expect(ShootAccent.values.first, ShootAccent.brand);
    expect(ShootAccent.fallback, ShootAccent.brand);
    expect(ids, ['brand', 'blue', 'teal', 'violet', 'magenta', 'graphite']);
  });

  test('fromId finds a known accent and nothing for an unknown one', () {
    for (final accent in ShootAccent.values) {
      expect(ShootAccent.fromId(accent.id), accent);
    }
    expect(ShootAccent.fromId('orange'), isNull);
    expect(ShootAccent.fromId(null), isNull);
  });

  test('Blue keeps the values the app had before accents existed', () {
    const light = ShootAccent.brand;
    expect(light.light.accent, const Color(0xFF0A60FF));
    expect(light.light.onAccent, const Color(0xFFFFFFFF));
    expect(light.light.accentInk, const Color(0xFF0848C2));
    expect(light.light.selected, const Color.fromRGBO(10, 96, 255, 0.12));
    expect(light.light.selectedHover, const Color.fromRGBO(10, 96, 255, 0.18));
    expect(light.light.selectionWash, const Color.fromRGBO(10, 96, 255, 0.1));
    expect(light.light.focus, const Color(0xFF0A60FF));
    expect(light.dark.accent, const Color(0xFF2B6BEB));
    expect(light.dark.onAccent, const Color(0xFFFFFFFF));
    expect(light.dark.accentInk, const Color(0xFFB7D0FF));
    expect(light.dark.selected, const Color.fromRGBO(77, 141, 255, 0.24));
    expect(light.dark.selectedHover, const Color.fromRGBO(77, 141, 255, 0.32));
    expect(light.dark.selectionWash, const Color.fromRGBO(43, 107, 235, 0.14));
    expect(light.dark.focus, const Color(0xFF7AA7FF));

    // And they are what the base themes already carry.
    for (final (base, roles) in [
      (ShootColors.light, light.light),
      (ShootColors.dark, light.dark),
    ]) {
      expect(base.accent, roles.accent);
      expect(base.accentInk, roles.accentInk);
      expect(base.selected, roles.selected);
      expect(base.focus, roles.focus);
    }
  });
}
