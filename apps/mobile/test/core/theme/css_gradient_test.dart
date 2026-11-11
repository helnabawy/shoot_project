import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/theme/css_gradient.dart';

void main() {
  group('linear-gradient', () {
    test('160deg on a 44x44 tile runs along the CSS gradient line', () {
      const rect = Rect.fromLTWH(0, 0, 44, 44);
      final (start, end) = cssLinearLine(160, rect);
      const a = 160 * math.pi / 180;
      final length = (44 * math.sin(a)).abs() + (44 * math.cos(a)).abs();
      expect((end - start).distance, closeTo(length, 1e-9));
      // The line passes through the centre, pointing at 160deg (0deg up, clockwise).
      expect((start + end) / 2, const Offset(22, 22));
      final dir = (end - start) / (end - start).distance;
      expect(dir.dx, closeTo(math.sin(a), 1e-9));
      expect(dir.dy, closeTo(-math.cos(a), 1e-9));
    });

    test(
      '160deg on a 296x180 card keeps the CSS length, not the box diagonal',
      () {
        const rect = Rect.fromLTWH(10, 20, 296, 180);
        final (start, end) = cssLinearLine(160, rect);
        const a = 160 * math.pi / 180;
        final length = (296 * math.sin(a)).abs() + (180 * math.cos(a)).abs();
        expect((end - start).distance, closeTo(length, 1e-9));
        expect((start + end) / 2, rect.center);
        // The 0 % and 100 % stops land on the corners' perpendiculars: the
        // projection of the far corners onto the line equals the line's ends.
        final dir = (end - start) / (end - start).distance;
        double along(Offset p) =>
            (p - start).dx * dir.dx + (p - start).dy * dir.dy;
        final corners = [
          rect.topLeft,
          rect.topRight,
          rect.bottomLeft,
          rect.bottomRight,
        ];
        expect(corners.map(along).reduce(math.min), closeTo(0, 1e-9));
        expect(corners.map(along).reduce(math.max), closeTo(length, 1e-9));
      },
    );

    test('90deg runs from the left edge to the right edge', () {
      const rect = Rect.fromLTWH(0, 0, 100, 50);
      final (start, end) = cssLinearLine(90, rect);
      expect(start.dx, closeTo(0, 1e-9));
      expect(start.dy, closeTo(25, 1e-9));
      expect(end.dx, closeTo(100, 1e-9));
    });

    test('it builds a shader for any box', () {
      const g = CssLinearGradient(
        angle: 160,
        colors: [Color(0xFFECD6BD), Color(0xFFCAA07C)],
      );
      expect(g.createShader(const Rect.fromLTWH(0, 0, 44, 44)), isNotNull);
      expect(g.scale(0.5).colors.first.a, closeTo(0.5, 1e-3));
    });
  });

  group('radial-gradient', () {
    test(
      'circle at 72% 22% is centred there with the farthest-corner radius',
      () {
        const rect = Rect.fromLTWH(0, 0, 44, 44);
        const g = CssRadialGradient(
          center: Offset(0.72, 0.22),
          colors: [Color(0xEBFFF6E8), Color(0x00FFF6E8)],
          stops: [0, 0.46],
        );
        final (c, rx, ry) = g.geometry(rect);
        expect(c, const Offset(0.72 * 44, 0.22 * 44));
        // Farthest corner from (31.68, 9.68) is the bottom-left (0, 44).
        final r = math.sqrt(31.68 * 31.68 + 34.32 * 34.32);
        expect(rx, closeTo(r, 1e-9));
        expect(ry, closeTo(r, 1e-9));
      },
    );

    test('ellipse 90% 30% at 28% 112% sizes its radii from the box', () {
      const rect = Rect.fromLTWH(0, 0, 296, 180);
      const g = CssRadialGradient(
        center: Offset(0.28, 1.12),
        radii: Size(0.9, 0.3),
        colors: [Color(0x8084583D), Color(0x0084583D)],
        stops: [0.99, 1],
      );
      final (c, rx, ry) = g.geometry(rect);
      expect(c.dx, closeTo(0.28 * 296, 1e-9));
      expect(c.dy, closeTo(1.12 * 180, 1e-9));
      expect(rx, closeTo(0.9 * 296, 1e-9));
      expect(ry, closeTo(0.3 * 180, 1e-9));
      expect(g.createShader(rect), isNotNull);
    });
  });
}
