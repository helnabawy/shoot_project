import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/motion/motion_policy.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';

/// Holds the play/pause state for a screen's ambient loops (the landing only, FR-021). Every
/// [Ambient] below it stops while paused, and never starts with reduced motion.
class AmbientPause extends StatefulWidget {
  const AmbientPause({super.key, required this.child});

  final Widget child;

  static ValueNotifier<bool> of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<_AmbientScope>();
    assert(
      scope != null,
      'An ambient loop needs an AmbientPause above it, with its Pause control on screen (FR-021).',
    );
    return scope!.notifier!;
  }

  @override
  State<AmbientPause> createState() => _AmbientPauseState();
}

class _AmbientPauseState extends State<AmbientPause> {
  final _paused = ValueNotifier(false);

  @override
  void dispose() {
    _paused.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      _AmbientScope(notifier: _paused, child: widget.child);
}

class _AmbientScope extends InheritedNotifier<ValueNotifier<bool>> {
  const _AmbientScope({required super.notifier, required super.child});
}

/// The Pause / Play control for the ambient loops: a 44 px icon button.
class AmbientPauseButton extends StatelessWidget {
  const AmbientPauseButton({
    super.key,
    required this.pauseLabel,
    required this.playLabel,
  });

  final String pauseLabel;
  final String playLabel;

  @override
  Widget build(BuildContext context) {
    final paused = AmbientPause.of(context);
    return ShootIconButton(
      icon: paused.value ? ShootIcons.play : ShootIcons.pause,
      label: paused.value ? playLabel : pauseLabel,
      onPressed: () => paused.value = !paused.value,
    );
  }
}

/// A looping child that runs only while its [AmbientPause] is playing and motion is not reduced.
/// [builder] gets the loop's progress, 0 to 1, repeating every [period].
class Ambient extends StatefulWidget {
  const Ambient({
    super.key,
    required this.period,
    required this.builder,
    this.reverse = false,
  });

  final Duration period;
  final bool reverse;
  final Widget Function(BuildContext context, double t) builder;

  @override
  State<Ambient> createState() => _AmbientState();
}

class _AmbientState extends State<Ambient> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: widget.period,
  );

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final paused = AmbientPause.of(context).value;
    final run = !paused && !MotionPolicy.of(context).reduced;
    if (run && !_c.isAnimating) {
      _c.repeat(reverse: widget.reverse);
    } else if (!run && _c.isAnimating) {
      _c.stop();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AnimatedBuilder(
    animation: _c,
    builder: (context, _) => widget.builder(context, _c.value),
  );
}
