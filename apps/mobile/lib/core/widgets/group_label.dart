import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// `.gl`: a group label. 11/600, 0.06em, uppercase, `mute`; a header for screen readers. Arabic
/// has no letter case, so the text is uppercased only for scripts that have one.
class GroupLabel extends StatelessWidget {
  const GroupLabel(this.text, {super.key, this.padding});

  final String text;
  final EdgeInsetsGeometry? padding;

  @override
  Widget build(BuildContext context) {
    final upper = Localizations.localeOf(context).languageCode == 'ar'
        ? text
        : text.toUpperCase();
    return Semantics(
      header: true,
      label: text,
      excludeSemantics: true,
      child: Padding(
        padding: padding ?? EdgeInsets.zero,
        child: Text(
          upper,
          style: ShootType.groupLabel.copyWith(color: context.colors.mute),
        ),
      ),
    );
  }
}
