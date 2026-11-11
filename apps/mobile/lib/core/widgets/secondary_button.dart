import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';

/// `.btn2`: a secondary action. 44 high, radius 9, 1 px `controlBorder`, padding 0 14, gap 8, the
/// `button` type (16/500) in ink.
class SecondaryButton extends StatelessWidget {
  const SecondaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
  });

  final String label;
  final VoidCallback? onPressed;
  final ShootIcons? icon;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final enabled = onPressed != null;
    final ink = enabled ? c.ink : c.mute;
    return Semantics(
      button: true,
      enabled: enabled,
      label: label,
      onTap: onPressed,
      excludeSemantics: true,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(ShootRadius.row),
          highlightColor: c.selectedHover,
          child: Container(
            height: ShootSize.iconButton,
            padding: const EdgeInsetsDirectional.symmetric(horizontal: 14),
            decoration: BoxDecoration(
              border: Border.all(color: c.controlBorder),
              borderRadius: BorderRadius.circular(ShootRadius.row),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon case final i?) ...[
                  ShootIcon(i, size: 16, color: ink),
                  const SizedBox(width: ShootSpace.s2),
                ],
                Flexible(
                  child: Text(
                    label,
                    style: ShootType.button.copyWith(color: ink),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
