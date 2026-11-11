import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// `.wm`: the brand name as type (22/700, line-height 1, −0.03em), a link home.
class Wordmark extends StatelessWidget {
  const Wordmark({super.key, required this.label, this.onTap});

  /// The brand name in the current language (from the ARB `appTitle`).
  final String label;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final text = Text(
      label,
      key: const ValueKey('fidelity:wordmark'),
      style: ShootType.wordmark.copyWith(color: context.colors.ink),
    );
    return Semantics(
      link: onTap != null,
      label: label,
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(onTap: onTap, child: text),
    );
  }
}
