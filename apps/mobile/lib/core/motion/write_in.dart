import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/motion/arrive.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// `write`: a line reveals itself from the inline start, as if written, 1100 ms.
class WriteIn extends StatelessWidget {
  const WriteIn({super.key, required this.child, this.delay = Duration.zero});

  final Widget child;
  final Duration delay;

  @override
  Widget build(BuildContext context) => Arrive(
    duration: ShootArrive.write,
    delay: delay,
    curve: Curves.linear,
    child: child,
    builder: (context, t, child) => t >= 1
        ? child
        : ClipRect(
            child: Align(
              alignment: AlignmentDirectional.centerStart,
              widthFactor: t,
              child: child,
            ),
          ),
  );
}
