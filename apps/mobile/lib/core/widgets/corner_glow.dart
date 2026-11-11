import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/theme/css_gradient.dart';
import 'package:shoot_mobile/core/theme/shoot_scene.dart';

/// `.root::before`: a 400 px warm glow off the top inline-end corner of every screen.
class CornerGlow extends StatelessWidget {
  const CornerGlow({super.key});

  @override
  Widget build(BuildContext context) {
    final scene = context.scene;
    return PositionedDirectional(
      top: -130,
      end: -100,
      width: 400,
      height: 400,
      child: IgnorePointer(
        child: DecoratedBox(
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            // CSS `radial-gradient(circle, …)`: stops measured to the farthest corner.
            gradient: CssRadialGradient(
              center: const Offset(0.5, 0.5),
              colors: [
                scene.cornerGlow,
                scene.cornerGlowMid,
                scene.cornerGlowMid.withValues(alpha: 0),
              ],
              stops: const [0, 0.34, 0.68],
            ),
          ),
        ),
      ),
    );
  }
}
