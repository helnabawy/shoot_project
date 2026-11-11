import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';

/// `.t30`: a 30 px tile, radius 8, `surfaceSunk`, with a 16 px `tileInk` icon. Decorative.
/// [IconTile.large] is the 44 px `.tile` (radius 10, 20 px icon) above an empty state.
class IconTile extends StatelessWidget {
  const IconTile(
    this.icon, {
    super.key,
    this.size = ShootSize.tile,
    this.radius = ShootRadius.tile,
    this.iconSize = 16,
    this.strokeWidth = 2.2,
  });

  const IconTile.large(this.icon, {super.key})
    : size = ShootSize.photoTile,
      radius = ShootRadius.photoTile,
      iconSize = 20,
      strokeWidth = 2;

  final ShootIcons icon;
  final double size;
  final double radius;
  final double iconSize;
  final double strokeWidth;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: c.surfaceSunk,
          borderRadius: BorderRadius.circular(radius),
        ),
        child: ShootIcon(
          icon,
          size: iconSize,
          strokeWidth: strokeWidth,
          color: c.tileInk,
        ),
      ),
    );
  }
}
