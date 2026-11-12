import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// The boards' line icons, copied verbatim from their inline SVG (24 × 24 view box, round caps).
/// Strokes are `currentColor`, recoloured by [ShootIcon.color].
enum ShootIcons {
  /// Search with a question mark (board 37's tile).
  searchQuestion(
    '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'
    '<path d="M9 9.5a2 2 0 1 1 2.5 2c-.4.2-.5.5-.5 1"/><path d="M11 14.5h.01"/>',
  ),
  person('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  calendar(
    '<rect x="3" y="5" width="18" height="16" rx="2"/>'
    '<path d="M3 10h18M8 3v4m8-4v4"/>',
  ),

  /// Points to the inline end; mirrored in right-to-left.
  chevron('<path d="m9 6 6 6-6 6"/>', directional: true),

  /// Points back (inline start); mirrored in right-to-left.
  back('<path d="m15 6-6 6 6 6"/>', directional: true),
  whatsapp('<path d="M21 12a9 9 0 0 1-13.2 8L3 21l1.1-4.6A9 9 0 1 1 21 12z"/>'),
  home('<path d="M4 11 12 4l8 7v9h-5v-6H9v6H4z"/>'),

  /// Feature 010 (menu and landing header).
  close('<path d="M6 6l12 12M18 6 6 18"/>'),
  menu('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  creators(
    '<circle cx="9" cy="8" r="3.5"/>'
    '<path d="M2 20a7 7 0 0 1 14 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6 6 0 0 1 4 6"/>',
  ),
  guides(
    '<path d="M5 4h13v16H7a2 2 0 0 1-2-2z"/><path d="M5 18a2 2 0 0 1 2-2h11"/>',
  ),
  lines('<path d="M4 6h10M4 12h16M4 18h7"/>'),
  camera(
    '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  ),
  refresh(
    '<path d="M20 11a8 8 0 0 0-14.9-3M4 5v4h4M4 13a8 8 0 0 0 14.9 3M20 19v-4h-4"/>',
  ),
  alert('<circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/>'),

  /// Opens a list (picker fields).
  chevronDown('<path d="m6 9 6 6 6-6"/>'),
  pause('<path d="M9 5v14M15 5v14"/>'),
  play('<path d="M7 5v14l12-7z"/>'),

  /// Search (board 21's "I need a …" tile).
  search('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),

  /// A tick (board 21's selected row, stroke 2.4).
  check('<path d="m5 12 5 5L20 7"/>');

  const ShootIcons(this.body, {this.directional = false});

  /// The shapes inside the `<svg>`.
  final String body;

  /// Implies a direction, so it mirrors in right-to-left (FR-011).
  final bool directional;

  String svg(double strokeWidth) =>
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" '
      'stroke="#000" stroke-width="$strokeWidth" stroke-linecap="round" '
      'stroke-linejoin="round">$body</svg>';
}

/// One board icon at [size], drawn in [color], with the board's [strokeWidth] (2 on 20 px icons,
/// 2.2 on 16 px row icons). Decorative unless [semanticLabel] is given.
class ShootIcon extends StatelessWidget {
  const ShootIcon(
    this.icon, {
    super.key,
    this.size = 16,
    required this.color,
    this.strokeWidth = 2.2,
    this.semanticLabel,
  });

  final ShootIcons icon;
  final double size;
  final Color color;
  final double strokeWidth;
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    Widget picture = SvgPicture.string(
      icon.svg(strokeWidth),
      width: size,
      height: size,
      colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
      excludeFromSemantics: semanticLabel == null,
      semanticsLabel: semanticLabel,
    );
    if (icon.directional && Directionality.of(context) == TextDirection.rtl) {
      picture = Transform.flip(flipX: true, child: picture);
    }
    return SizedBox.square(dimension: size, child: picture);
  }
}
