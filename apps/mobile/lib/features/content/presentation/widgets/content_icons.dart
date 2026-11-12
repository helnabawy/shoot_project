import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';

/// The line icons only the content screens use, copied verbatim from boards 33 to 38 (24 x 24 view
/// box, round caps). Kept here, not in the shared `ShootIcons`, so sibling features adding icons
/// never conflict with this one (plan, Complexity Tracking).
enum ContentIcons {
  menu('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  book(
    '<path d="M5 4h13v16H7a2 2 0 0 1-2-2z"/><path d="M5 18a2 2 0 0 1 2-2h11"/>',
  ),
  clock('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  rss(
    '<path d="M5 5a14 14 0 0 1 14 14M5 11a8 8 0 0 1 8 8"/>'
    '<circle cx="6" cy="18" r="1.5"/>',
  ),
  scale('<path d="M12 4v16M6 20h12M5 8h14M5 8l-2 6h4zM19 8l-2 6h4z"/>'),
  image(
    '<rect x="3" y="5" width="18" height="14" rx="2"/>'
    '<path d="m3 16 5-5 4 4 3-3 6 6"/>',
  ),
  trash('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  whatsapp('<path d="M21 12a9 9 0 0 1-13.2 8L3 21l1.1-4.6A9 9 0 1 1 21 12z"/>'),
  chevron('<path d="m9 6 6 6-6 6"/>', directional: true),
  chevronDown('<path d="m6 9 6 6 6-6"/>');

  const ContentIcons(this.body, {this.directional = false});

  final String body;

  /// Implies a direction, so it mirrors in right-to-left (FR-043).
  final bool directional;

  String svg(double strokeWidth) =>
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" '
      'stroke="#000" stroke-width="$strokeWidth" stroke-linecap="round" '
      'stroke-linejoin="round">$body</svg>';
}

/// One content icon at [size] in [color]; decorative.
class ContentIcon extends StatelessWidget {
  const ContentIcon(
    this.icon, {
    super.key,
    this.size = 16,
    required this.color,
    this.strokeWidth = 2.2,
  });

  final ContentIcons icon;
  final double size;
  final Color color;
  final double strokeWidth;

  @override
  Widget build(BuildContext context) {
    Widget picture = SvgPicture.string(
      icon.svg(strokeWidth),
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
      excludeFromSemantics: true,
    );
    if (icon.directional && Directionality.of(context) == TextDirection.rtl) {
      picture = Transform.flip(flipX: true, child: picture);
    }
    return SizedBox.square(dimension: size, child: picture);
  }
}

/// `.t30` and `.big`: the rounded tile behind a row icon or an empty-state mark.
class ContentTile extends StatelessWidget {
  const ContentTile(
    this.icon, {
    super.key,
    this.size = ShootSize.tile,
    this.radius = ShootRadius.tile,
    this.iconSize = 15,
    this.strokeWidth = 2.2,
  });

  const ContentTile.big(this.icon, {super.key})
    : size = 56,
      radius = ShootRadius.panel,
      iconSize = 26,
      strokeWidth = 1.8;

  final ContentIcons icon;
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
        child: ContentIcon(
          icon,
          size: iconSize,
          strokeWidth: strokeWidth,
          color: c.tileInk,
        ),
      ),
    );
  }
}
