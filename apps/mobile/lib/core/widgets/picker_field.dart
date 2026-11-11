import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/shoot_field.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';

/// `button.field`: looks like a field, shows the chosen [value] (or the [placeholder] in `mute`)
/// and a chevron, and opens a list in a sheet ([onTap]). Announced as a button with its value and
/// the [opensHint] ("opens a list").
class PickerField extends StatelessWidget {
  const PickerField({
    super.key,
    required this.label,
    required this.onTap,
    required this.opensHint,
    this.value,
    this.placeholder,
    this.error,
  });

  final String label;
  final VoidCallback? onTap;
  final String opensHint;
  final String? value;
  final String? placeholder;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final shown = value ?? placeholder ?? '';
    return FieldFrame(
      label: label,
      error: error,
      child: Semantics(
        button: true,
        label: label,
        value: value,
        hint: opensHint,
        onTap: onTap,
        excludeSemantics: true,
        child: Material(
          type: MaterialType.transparency,
          child: InkWell(
            onTap: onTap,
            borderRadius: BorderRadius.circular(ShootRadius.row),
            child: Container(
              height: ShootSize.rowHeight,
              padding: const EdgeInsetsDirectional.symmetric(
                horizontal: ShootSpace.s3,
              ),
              decoration: BoxDecoration(
                color: c.panelSolid,
                border: Border.all(
                  color: error != null ? c.onDanger : c.controlBorder,
                ),
                borderRadius: BorderRadius.circular(ShootRadius.row),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      shown,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: ShootType.row.copyWith(
                        color: value == null ? c.mute : c.ink,
                      ),
                    ),
                  ),
                  const SizedBox(width: ShootSpace.s2),
                  ShootIcon(ShootIcons.chevronDown, size: 16, color: c.mute),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
