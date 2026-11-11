import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// How much motion a screen may make (feature 007, FR-020 to FR-023).
///
/// - [reduced]: the person asked for less motion; every arrive widget builds its end state at once
///   and ambient loops never start.
/// - [selfStartedBudget]: motion the person did not start ends within 5 s on every screen but the
///   landing's paused loops (WCAG 2.2.2). Arrive sequences are designed inside it: the longest,
///   the Top Hit glint, ends at 3.5 s.
@immutable
final class MotionPolicy {
  const MotionPolicy({required this.reduced});

  final bool reduced;

  Duration get selfStartedBudget => ShootAmbient.selfStartedBudget;

  static MotionPolicy of(BuildContext context) =>
      MotionPolicy(reduced: MediaQuery.disableAnimationsOf(context));
}
