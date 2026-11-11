import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/motion/arrive.dart';
import 'package:shoot_mobile/core/theme/shoot_scene.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// `glint`: a sheen 26 % of the width, skewed 18°, crosses the child once, 1.1 s after 2.4 s, from
/// the inline start (reversed in Arabic). With reduced motion there is no sheen at all.
class Glint extends StatelessWidget {
  const Glint({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    final sheen = context.scene.glintSheen;
    final rtl = Directionality.of(context) == TextDirection.rtl;
    return Arrive(
      duration: const Duration(milliseconds: 1100),
      delay: const Duration(milliseconds: 2400),
      child: child,
      builder: (context, t, child) {
        // Finished (or reduced): the sheen is off the button.
        if (t >= 1 || t <= 0) return child;
        // translateX(-140% → 460%) of a 26 %-wide band, as in the board's keyframes.
        final shift = -1.4 + 6 * t;
        // Clipped to the Top Hit's corners only while the sheen crosses, so the resting button
        // paints exactly as without a glint.
        return ClipRRect(
          borderRadius: BorderRadius.circular(ShootRadius.row),
          child: Stack(
            children: [
              child,
              Positioned.fill(
                child: IgnorePointer(
                  child: LayoutBuilder(
                    builder: (context, box) {
                      final w = box.maxWidth * .26;
                      final x = w * shift;
                      return Transform(
                        transform: Matrix4.identity()
                          ..translateByDouble(
                            rtl ? box.maxWidth - w - x : x,
                            0,
                            0,
                            1,
                          )
                          ..setEntry(0, 1, rtl ? .32 : -.32), // skewX(∓18°)
                        child: SizedBox(
                          width: w,
                          height: box.maxHeight,
                          child: DecoratedBox(
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  sheen.withValues(alpha: 0),
                                  sheen,
                                  sheen.withValues(alpha: 0),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
