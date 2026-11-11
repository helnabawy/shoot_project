import 'dart:ui' as ui;

import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/motion/arrive.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// `draw`: the tick (`M20 7 9 18l-5-5`) draws in, 500 ms after 500 ms plus 80 ms per [index].
class DrawCheck extends StatelessWidget {
  const DrawCheck({
    super.key,
    required this.color,
    this.size = 16,
    this.strokeWidth = 2.2,
    this.index = 0,
  });

  final Color color;
  final double size;
  final double strokeWidth;

  /// Position in a list, for the 80 ms step.
  final int index;

  @override
  Widget build(BuildContext context) => ExcludeSemantics(
    child: Arrive(
      duration: ShootArrive.draw,
      delay: Duration(milliseconds: 500 + 80 * index),
      // The finished tick is the child, so motion off draws it whole.
      child: CustomPaint(
        size: Size.square(size),
        painter: _TickPainter(1, color, strokeWidth),
      ),
      builder: (context, t, _) => CustomPaint(
        size: Size.square(size),
        painter: _TickPainter(t, color, strokeWidth),
      ),
    ),
  );
}

class _TickPainter extends CustomPainter {
  _TickPainter(this.t, this.color, this.strokeWidth);

  final double t;
  final Color color;
  final double strokeWidth;

  @override
  void paint(Canvas canvas, Size size) {
    canvas.scale(size.width / 24);
    final tick = Path()
      ..moveTo(20, 7)
      ..lineTo(9, 18)
      ..lineTo(4, 13);
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;
    if (t >= 1) {
      canvas.drawPath(tick, paint);
      return;
    }
    final out = Path();
    for (final ui.PathMetric m in tick.computeMetrics()) {
      out.addPath(m.extractPath(0, m.length * t), Offset.zero);
    }
    canvas.drawPath(out, paint);
  }

  @override
  bool shouldRepaint(_TickPainter old) =>
      old.t != t || old.color != color || old.strokeWidth != strokeWidth;
}
