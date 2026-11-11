import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_shadows.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// `.panel` (and `.sum` with [padding] 8): `panelSolid`, 1 px `hair`, radius 14, the `lift` shadow.
class ShootPanel extends StatelessWidget {
  const ShootPanel({super.key, required this.child, this.padding});

  final Widget child;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final brightness = Theme.of(context).brightness;
    return DecoratedBox(
      decoration: BoxDecoration(
        color: c.panelSolid,
        border: Border.all(color: c.hair),
        borderRadius: BorderRadius.circular(ShootRadius.panel),
        boxShadow: ShootShadows.of(brightness).lift,
      ),
      child: Padding(padding: padding ?? EdgeInsets.zero, child: child),
    );
  }
}

/// `.bar`: the floating Brief Bar panel. Translucent `panel` over a 20 px backdrop blur, 1 px
/// `hair`, radius 14, the `panel` shadow (0 24 60).
class FloatingPanel extends StatelessWidget {
  const FloatingPanel({super.key, required this.child, this.padding});

  final Widget child;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final radius = BorderRadius.circular(ShootRadius.panel);
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: radius,
        boxShadow: ShootShadows.of(Theme.of(context).brightness).panel,
      ),
      child: ClipRRect(
        borderRadius: radius,
        child: BackdropFilter(
          // CSS `backdrop-filter: blur(20px)` is already a sigma.
          filter: ui.ImageFilter.blur(sigmaX: 20, sigmaY: 20),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: c.panel,
              border: Border.all(color: c.hair),
              borderRadius: radius,
            ),
            child: Padding(padding: padding ?? EdgeInsets.zero, child: child),
          ),
        ),
      ),
    );
  }
}

/// A bottom sheet's surface: `panelSolid`, top corners radius 20, the `sheet` shadow cast upwards.
class ShootSheet extends StatelessWidget {
  const ShootSheet({super.key, required this.child, this.label});

  final Widget child;

  /// What a screen reader announces for the sheet.
  final String? label;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      scopesRoute: true,
      namesRoute: label != null,
      explicitChildNodes: true,
      label: label,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: c.panelSolid,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(ShootRadius.sheet),
          ),
          boxShadow: ShootShadows.of(Theme.of(context).brightness).sheet,
        ),
        child: child,
      ),
    );
  }
}
