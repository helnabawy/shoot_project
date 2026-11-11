import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/motion/arrive.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// `rise`: fades in while moving up 14 px, 500 ms, `ease-standard`.
class Rise extends StatelessWidget {
  const Rise({super.key, required this.child, this.delay = Duration.zero});

  final Widget child;
  final Duration delay;

  @override
  Widget build(BuildContext context) => Arrive(
    duration: ShootArrive.rise,
    delay: delay,
    child: child,
    builder: (context, t, child) => Opacity(
      opacity: t,
      child: Transform.translate(offset: Offset(0, 14 * (1 - t)), child: child),
    ),
  );
}

/// The boards' `.root > *` cascade: each child rises 70 ms after the one before, the first at
/// 60 ms. Returns the children wrapped, for a [Column] or any multi-child layout.
List<Widget> stagger(List<Widget> children) => [
  for (final (i, child) in children.indexed)
    Rise(delay: ShootArrive.firstDelay + ShootArrive.stagger * i, child: child),
];
