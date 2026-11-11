import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/theme/css_gradient.dart';
import 'package:shoot_mobile/core/theme/shoot_scene.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// `.sc`: the honest placeholder where a photo will go. Three layers, as in the board's CSS: a
/// radial key light, a low dune ellipse, and a linear sweep. Three variants cycle by position
/// (`.sc`, `:nth-child(2n)`, `:nth-child(3n)`). Decorative.
class SceneTile extends StatelessWidget {
  const SceneTile({
    super.key,
    this.variant = 0,
    this.radius = ShootRadius.photoTile,
    this.child,
  });

  /// The variant for the [position]-th tile in a row (1-based), as the board's CSS picks it.
  static int variantFor(int position) => position % 3 == 0
      ? 2
      : position.isEven
      ? 1
      : 0;

  /// 0, 1 or 2.
  final int variant;
  final double radius;

  /// Shown over the scene, in `sceneInk` (a glyph or initials).
  final Widget? child;

  @override
  Widget build(BuildContext context) {
    final s = context.scene;
    final (key, keyAt, keyStop, duneAt, angle, top, bottom) = switch (variant %
        3) {
      0 => (
        s.sceneTileKey,
        const Offset(.72, .22),
        .46,
        const Offset(.28, 1.12),
        160.0,
        s.sceneTileTop,
        s.sceneTileBottom,
      ),
      1 => (
        s.sceneTileKey2,
        const Offset(.26, .26),
        .44,
        const Offset(.74, 1.14),
        200.0,
        s.sceneTile2Top,
        s.sceneTile2Bottom,
      ),
      _ => (
        s.sceneTileKey3,
        const Offset(.5, .18),
        .48,
        const Offset(.5, 1.16),
        140.0,
        s.sceneTile3Top,
        s.sceneTile3Bottom,
      ),
    };
    Widget layer(Gradient g) =>
        DecoratedBox(decoration: BoxDecoration(gradient: g));
    return ExcludeSemantics(
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: Stack(
          fit: StackFit.passthrough,
          children: [
            Positioned.fill(
              child: layer(
                CssLinearGradient(angle: angle, colors: [top, bottom]),
              ),
            ),
            Positioned.fill(
              child: layer(
                CssRadialGradient(
                  center: duneAt,
                  radii: const Size(.9, .3),
                  colors: [
                    s.sceneDune,
                    s.sceneDune,
                    s.sceneDune.withValues(alpha: 0),
                  ],
                  stops: const [0, .99, 1],
                ),
              ),
            ),
            Positioned.fill(
              child: layer(
                CssRadialGradient(
                  center: keyAt,
                  colors: [key, key.withValues(alpha: 0)],
                  stops: [0, keyStop],
                ),
              ),
            ),
            if (child case final c?)
              Center(
                child: IconTheme(
                  data: IconThemeData(color: s.sceneInk),
                  child: DefaultTextStyle.merge(
                    style: TextStyle(color: s.sceneInk),
                    child: c,
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
