import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/painting.dart';

/// The CSS `linear-gradient(<angle>deg, …)` line for [rect]: it passes through the centre at
/// [angle] (0deg points up, clockwise) and is `|w·sin a| + |h·cos a|` long, so the 0 % and 100 %
/// stops touch the box's far corners. Flutter's alignment-based gradients do not reproduce this
/// on non-square boxes.
(Offset start, Offset end) cssLinearLine(double angle, Rect rect) {
  final a = angle * math.pi / 180;
  final dir = Offset(math.sin(a), -math.cos(a));
  final length =
      (rect.width * math.sin(a)).abs() + (rect.height * math.cos(a)).abs();
  final half = dir * (length / 2);
  return (rect.center - half, rect.center + half);
}

/// A CSS `linear-gradient` that paints like the browser on any box.
class CssLinearGradient extends Gradient {
  const CssLinearGradient({
    required this.angle,
    required super.colors,
    super.stops,
  });

  /// Degrees, CSS convention.
  final double angle;

  @override
  Shader createShader(Rect rect, {TextDirection? textDirection}) {
    final (start, end) = cssLinearLine(angle, rect);
    return ui.Gradient.linear(start, end, colors, _stops);
  }

  List<double>? get _stops => stops;

  @override
  CssLinearGradient withOpacity(double opacity) => scale(opacity);

  @override
  CssLinearGradient scale(double factor) => CssLinearGradient(
    angle: angle,
    colors: [for (final c in colors) c.withValues(alpha: c.a * factor)],
    stops: stops,
  );

  @override
  bool operator ==(Object other) =>
      other is CssLinearGradient &&
      other.angle == angle &&
      _listEquals(other.colors, colors) &&
      _listEquals(other.stops, stops);

  @override
  int get hashCode =>
      Object.hash(angle, Object.hashAll(colors), Object.hashAll(stops ?? []));
}

/// A CSS `radial-gradient`: `circle at x% y%` (farthest-corner radius) when [radii] is null,
/// or `ellipse W% H% at x% y%` when [radii] holds the fractions of the box.
class CssRadialGradient extends Gradient {
  const CssRadialGradient({
    required this.center,
    required super.colors,
    super.stops,
    this.radii,
  });

  /// The centre as fractions of the box (`at 72% 22%` is `Offset(0.72, 0.22)`).
  final Offset center;

  /// Ellipse radii as fractions of the box width and height; null for a farthest-corner circle.
  final Size? radii;

  /// The centre in pixels and the horizontal and vertical radii for [rect].
  (Offset, double, double) geometry(Rect rect) {
    final c = Offset(
      rect.left + center.dx * rect.width,
      rect.top + center.dy * rect.height,
    );
    final r = radii;
    if (r != null) return (c, r.width * rect.width, r.height * rect.height);
    final far = [
      rect.topLeft,
      rect.topRight,
      rect.bottomLeft,
      rect.bottomRight,
    ].map((p) => (p - c).distance).reduce(math.max);
    return (c, far, far);
  }

  @override
  Shader createShader(Rect rect, {TextDirection? textDirection}) {
    final (c, rx, ry) = geometry(rect);
    if (rx == ry) return ui.Gradient.radial(c, rx, colors, stops);
    // A circle of radius rx, squashed vertically about the centre into the ellipse:
    // translate(c) · scale(1, ry/rx) · translate(-c), column-major.
    final k = ry / rx;
    final m = Float64List.fromList([
      1, 0, 0, 0, //
      0, k, 0, 0, //
      0, 0, 1, 0, //
      0, c.dy - k * c.dy, 0, 1,
    ]);
    return ui.Gradient.radial(c, rx, colors, stops, TileMode.clamp, m);
  }

  @override
  CssRadialGradient withOpacity(double opacity) => scale(opacity);

  @override
  CssRadialGradient scale(double factor) => CssRadialGradient(
    center: center,
    radii: radii,
    colors: [for (final c in colors) c.withValues(alpha: c.a * factor)],
    stops: stops,
  );

  @override
  bool operator ==(Object other) =>
      other is CssRadialGradient &&
      other.center == center &&
      other.radii == radii &&
      _listEquals(other.colors, colors) &&
      _listEquals(other.stops, stops);

  @override
  int get hashCode => Object.hash(
    center,
    radii,
    Object.hashAll(colors),
    Object.hashAll(stops ?? []),
  );
}

bool _listEquals<T>(List<T>? a, List<T>? b) {
  if (a == null || b == null) return a == b;
  if (a.length != b.length) return false;
  for (var i = 0; i < a.length; i++) {
    if (a[i] != b[i]) return false;
  }
  return true;
}
