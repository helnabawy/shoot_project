import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/motion/motion_policy.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon_button.dart';

/// Holds the play/pause state for a screen's ambient loops (the landing only, FR-021). Every
/// [Ambient] below it stops while paused, and never starts with reduced motion.
///
/// Feature 010 (the landing): [initiallyPaused] and [onChanged] let the page keep the choice on the
/// device. Under reduced motion the loops start paused and the control reads "Play"; pressing it
/// starts them for this visit only and [onChanged] is not called (spec FR-033).
class AmbientPause extends StatefulWidget {
  const AmbientPause({
    super.key,
    required this.child,
    this.initiallyPaused = false,
    this.onChanged,
  });

  final Widget child;
  final bool initiallyPaused;

  /// Called with the new paused state when the person presses the control (never for the
  /// reduced-motion visit).
  final ValueChanged<bool>? onChanged;

  static ValueNotifier<bool> of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<_AmbientScope>();
    assert(
      scope != null,
      'An ambient loop needs an AmbientPause above it, with its Pause control on screen (FR-021).',
    );
    return scope!.notifier!;
  }

  /// True when the person pressed Play while reduced motion is on: loops may run for this visit.
  static bool overridesReduced(BuildContext context) => context
      .dependOnInheritedWidgetOfExactType<_AmbientScope>()!
      .overrideReduced
      .value;

  @override
  State<AmbientPause> createState() => _AmbientPauseState();
}

class _AmbientPauseState extends State<AmbientPause> {
  late final _paused = ValueNotifier(widget.initiallyPaused);
  final _override = ValueNotifier(false);
  bool _reducedStart = false;
  bool _started = false;

  @override
  void initState() {
    super.initState();
    _paused.addListener(_changed);
  }

  void _changed() {
    final reduced = MotionPolicy.of(context).reduced;
    if (reduced) {
      _override.value = !_paused.value;
      return;
    }
    widget.onChanged?.call(_paused.value);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_started) return;
    _started = true;
    _reducedStart = MotionPolicy.of(context).reduced;
    // Still from the first frame; the control reads "Play" (FR-033).
    if (_reducedStart) {
      _paused.removeListener(_changed);
      _paused.value = true;
      _paused.addListener(_changed);
    }
  }

  @override
  void dispose() {
    _paused.dispose();
    _override.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => _AmbientScope(
    notifier: _paused,
    overrideReduced: _override,
    child: widget.child,
  );
}

class _AmbientScope extends InheritedNotifier<ValueNotifier<bool>> {
  const _AmbientScope({
    required super.notifier,
    required this.overrideReduced,
    required super.child,
  });

  final ValueNotifier<bool> overrideReduced;
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
    final reduced =
        MotionPolicy.of(context).reduced &&
        !AmbientPause.overridesReduced(context);
    final run = !paused && !reduced;
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
