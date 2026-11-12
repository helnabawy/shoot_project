import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/widgets/css_line_box.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';

/// `#err` (board 22): a field's problem in a line of its own, an 18 px alert icon (2 px down,
/// gap 8) and 15/1.45 `onDanger` text. A live region (`role=alert`), so it is read out when it
/// appears.
class InlineError extends StatelessWidget {
  const InlineError(this.text, {super.key});

  final String text;

  @override
  Widget build(BuildContext context) {
    final ink = context.colors.onDanger;
    return Semantics(
      liveRegion: true,
      container: true,
      label: text,
      excludeSemantics: true,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        spacing: 8,
        children: [
          Padding(
            padding: const EdgeInsetsDirectional.only(top: 2),
            child: ShootIcon(ShootIcons.alert, size: 18, color: ink),
          ),
          Expanded(
            child: CssLineBox(
              fontSize: 15,
              height: 1.45,
              child: Text(
                text,
                style: TextStyle(
                  fontSize: 15,
                  height: 1.45,
                  color: ink,
                  leadingDistribution: TextLeadingDistribution.even,
                  fontFamilyFallback: const ['Noto Sans Arabic'],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
