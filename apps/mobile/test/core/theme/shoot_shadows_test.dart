import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/theme/shoot_shadows.dart';

void main() {
  test('a CSS blur becomes the Flutter blur radius with the same sigma', () {
    final s = cssShadow(0, 24, 60, 0, const Color(0x38281A0C));
    expect(s.blurRadius, closeTo(51.1, 0.1));
    expect(s.offset, const Offset(0, 24));
    expect(s.spreadRadius, 0);
    // sigma: CSS blur / 2 == Flutter radius * 0.57735 + 0.5
    expect(Shadow.convertRadiusToSigma(s.blurRadius), closeTo(30, 1e-6));
  });

  test('a blur of 1 or less has no radius', () {
    expect(cssShadow(0, 1, 1, 0, Colors.black).blurRadius, 0);
    expect(cssShadow(0, 1, 0, 0, Colors.black).blurRadius, 0);
  });

  test('the panel, sheet and lift shadows come from tokens.css per theme', () {
    final light = ShootShadows.light;
    expect(light.panel.single.offset, const Offset(0, 24));
    expect(light.panel.single.color, const Color.fromRGBO(40, 25, 12, 0.22));
    expect(light.sheet.single.offset, const Offset(0, -8));
    expect(
      Shadow.convertRadiusToSigma(light.sheet.single.blurRadius),
      closeTo(16, 1e-6),
    );
    expect(light.lift.single.color, const Color.fromRGBO(0, 0, 0, 0.06));
    expect(
      ShootShadows.dark.panel.single.color,
      const Color.fromRGBO(0, 0, 0, 0.5),
    );
  });
}
