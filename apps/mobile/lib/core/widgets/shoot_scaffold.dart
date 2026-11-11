import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/widgets/corner_glow.dart';

/// `.root`: the ground, the corner glow, the safe areas, and the content in a centred column no
/// wider than [ShootSize.maxColumn] on tablets (FR-034).
class ShootScaffold extends StatelessWidget {
  const ShootScaffold({super.key, required this.child});

  /// Usually a [Column] of a `ShootHeader` and the screen's content.
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: context.colors.ground,
      child: ClipRect(
        child: Stack(
          children: [
            const CornerGlow(),
            SafeArea(
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(
                    maxWidth: ShootSize.maxColumn,
                  ),
                  child: child,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
