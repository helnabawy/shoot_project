import 'package:flutter/widgets.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:shoot_mobile/core/theme/shoot_scene.dart';
import 'package:shoot_mobile/core/widgets/golden_hour_scene_svg.dart';

/// The boards' golden-hour scene (the landing hero), drawn from their inline SVG with every
/// colour that has a role taken from [ShootScene] in the current theme. Decorative. The key light's
/// ambient motion belongs to the landing (feature 010), under its Pause control.
class GoldenHourScene extends StatelessWidget {
  const GoldenHourScene({super.key, this.fit = BoxFit.cover});

  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final roles = context.scene.roles;
    final svg = goldenHourSceneSvg.replaceAllMapped(
      RegExp(r'\{\{([a-z0-9-]+)\}\}'),
      (m) => _hex(roles[m.group(1)]!),
    );
    return ExcludeSemantics(
      child: SvgPicture.string(
        svg,
        fit: fit,
        alignment:
            Alignment.bottomCenter, // preserveAspectRatio="xMidYMax slice"
      ),
    );
  }

  static String _hex(Color c) {
    String h(double v) => (v * 255).round().toRadixString(16).padLeft(2, '0');
    return '#${h(c.r)}${h(c.g)}${h(c.b)}';
  }
}
