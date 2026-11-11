import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/motion/motion_policy.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// `shake`: −6, 6, −4, 3 px over 450 ms, once each time [trigger] changes (an error), never on
/// mount. Nothing moves with reduced motion; the error text says what happened.
class Shake extends StatefulWidget {
  const Shake({super.key, required this.trigger, required this.child});

  /// Change it (an error count) to shake once.
  final int trigger;
  final Widget child;

  @override
  State<Shake> createState() => _ShakeState();
}

class _ShakeState extends State<Shake> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: ShootArrive.shake,
  );

  @override
  void didUpdateWidget(Shake old) {
    super.didUpdateWidget(old);
    if (old.trigger != widget.trigger && !MotionPolicy.of(context).reduced) {
      unawaited(_c.forward(from: 0));
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  /// The board's keyframes: 0 at 0 %, −6 at 20 %, 6 at 40 %, −4 at 60 %, 3 at 80 %, 0 at 100 %.
  static double offsetAt(double t) {
    const stops = [0.0, -6.0, 6.0, -4.0, 3.0, 0.0];
    final x = (t.clamp(0, 1) * 5).toDouble();
    final i = x.floor().clamp(0, 4);
    return stops[i] + (stops[i + 1] - stops[i]) * (x - i);
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _c,
    child: widget.child,
    builder: (context, child) => Transform.translate(
      offset: Offset(offsetAt(_c.value), 0),
      child: child,
    ),
  );
}
