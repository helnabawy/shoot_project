import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/widgets/scene_tile.dart';

/// `.photo`: a 44 px photo tile, radius 10. Shows [image] when there is one, otherwise a
/// [SceneTile] (an honest placeholder, never an invented photo). Decorative unless [label] is set.
class PhotoTile extends StatelessWidget {
  const PhotoTile({
    super.key,
    this.image,
    this.label,
    this.size = ShootSize.photoTile,
    this.radius = ShootRadius.photoTile,
    this.variant = 0,
  });

  final ImageProvider? image;
  final String? label;
  final double size;
  final double radius;
  final int variant;

  @override
  Widget build(BuildContext context) {
    final tile = image == null
        ? SceneTile(variant: variant, radius: radius)
        : ClipRRect(
            borderRadius: BorderRadius.circular(radius),
            child: Image(image: image!, fit: BoxFit.cover),
          );
    return Semantics(
      image: label != null,
      label: label,
      excludeSemantics: true,
      child: SizedBox.square(dimension: size, child: tile),
    );
  }
}
