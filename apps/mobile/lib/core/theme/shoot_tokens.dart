import 'package:flutter/animation.dart';

/// Theme-independent tokens from `specs/design-system/tokens.css`.
/// Values are logical pixels (CSS px == Flutter dp).
abstract final class ShootSpace {
  static const double s1 = 4;
  static const double s2 = 8;
  static const double s3 = 12;
  static const double s4 = 16;
  static const double s5 = 20;
  static const double s6 = 24;
  static const double s8 = 32;
  static const double s12 = 48;
  static const double s16 = 64;
  static const double s24 = 96;
}

abstract final class ShootSize {
  static const double rowHeight = 44;
  static const double tile = 30;
  static const double photoTile = 44;
  static const double topHitHeight = 50;

  /// Minimum touch target (WCAG / constitution: >= 44).
  static const double iconButton = 44;

  static const double column = 680;
  static const double formColumn = 480;
  static const double accountColumn = 560;

  /// `.hd`, the screen header.
  static const double header = 58;

  /// `--row-block`: the vertical padding inside a result row.
  static const double rowBlock = 7;

  static const double pane = 1080;

  /// A creator card is this fraction of the screen width (296 on the 360 board).
  static const double carouselRatio = 296 / 360;

  /// Phone layouts are centred at this width on tablets (FR-034).
  static const double maxColumn = 600;
}

abstract final class ShootRadius {
  static const double keyHint = 5;
  static const double message = 6;
  static const double tile = 8;
  static const double row = 9;
  static const double photoTile = 10;
  static const double photoLarge = 12;
  static const double panel = 14;
  static const double sheet = 20;
  static const double pill = 999;
}

/// "Arrive" motion tier: plays once when a thing first appears (`tokens.css` motion, arrive).
/// With reduced motion every arrive widget builds its end state at once.
abstract final class ShootArrive {
  static const rise = Duration(milliseconds: 500);
  static const stagger = Duration(milliseconds: 70);
  static const firstDelay = Duration(milliseconds: 60);
  static const focus = Duration(milliseconds: 700);
  static const roll = Duration(milliseconds: 700);
  static const draw = Duration(milliseconds: 500);
  static const grow = Duration(milliseconds: 900);
  static const write = Duration(milliseconds: 1100);
  static const deal = Duration(milliseconds: 600);
  static const shake = Duration(milliseconds: 450);
}

/// "Ambient" motion tier: rationed. Loops only on the landing, under its Pause control; every
/// other screen's self-started motion ends within [selfStartedBudget] (WCAG 2.2.2).
abstract final class ShootAmbient {
  static const glint = Duration(seconds: 7);
  static const keylight = Duration(seconds: 14);
  static const settle = Duration(seconds: 5);
  static const drift = Duration(seconds: 44);
  static const pulse = Duration(milliseconds: 2400);
  static const selfStartedBudget = Duration(seconds: 5);
}

/// "React" motion tier: answers the person. Respect
/// `MediaQuery.disableAnimationsOf(context)` (reduced motion) by using
/// [Duration.zero] when it is true.
abstract final class ShootMotion {
  static const fast = Duration(milliseconds: 120);
  static const base = Duration(milliseconds: 180);
  static const slow = Duration(milliseconds: 260);
  static const standard = Cubic(0.2, 0, 0, 1);
  static const exit = Cubic(0.4, 0, 1, 1);
}
