import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// `.chip`: 40 high, radius 9, 1 px `controlBorder`, padding 0 14, 15 px. When [on]: `accent` fill
/// and border, `onAccent` text at 500. A toggle with its state. (Named `ShootChip`, not Material's
/// `ChoiceChip`.)
class ShootChip extends StatelessWidget {
  const ShootChip({
    super.key,
    required this.label,
    required this.on,
    required this.onTap,
  });

  final String label;
  final bool on;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      toggled: on,
      label: label,
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: MediaQuery.disableAnimationsOf(context)
              ? Duration.zero
              : ShootMotion.fast,
          constraints: const BoxConstraints(minHeight: 40, minWidth: 44),
          padding: const EdgeInsetsDirectional.symmetric(horizontal: 14),
          decoration: BoxDecoration(
            color: on ? c.accent : Colors.transparent,
            border: Border.all(color: on ? c.accent : c.controlBorder),
            borderRadius: BorderRadius.circular(ShootRadius.row),
          ),
          child: Center(
            widthFactor: 1,
            heightFactor: 1,
            child: Padding(
              padding: const EdgeInsetsDirectional.symmetric(vertical: 10),
              child: Text(
                label,
                style: ShootType.chip.copyWith(
                  color: on ? c.onAccent : c.ink,
                  fontWeight: on ? FontWeight.w500 : FontWeight.w400,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// `.chips`: chips that wrap, gap 8.
class ChipGroup extends StatelessWidget {
  const ChipGroup({super.key, required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) => Wrap(
    spacing: ShootSpace.s2,
    runSpacing: ShootSpace.s2,
    children: children,
  );
}
