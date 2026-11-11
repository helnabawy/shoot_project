import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/motion/arrive.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// `grow`: scales in horizontally from the inline start (the right in Arabic), 900 ms after 350 ms.
class Grow extends StatelessWidget {
  const Grow({
    super.key,
    required this.child,
    this.delay = const Duration(milliseconds: 350),
  });

  final Widget child;
  final Duration delay;

  @override
  Widget build(BuildContext context) => Arrive(
    duration: ShootArrive.grow,
    delay: delay,
    child: child,
    builder: (context, t, child) => Transform(
      alignment: AlignmentDirectional.centerStart.resolve(
        Directionality.of(context),
      ),
      transform: Matrix4.diagonal3Values(t, 1, 1),
      child: child,
    ),
  );
}
