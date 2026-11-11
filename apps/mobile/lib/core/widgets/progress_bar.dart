import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/motion/grow.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';

/// `.track`: 6 high, radius 3, the track `ink` at 8 %, the fill `accent` from the inline start;
/// grows in once (900 ms). Announced with its value.
class ProgressBar extends StatelessWidget {
  const ProgressBar({super.key, required this.value, required this.label});

  /// 0 to 1.
  final double value;

  /// What it measures ("Profile complete").
  final String label;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final v = value.clamp(0.0, 1.0);
    return Semantics(
      label: label,
      value: '${(v * 100).round()}%',
      excludeSemantics: true,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(3),
        child: Container(
          height: 6,
          color: c.ink.withValues(alpha: .08),
          alignment: AlignmentDirectional.centerStart,
          child: FractionallySizedBox(
            widthFactor: v,
            heightFactor: 1,
            child: Grow(
              child: DecoratedBox(
                decoration: BoxDecoration(
                  color: c.accent,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
