import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// `.seg`: equal segments, 40 high, 15 px, in a 1 px `controlBorder` box, radius 9. The chosen
/// segment is `ink` with `ground` text at 500. A radio group for screen readers.
class SegmentedControl<T> extends StatelessWidget {
  const SegmentedControl({
    super.key,
    required this.segments,
    required this.selected,
    required this.onChanged,
  });

  /// Value and label, in order.
  final List<(T, String)> segments;
  final T selected;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        border: Border.all(color: c.controlBorder),
        borderRadius: BorderRadius.circular(ShootRadius.row),
      ),
      child: IntrinsicHeight(
        child: Row(
          children: [
            for (final (value, label) in segments)
              Expanded(
                child: Semantics(
                  inMutuallyExclusiveGroup: true,
                  checked: value == selected,
                  label: label,
                  onTap: () => onChanged(value),
                  excludeSemantics: true,
                  child: GestureDetector(
                    onTap: () => onChanged(value),
                    child: Container(
                      constraints: const BoxConstraints(minHeight: 40),
                      alignment: Alignment.center,
                      padding: const EdgeInsetsDirectional.symmetric(
                        horizontal: 6,
                        vertical: 8,
                      ),
                      color: value == selected ? c.ink : Colors.transparent,
                      child: Text(
                        label,
                        textAlign: TextAlign.center,
                        style: ShootType.chip.copyWith(
                          color: value == selected ? c.ground : c.ink,
                          fontWeight: value == selected
                              ? FontWeight.w500
                              : FontWeight.w400,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
