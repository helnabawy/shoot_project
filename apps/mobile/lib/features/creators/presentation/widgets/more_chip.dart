import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// `.chip.more`: the dashed chip that opens the full lists (board 15) or the emirates (board 18).
class MoreChip extends StatelessWidget {
  const MoreChip({super.key, required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      label: label,
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: CustomPaint(
          painter: _DashedBorder(color: c.controlBorder),
          child: Container(
            constraints: const BoxConstraints(minHeight: 40, minWidth: 44),
            padding: const EdgeInsetsDirectional.symmetric(horizontal: 14),
            alignment: Alignment.center,
            child: Text(label, style: ShootType.chip.copyWith(color: c.mute)),
          ),
        ),
      ),
    );
  }
}

class _DashedBorder extends CustomPainter {
  const _DashedBorder({required this.color});

  final Color color;

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    final path = Path()
      ..addRRect(
        RRect.fromRectAndRadius(
          (Offset.zero & size).deflate(.5),
          const Radius.circular(ShootRadius.row),
        ),
      );
    for (final metric in path.computeMetrics()) {
      var distance = 0.0;
      while (distance < metric.length) {
        canvas.drawPath(metric.extractPath(distance, distance + 3), paint);
        distance += 6;
      }
    }
  }

  @override
  bool shouldRepaint(_DashedBorder old) => old.color != color;
}
