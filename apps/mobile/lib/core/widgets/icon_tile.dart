import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';

/// The tile's surface: `surfaceSunk` (most boards), `tile` (`--tile`, boards 24 and 25) or
/// `success` with `onSuccess` ink (`.t30.ok`, a finished item).
enum IconTileTone { sunk, tile, success }

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
    this.tone = IconTileTone.sunk,
  });

  /// The 56 px `.big` mark above an error state (radius 14, 26 px icon, stroke 1.8).
  const IconTile.big(this.icon, {super.key})
    : size = 56,
      radius = ShootRadius.panel,
      iconSize = 26,
      strokeWidth = 1.8,
      tone = IconTileTone.sunk;

  const IconTile.large(this.icon, {super.key})
    : size = ShootSize.photoTile,
      radius = ShootRadius.photoTile,
      iconSize = 20,
      strokeWidth = 2,
      tone = IconTileTone.sunk;

  final ShootIcons icon;
  final double size;
  final double radius;
  final double iconSize;
  final double strokeWidth;
  final IconTileTone tone;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final (background, ink) = switch (tone) {
      IconTileTone.sunk => (c.surfaceSunk, c.tileInk),
      IconTileTone.tile => (c.tile, c.tileInk),
      IconTileTone.success => (c.success, c.onSuccess),
    };
    return ExcludeSemantics(
      child: Container(
        width: size,
        height: size,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(radius),
        ),
        child: ShootIcon(
          icon,
          size: iconSize,
          strokeWidth: strokeWidth,
          color: ink,
        ),
      ),
    );
  }
}
