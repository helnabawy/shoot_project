import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/motion/motion_policy.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// Builds a frame of an arrive animation from its progress (0 = start, 1 = the finished state).
typedef ArriveBuilder = Widget Function(
  BuildContext context,
  double t,
  Widget child,
);

/// The base of every arrive widget: plays once per mount, after [delay], over [duration] with
/// [curve]. The delay is part of the animation (an interval), so it runs on frames like the rest.
/// With reduced motion it builds the finished state on the first frame and never starts a ticker;
/// the finished state is always [child] itself, with no layers around it.
class Arrive extends StatefulWidget {
  const Arrive({
    super.key,
    required this.duration,
    required this.builder,
    required this.child,
    this.delay = Duration.zero,
    this.curve = ShootMotion.standard,
  });

  final Duration duration;
  final Duration delay;
  final Curve curve;
  final ArriveBuilder builder;
  final Widget child;

  @override
  State<Arrive> createState() => _ArriveState();
}

class _ArriveState extends State<Arrive> with SingleTickerProviderStateMixin {
  AnimationController? _controller;
  late Curve _curve;
  bool _decided = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_decided) return;
    _decided = true;
    if (MotionPolicy.of(context).reduced) return; // finished state, no ticker
    final total = widget.delay + widget.duration;
    final start = total.inMicroseconds == 0
        ? 0.0
        : widget.delay.inMicroseconds / total.inMicroseconds;
    _curve = Interval(start, 1, curve: widget.curve);
    final c = AnimationController(vsync: this, duration: total);
    _controller = c;
    unawaited(c.forward());
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = _controller;
    if (c == null) return widget.child;
    return AnimatedBuilder(
      animation: c,
      child: widget.child,
      builder: (context, child) => c.isCompleted
          ? child!
          : widget.builder(context, _curve.transform(c.value), child!),
    );
  }
}
