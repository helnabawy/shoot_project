import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';

/// `.ib`: a 44 × 44 transparent button with a 20 px ink icon, radius 9. [label] is required: it
/// is what a screen reader says.
class ShootIconButton extends StatelessWidget {
  const ShootIconButton({
    super.key,
    required this.icon,
    required this.label,
    required this.onPressed,
  });

  final ShootIcons icon;
  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return _IbFrame(
      label: label,
      onPressed: onPressed,
      child: SizedBox.square(
        dimension: ShootSize.iconButton,
        child: Center(
          child: ShootIcon(
            icon,
            size: 20,
            strokeWidth: 2,
            color: context.colors.ink,
          ),
        ),
      ),
    );
  }
}

/// `.ib` with text instead of an icon (`width:auto; padding:0 10px; 15px/500`), such as the
/// header's language action.
class ShootTextAction extends StatelessWidget {
  const ShootTextAction({
    super.key,
    required this.text,
    required this.label,
    required this.onPressed,
    this.square = false,
  });

  /// What it shows (the other language's name, in that language).
  final String text;

  /// What a screen reader says.
  final String label;
  final VoidCallback? onPressed;

  /// The plain `.ib` box of boards 20 and 23: exactly 44 × 44, the text centred in it (and
  /// overflowing it evenly when longer, as CSS does), so a centred wordmark stays centred.
  final bool square;

  @override
  Widget build(BuildContext context) {
    final style = TextStyle(
      fontSize: 15,
      fontWeight: FontWeight.w500,
      color: context.colors.ink,
      fontFamilyFallback: ShootType.body.fontFamilyFallback,
      leadingDistribution: TextLeadingDistribution.even,
    );
    if (square) {
      return _IbFrame(
        label: label,
        onPressed: onPressed,
        child: SizedBox.square(
          dimension: ShootSize.iconButton,
          child: OverflowBox(
            maxWidth: double.infinity,
            child: Center(child: Text(text, style: style, softWrap: false)),
          ),
        ),
      );
    }
    return _IbFrame(
      label: label,
      onPressed: onPressed,
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          minWidth: ShootSize.iconButton,
          minHeight: ShootSize.iconButton,
        ),
        child: Padding(
          padding: const EdgeInsetsDirectional.symmetric(horizontal: 10),
          child: Center(
            widthFactor: 1,
            heightFactor: 1,
            child: Text(text, style: style),
          ),
        ),
      ),
    );
  }
}

class _IbFrame extends StatelessWidget {
  const _IbFrame({
    required this.label,
    required this.onPressed,
    required this.child,
  });

  final String label;
  final VoidCallback? onPressed;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      enabled: onPressed != null,
      label: label,
      // The tap lives on this node: excluding the children drops the InkWell's action.
      onTap: onPressed,
      excludeSemantics: true,
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(ShootRadius.row),
          child: child,
        ),
      ),
    );
  }
}
