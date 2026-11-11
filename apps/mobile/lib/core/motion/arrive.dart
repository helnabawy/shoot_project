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
/// [curve]. With reduced motion it builds the finished state (t = 1) on the first frame and never
/// starts a ticker.
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
  Timer? _timer;
  bool _decided = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_decided) return;
    _decided = true;
    if (MotionPolicy.of(context).reduced) return; // finished state, no ticker
    final c = AnimationController(vsync: this, duration: widget.duration);
    _controller = c;
    if (widget.delay == Duration.zero) {
      unawaited(c.forward());
    } else {
      _timer = Timer(widget.delay, () {
        if (mounted) unawaited(c.forward());
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = _controller;
    if (c == null) return widget.builder(context, 1, widget.child);
    return AnimatedBuilder(
      animation: c,
      child: widget.child,
      builder: (context, child) =>
          widget.builder(context, widget.curve.transform(c.value), child!),
    );
  }
}
