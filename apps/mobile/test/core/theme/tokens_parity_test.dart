import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/theme/shoot_colors.dart';
import 'package:shoot_mobile/core/theme/shoot_scene.dart';

/// Colour declarations (`--name: #hex | rgba()`) of one block of tokens.css.
Map<String, Color> _colours(String block) {
  final out = <String, Color>{};
  final decl = RegExp(r'--([a-z0-9-]+):\s*([^;]+);');
  for (final m in decl.allMatches(block)) {
    final value = m.group(2)!.trim();
    final hex = RegExp(r'^#([0-9a-fA-F]{6})$').firstMatch(value);
    final rgba = RegExp(r'^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$')
        .firstMatch(value);
    if (hex != null) {
      out[m.group(1)!] = Color(int.parse('FF${hex.group(1)}', radix: 16));
    } else if (rgba != null) {
      out[m.group(1)!] = Color.fromRGBO(
        int.parse(rgba.group(1)!),
        int.parse(rgba.group(2)!),
        int.parse(rgba.group(3)!),
        double.parse(rgba.group(4)!),
      );
    }
  }
  return out;
}

double _contrast(Color a, Color b) {
  final la = a.computeLuminance();
  final lb = b.computeLuminance();
  return (math.max(la, lb) + 0.05) / (math.min(la, lb) + 0.05);
}

void main() {
  final css = File('../../specs/design-system/tokens.css').readAsStringSync();
  final root = css.substring(css.indexOf(':root {'), css.indexOf('.dark,'));
  final dark = css.substring(css.indexOf('.dark,'), css.indexOf('@media'));
  final light = _colours(root);
  final darkAll = {...light, ..._colours(dark)};

  final themes = {
    'light': (light, ShootColors.light, ShootScene.light),
    'dark': (darkAll, ShootColors.dark, ShootScene.dark),
  };

  for (final MapEntry(key: name, value: (tokens, colors, scene))
      in themes.entries) {
    test(
      '$name: every colour role in tokens.css has the same value in Dart',
      () {
        final dart = {...colors.roles, ...scene.roles};
        for (final MapEntry(key: role, value: value) in tokens.entries) {
          expect(
            dart.containsKey(role),
            isTrue,
            reason: '--$role has no Dart role',
          );
          expect(dart[role], value, reason: '--$role');
        }
      },
    );

    test(
      '$name: body-ink is AA (4.5:1) on ground, panel, panel-solid and tile',
      () {
        final panel = Color.alphaBlend(colors.panel, colors.ground);
        for (final MapEntry(key: surface, value: bg) in {
          'ground': colors.ground,
          'panel': panel,
          'panel-solid': colors.panelSolid,
          'tile': colors.tile,
          'surface-sunk': colors.surfaceSunk,
        }.entries) {
          expect(
            _contrast(colors.bodyInk, bg),
            greaterThanOrEqualTo(4.5),
            reason: 'body-ink on $surface',
          );
        }
        // Tile ink stays readable on the sunk 44 px tile.
        expect(
          _contrast(colors.tileInk, colors.surfaceSunk),
          greaterThanOrEqualTo(4.5),
        );
      },
    );
  }

  test('the scene extension lerps and copies', () {
    final mid = ShootScene.light.lerp(ShootScene.dark, 1);
    expect(mid.sceneTileTop, ShootScene.dark.sceneTileTop);
    const c = Color(0xFF000000);
    expect(ShootScene.light.copyWith(sceneInk: c).sceneInk, c);
    expect(
      ShootScene.light.copyWith(sceneInk: c).sweepTop,
      ShootScene.light.sweepTop,
    );
    expect(ShootScene.light.lerp(null, 0.5), ShootScene.light);
  });
}
