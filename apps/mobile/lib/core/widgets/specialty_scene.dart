import 'package:flutter/material.dart' show Theme;
import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:shoot_mobile/core/theme/shoot_scene.dart';
import 'package:shoot_mobile/core/widgets/scene_tile.dart';

/// The drawings on the landing's specialty tiles ("What do you need shot?"), the same shapes the
/// website draws in `SpecialtyScene.tsx`. Which one a specialty shows is a CMS choice
/// (`category.scene`), never inferred from its name, so a new profession gets a drawing, or the
/// plain [SceneTile] with its glyph, without code (persona-extensibility).
///
/// Shapes only, in the warm scene palette, so they read as light and place, never as proof of
/// work; a specialty image from the CMS replaces them. Each is drawn on a 132 × 236 frame and
/// cropped from the centre. Still, as the website keeps them on phones; dimmed a little at night.
/// Decorative.
class SpecialtyScene extends StatelessWidget {
  const SpecialtyScene({
    super.key,
    required this.scene,
    this.glyph,
    this.variant = 0,
  });

  /// The CMS scene key (`wedding`, `events`, `portrait`, `product`, `property`, `office`, `food`).
  final String? scene;

  /// Shown on the plain scene when [scene] has no drawing.
  final String? glyph;

  /// The plain scene's variant when [scene] has no drawing.
  final int variant;

  /// Whether [scene] names a drawing.
  static bool hasDrawing(String? scene) => _drawings.containsKey(scene);

  @override
  Widget build(BuildContext context) {
    final svg = _drawings[scene];
    if (svg == null) {
      final g = glyph;
      return SceneTile(
        variant: variant,
        radius: 0,
        child: g == null || g.isEmpty
            ? null
            : Padding(
                padding: const EdgeInsets.only(bottom: 48),
                child: Text(
                  g,
                  style: TextStyle(
                    fontSize: 44,
                    fontWeight: FontWeight.w700,
                    height: 1,
                    letterSpacing: -0.02 * 44,
                    color: context.scene.sceneInk,
                  ),
                ),
              ),
      );
    }
    final dark = Theme.of(context).brightness == Brightness.dark;
    return ExcludeSemantics(
      child: Stack(
        fit: StackFit.expand,
        children: [
          SvgPicture.string(
            '$_open$svg</svg>',
            fit: BoxFit.cover,
            key: ValueKey('specialty-scene:$scene'),
          ),
          // The website's `brightness(0.82)` at night.
          if (dark) const ColoredBox(color: Color(0x2E000000)),
        ],
      ),
    );
  }
}

const _open = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 132 236">';

String _sky(String from, String to, {bool diagonal = false}) =>
    '<defs><linearGradient id="sky" x1="0" y1="0" x2="${diagonal ? 1 : 0}" y2="1">'
    '<stop offset="0" stop-color="$from"/><stop offset="1" stop-color="$to"/></linearGradient></defs>'
    '<rect width="132" height="236" fill="url(#sky)"/>';

String get _windows => [
  for (final y in [78, 104, 130, 156])
    for (final x in [36, 59, 82])
      '<rect x="$x" y="$y" width="14" height="16"/>',
].join();

final Map<String, String> _drawings = {
  'wedding':
      '${_sky('#f6e7d6', '#dfb892')}'
      '<circle cx="66" cy="108" r="26" fill="#fffaf2"/>'
      '<rect y="178" width="132" height="58" fill="#b58461"/>'
      '<path d="M36 180v-72a30 30 0 0 1 60 0v72" fill="none" stroke="#7a5038" stroke-width="5" stroke-linecap="round"/>'
      '<g fill="#fff6ea"><circle cx="36" cy="120" r="4"/><circle cx="40" cy="96" r="5"/>'
      '<circle cx="54" cy="81" r="4"/><circle cx="72" cy="78" r="5"/><circle cx="88" cy="90" r="4"/>'
      '<circle cx="96" cy="112" r="5"/><circle cx="34" cy="142" r="3"/><circle cx="98" cy="136" r="3"/></g>'
      '<g fill="#5a3a29"><circle cx="58" cy="146" r="5"/><path d="M52 180v-22a6 6 0 0 1 12 0v22z"/>'
      '<circle cx="75" cy="148" r="5"/><path d="M67 180l3-24a5 5 0 0 1 10 0l3 24z"/></g>',
  'events':
      '${_sky('#2a1f1a', '#7b5a45')}'
      '<g fill="#ffe9cf" opacity="0.3"><path d="M30 0 4 176h52z"/><path d="M66 0 40 176h52z"/>'
      '<path d="M102 0 76 176h52z"/></g>'
      '<rect y="172" width="132" height="64" fill="#1f1612"/>'
      '<g fill="#120c09"><circle cx="14" cy="176" r="9"/><circle cx="36" cy="172" r="10"/>'
      '<circle cx="60" cy="177" r="9"/><circle cx="82" cy="172" r="10"/><circle cx="104" cy="176" r="9"/>'
      '<circle cx="124" cy="172" r="9"/></g>',
  'portrait':
      '${_sky('#ecd9c5', '#c49a76', diagonal: true)}'
      '<circle cx="76" cy="98" r="48" fill="#fff6ea" opacity="0.9"/>'
      '<g fill="#6d4c38"><circle cx="66" cy="104" r="24"/>'
      '<path d="M14 236c0-56 22-86 52-86s52 30 52 86z"/></g>',
  'product':
      '${_sky('#f3e6d7', '#d6b494')}'
      '<ellipse cx="66" cy="204" rx="46" ry="8" fill="#a47452" opacity="0.4"/>'
      '<rect x="34" y="150" width="64" height="52" fill="#b58461"/>'
      '<ellipse cx="66" cy="150" rx="32" ry="8" fill="#caa07c"/>'
      '<rect x="60" y="68" width="12" height="20" rx="2" fill="#5a3a29"/>'
      '<rect x="58" y="62" width="16" height="8" rx="2" fill="#3a2b25"/>'
      '<rect x="52" y="84" width="28" height="64" rx="7" fill="#5a3a29"/>'
      '<rect x="58" y="90" width="5" height="52" rx="2.5" fill="#fff6ea" opacity="0.5"/>',
  'property':
      '${_sky('#d9b999', '#8e6d52')}'
      '<circle cx="104" cy="52" r="15" fill="#fff6ea" opacity="0.85"/>'
      '<rect x="26" y="66" width="80" height="170" fill="#4a3428"/>'
      '<rect x="16" y="120" width="22" height="116" fill="#3a2b25"/>'
      '<g fill="#ffe9cf">$_windows</g>',
  'office':
      '${_sky('#efe0cf', '#c8a07e')}'
      '<circle cx="66" cy="96" r="34" fill="#fff6ea" opacity="0.8"/>'
      '<path d="M66 0v72" stroke="#5a3a29" stroke-width="2"/>'
      '<path d="M50 86h32l-6-14H56z" fill="#5a3a29"/>'
      '<rect y="206" width="132" height="30" fill="#b58461" opacity="0.6"/>'
      '<g fill="#5a3a29"><circle cx="34" cy="128" r="9"/><path d="M22 166v-20a12 12 0 0 1 24 0v20z"/>'
      '<circle cx="98" cy="128" r="9"/><path d="M86 166v-20a12 12 0 0 1 24 0v20z"/></g>'
      '<path d="M56 164l4-16h16l-4 16z" fill="#3a2b25"/>'
      '<rect x="14" y="164" width="104" height="6" rx="2" fill="#7a5038"/>'
      '<rect x="24" y="170" width="4" height="36" fill="#7a5038"/>'
      '<rect x="104" y="170" width="4" height="36" fill="#7a5038"/>',
  'food':
      '${_sky('#f3e4d2', '#e0c0a0')}'
      '<rect y="168" width="132" height="68" fill="#c39a75"/>'
      '<ellipse cx="66" cy="170" rx="50" ry="9" fill="#fff6ea"/>'
      '<path d="M32 132h68a34 34 0 0 1-68 0z" fill="#7a5038"/>'
      '<ellipse cx="66" cy="132" rx="34" ry="7" fill="#a47452"/>'
      '<g fill="none" stroke="#fffaf2" stroke-width="3" stroke-linecap="round">'
      '<path d="M52 112c-6-8 6-12 0-22"/><path d="M66 108c-6-8 6-14 0-26"/>'
      '<path d="M80 112c-6-8 6-12 0-22"/></g>',
};
