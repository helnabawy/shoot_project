import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/motion/arrive.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// `roll`: a number slides up into place from 110 % below, clipped, 700 ms after 550 ms.
class Roll extends StatelessWidget {
  const Roll({
    super.key,
    required this.child,
    this.delay = const Duration(milliseconds: 550),
  });

  final Widget child;
  final Duration delay;

  @override
  Widget build(BuildContext context) => ClipRect(
    child: Arrive(
      duration: ShootArrive.roll,
      delay: delay,
      child: child,
      builder: (context, t, child) => FractionalTranslation(
        translation: Offset(0, 1.1 * (1 - t)),
        child: child,
      ),
    ),
  );
}
