import 'dart:math' as math;

import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:shoot_mobile/core/motion/ambient_pause.dart';
import 'package:shoot_mobile/core/motion/arrive.dart';
import 'package:shoot_mobile/core/theme/shoot_scene.dart';
import 'package:shoot_mobile/core/widgets/golden_hour_scene_svg.dart';

/// The boards' golden-hour scene (the landing hero), drawn from their inline SVG with every
/// colour that has a role taken from [ShootScene] in the current theme. Decorative.
///
/// With [animated] it moves like the website's lens scene: the iris opens and the viewfinder corners
/// settle once on arrival; then the key light breathes, the focus ring turns, bokeh rises and the
/// playhead runs. The loops sit under the page's [AmbientPause] and stop for reduced motion.
class GoldenHourScene extends StatelessWidget {
  const GoldenHourScene({
    super.key,
    this.fit = BoxFit.cover,
    this.animated = false,
  });

  final BoxFit fit;
  final bool animated;

  static const _w = 360.0;
  static const _h = 650.0;
  static const _lens = Offset(270, 312);
  static const _lensR = 38.0;

  static final _bokehRe = RegExp(
    r'<g fill="\{\{scene-light\}\}" fill-opacity="\.5".*?</g>',
  );
  static final _glowRe = RegExp(
    r'<circle cx="270" cy="312" r="124"[^>]*></circle>',
  );
  static final _ringRe = RegExp(
    r'<g fill="none" stroke="\{\{scene-dune-near\}\}" stroke-opacity="\.55"><circle cx="270".*?</g>',
  );
  static final _irisRe = RegExp(
    r'<g clip-path="url\(#hclip\)">(<g.*?</g>)</g>',
  );
  static final _frameRe = RegExp(
    r'<path fill="none" stroke="#5a3a29" stroke-opacity="\.55" stroke-width="1\.5" d="[^"]*"></path>',
  );
  static final _headRe = RegExp(r'<g fill="#3a2418">.*?</g>');

  @override
  Widget build(BuildContext context) {
    final roles = context.scene.roles;
    String paint(String s) => s.replaceAllMapped(
      RegExp(r'\{\{([a-z0-9-]+)\}\}'),
      (m) => _hex(roles[m.group(1)]!),
    );
    if (!animated) {
      return ExcludeSemantics(
        child: SvgPicture.string(
          paint(goldenHourSceneSvg),
          fit: fit,
          alignment:
              Alignment.bottomCenter, // preserveAspectRatio="xMidYMax slice"
        ),
      );
    }

    String? take(RegExp re, {int group = 0}) =>
        re.firstMatch(goldenHourSceneSvg)?.group(group);
    final glow = take(_glowRe);
    final ring = take(_ringRe);
    final iris = take(_irisRe, group: 1);
    final frame = take(_frameRe);
    final head = take(_headRe);
    final defsEnd = goldenHourSceneSvg.indexOf('</defs>') + '</defs>'.length;
    final defs = goldenHourSceneSvg.substring(
      goldenHourSceneSvg.indexOf('<defs>'),
      defsEnd,
    );
    var base = goldenHourSceneSvg;
    for (final re in [_bokehRe, _glowRe, _ringRe, _irisRe, _frameRe, _headRe]) {
      base = base.replaceFirst(re, '');
    }
    Widget layer(String? body) => body == null
        ? const SizedBox.shrink()
        : SvgPicture.string(
            paint(
              '<svg viewBox="0 0 360 650" xmlns="http://www.w3.org/2000/svg">$defs$body</svg>',
            ),
            width: _w,
            height: _h,
            fit: BoxFit.fill,
          );

    final stage = SizedBox(
      width: _w,
      height: _h,
      child: Stack(
        children: [
          Positioned.fill(
            child: layer(
              base
                  .replaceFirst(RegExp(r'^<svg[^>]*>'), '')
                  .replaceFirst('</svg>', ''),
            ),
          ),
          // Bokeh rises and fades, staggered.
          Positioned.fill(
            child: Ambient(
              period: const Duration(seconds: 14),
              builder: (_, t) =>
                  CustomPaint(painter: _BokehPainter(t, roles['scene-light']!)),
            ),
          ),
          // The key light breathes.
          Positioned.fill(
            child: Ambient(
              period: const Duration(seconds: 6),
              reverse: true,
              builder: (_, t) {
                final e = Curves.easeInOut.transform(t);
                return Opacity(
                  opacity: 0.82 + 0.18 * e,
                  child: Transform(
                    transform: Matrix4.diagonal3Values(
                      0.94 + 0.12 * e,
                      0.94 + 0.12 * e,
                      1,
                    ),
                    origin: _lens,
                    child: layer(glow),
                  ),
                );
              },
            ),
          ),
          // The focus ring turns a little each way.
          Positioned.fill(
            child: Ambient(
              period: const Duration(seconds: 9),
              reverse: true,
              builder: (_, t) => Transform(
                transform: Matrix4.rotationZ(
                  (-8 + 16 * Curves.easeInOut.transform(t)) * math.pi / 180,
                ),
                origin: _lens,
                child: layer(ring),
              ),
            ),
          ),
          // The iris opens once, inside the lens.
          Positioned.fill(
            child: ClipPath(
              clipper: const _LensClip(),
              child: Arrive(
                delay: const Duration(milliseconds: 300),
                duration: const Duration(milliseconds: 1200),
                builder: (_, t, child) => Transform(
                  origin: _lens,
                  transform: Matrix4.identity()
                    ..scaleByDouble(0.14 + 0.86 * t, 0.14 + 0.86 * t, 1, 1)
                    ..rotateZ(-64 * (1 - t) * math.pi / 180),
                  child: child,
                ),
                child: layer(iris),
              ),
            ),
          ),
          // The viewfinder corners settle in.
          Positioned.fill(
            child: Arrive(
              delay: const Duration(milliseconds: 500),
              duration: const Duration(milliseconds: 700),
              builder: (_, t, child) => Opacity(
                opacity: t.clamp(0.0, 1.0),
                child: Transform(
                  transform: Matrix4.diagonal3Values(
                    1.04 - 0.04 * t,
                    1.04 - 0.04 * t,
                    1,
                  ),
                  origin: const Offset(180, 220),
                  child: child,
                ),
              ),
              child: layer(frame),
            ),
          ),
          // The playhead runs across the timeline.
          Positioned.fill(
            child: Ambient(
              period: const Duration(seconds: 22),
              builder: (_, t) => Transform.translate(
                offset: Offset((-0.42 + 1.11 * t) * _w, 0),
                child: layer(head),
              ),
            ),
          ),
        ],
      ),
    );
    return ExcludeSemantics(
      child: ClipRect(
        child: FittedBox(
          fit: fit,
          alignment: Alignment.bottomCenter,
          child: stage,
        ),
      ),
    );
  }

  static String _hex(Color c) {
    String h(double v) => (v * 255).round().toRadixString(16).padLeft(2, '0');
    return '#${h(c.r)}${h(c.g)}${h(c.b)}';
  }
}

class _LensClip extends CustomClipper<Path> {
  const _LensClip();

  @override
  Path getClip(Size size) => Path()
    ..addOval(
      Rect.fromCircle(
        center: GoldenHourScene._lens,
        radius: GoldenHourScene._lensR,
      ),
    );

  @override
  bool shouldReclip(covariant CustomClipper<Path> old) => false;
}

class _BokehPainter extends CustomPainter {
  _BokehPainter(this.t, this.color);

  final double t;
  final Color color;

  static const _dots = <(double, double, double, double)>[
    (44, 196, 9, 0),
    (318, 210, 6, 2.5),
    (158, 268, 11, 5),
    (70, 352, 5, 7.5),
    (196, 350, 8, 10),
    (338, 128, 5, 12),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    for (final (x, y, r, delay) in _dots) {
      final p = (t + delay / 14) % 1;
      final a = p < 0.2 ? p / 0.2 : (p <= 0.7 ? 1.0 : (1 - p) / 0.3);
      final c = Offset(x, y - 70 * p);
      canvas
        ..drawCircle(c, r, Paint()..color = color.withValues(alpha: 0.5 * a))
        ..drawCircle(
          c,
          r,
          Paint()
            ..style = PaintingStyle.stroke
            ..strokeWidth = 1
            ..color = color.withValues(alpha: 0.8 * a),
        );
    }
  }

  @override
  bool shouldRepaint(_BokehPainter old) => old.t != t || old.color != color;
}
