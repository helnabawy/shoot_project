import 'dart:ui' as ui;

import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/motion/arrive.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// `focus`: comes into focus, opacity 0→1, blur 10→0, scale 1.06→1, 700 ms after 250 ms.
class FocusIn extends StatelessWidget {
  const FocusIn({
    super.key,
    required this.child,
    this.delay = const Duration(milliseconds: 250),
  });

  final Widget child;
  final Duration delay;

  @override
  Widget build(BuildContext context) => Arrive(
    duration: ShootArrive.focus,
    delay: delay,
    child: child,
    builder: (context, t, child) {
      if (t >= 1) return child;
      final sigma = 10 * (1 - t);
      return Opacity(
        opacity: t,
        child: Transform.scale(
          scale: 1 + .06 * (1 - t),
          child: ImageFiltered(
            imageFilter: ui.ImageFilter.blur(sigmaX: sigma, sigmaY: sigma),
            child: child,
          ),
        ),
      );
    },
  );
}
