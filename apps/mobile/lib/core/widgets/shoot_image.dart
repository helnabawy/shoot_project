import 'dart:math' as math;

import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/core/widgets/scene_tile.dart';

/// A photo from the API (008 research R9). It picks the smallest stored size
/// at least as wide as the rendered width × the device pixel ratio (else the
/// largest), decodes at that width (`cacheWidth`), and shows the designed
/// [SceneTile] while loading, when the load fails and when there is no image:
/// never a broken image or an invented picture (FR-052).
///
/// The alt text is the semantics label; an empty alt marks a decorative
/// image, which is left out of semantics.
class ShootImage extends StatelessWidget {
  const ShootImage(
    this.image, {
    super.key,
    this.width,
    this.height,
    this.fit = BoxFit.cover,
    this.sceneIndex = 0,
  });

  final ImageRef? image;

  /// The rendered size; the layout's width is used when [width] is `null`.
  final double? width;
  final double? height;
  final BoxFit fit;

  /// The [SceneTile] variant shown in place of the photo.
  final int sceneIndex;

  @override
  Widget build(BuildContext context) {
    final image = this.image;
    final scene = SceneTile(variant: sceneIndex);
    final Widget content;
    if (image == null) {
      content = scene;
    } else {
      content = LayoutBuilder(
        builder: (context, constraints) {
          final rendered =
              width ??
              (constraints.hasBoundedWidth
                  ? constraints.maxWidth
                  : image.width.toDouble());
          final target = rendered * MediaQuery.devicePixelRatioOf(context);
          final size = image.pick(target);
          return Image.network(
            size.url,
            width: width,
            height: height,
            fit: fit,
            cacheWidth: math.max(1, math.min(target.ceil(), size.width)),
            excludeFromSemantics: true,
            frameBuilder: (context, child, frame, wasSynchronouslyLoaded) =>
                frame == null && !wasSynchronouslyLoaded ? scene : child,
            errorBuilder: (context, error, stackTrace) => scene,
          );
        },
      );
    }
    final sized = SizedBox(width: width, height: height, child: content);
    final alt = image?.alt ?? '';
    if (alt.isEmpty) return ExcludeSemantics(child: sized);
    return Semantics(
      label: alt,
      image: true,
      child: ExcludeSemantics(child: sized),
    );
  }
}
