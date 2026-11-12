import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';

/// Line icons of boards 15 to 19 that the shared `ShootIcons` set does not have, copied verbatim
/// from the boards' inline SVG (24 px view box, round caps). Kept here until another feature needs
/// them; then they move to `ShootIcons`.
enum Glyphs {
  menu('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  image(
    '<rect x="3" y="5" width="18" height="14" rx="2"/>'
    '<path d="m3 16 5-5 4 4 3-3 6 6"/>',
  ),
  share('<path d="M12 3v12m0-12 4 4m-4-4-4 4M4 14v5h16v-5"/>'),
  tag(
    '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/>'
    '<circle cx="7.5" cy="7.5" r="1.5"/>',
  ),
  pin(
    '<path d="M12 21s-6-5.3-6-11a6 6 0 0 1 12 0c0 5.7-6 11-6 11z"/>'
    '<circle cx="12" cy="10" r="2"/>',
  ),
  pinLarge(
    '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/>'
    '<circle cx="12" cy="10" r="2.5"/>',
  ),
  instagram(
    '<rect x="3" y="3" width="18" height="18" rx="5"/>'
    '<circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".5"/>',
  ),
  external('<path d="M7 17 17 7M8 7h9v9"/>'),
  globe(
    '<circle cx="12" cy="12" r="9"/>'
    '<path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  ),
  clock('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  close('<path d="M6 6l12 12M18 6 6 18"/>');

  const Glyphs(this.body);

  final String body;
}

/// One [Glyphs] icon drawn in [color]; decorative.
class Glyph extends StatelessWidget {
  const Glyph(
    this.glyph, {
    super.key,
    required this.color,
    this.size = 16,
    this.strokeWidth = 2.2,
  });

  final Glyphs glyph;
  final Color color;
  final double size;
  final double strokeWidth;

  @override
  Widget build(BuildContext context) {
    return SizedBox.square(
      dimension: size,
      child: SvgPicture.string(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" '
        'stroke="#000" stroke-width="$strokeWidth" stroke-linecap="round" '
        'stroke-linejoin="round">${glyph.body}</svg>',
        width: size,
        height: size,
        colorFilter: ColorFilter.mode(color, BlendMode.srcIn),
        excludeFromSemantics: true,
      ),
    );
  }
}
