import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_shadows.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// `.card`: a creator in the Quick Match rail. [ShootSize.carouselRatio] of the screen width (296 at
/// 360), `panelSolid`, 1 px `hair` (2 px `accent` when [chosen]), radius 14, padding 10, gap 10,
/// the `lift` shadow. Announced as a button with its selected state.
class CreatorCard extends StatelessWidget {
  const CreatorCard({
    super.key,
    required this.label,
    required this.children,
    required this.onTap,
    this.chosen = false,
  });

  /// What a screen reader says (name, specialty, price).
  final String label;
  final List<Widget> children;
  final VoidCallback? onTap;
  final bool chosen;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final width = MediaQuery.sizeOf(context).width * ShootSize.carouselRatio;
    return Semantics(
      button: true,
      selected: chosen,
      label: label,
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : ShootMotion.base,
          width: width,
          padding: EdgeInsets.all(
            chosen ? 9 : 10,
          ), // keeps the content still as the border thickens
          decoration: BoxDecoration(
            color: c.panelSolid,
            border: Border.all(
              color: chosen ? c.accent : c.hair,
              width: chosen ? 2 : 1,
            ),
            borderRadius: BorderRadius.circular(ShootRadius.panel),
            boxShadow: ShootShadows.of(Theme.of(context).brightness).lift,
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            spacing: 10,
            children: children,
          ),
        ),
      ),
    );
  }
}
