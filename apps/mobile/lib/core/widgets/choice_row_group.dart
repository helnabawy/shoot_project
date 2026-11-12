import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';

/// One choice: its value, its words and its tile icon.
typedef ChoiceRow<T> = ({T value, String label, ShootIcons icon});

/// Board 21's role question: a `.panel` (padding 8) of `.row` radios. Rows are at least 44 high,
/// padding 7 8, gap 12, radius 9, 16/1.375, with a 30 px `tile` icon. The chosen row is
/// `selected` with `accentInk` text, an `accent` tile with an `onAccent` icon and a tick at the
/// end. A radio group named [label] for screen readers (research R16).
class ChoiceRowGroup<T> extends StatelessWidget {
  const ChoiceRowGroup({
    super.key,
    required this.label,
    required this.rows,
    required this.selected,
    required this.onChanged,
  });

  final String label;
  final List<ChoiceRow<T>> rows;
  final T selected;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      container: true,
      explicitChildNodes: true,
      label: label,
      child: ShootPanel(
        // 8 inside the 1 px border, which CSS lays out and ShootPanel only paints.
        padding: const EdgeInsets.all(ShootSpace.s2 + 1),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (final row in rows)
              _Row(
                row: row,
                selected: row.value == selected,
                onTap: () => onChanged(row.value),
              ),
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({required this.row, required this.selected, required this.onTap});

  final ChoiceRow<Object?> row;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final ink = selected ? c.accentInk : c.ink;
    return Semantics(
      inMutuallyExclusiveGroup: true,
      checked: selected,
      label: row.label,
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          constraints: const BoxConstraints(minHeight: ShootSize.rowHeight),
          padding: const EdgeInsetsDirectional.symmetric(
            horizontal: ShootSpace.s2,
            vertical: ShootSize.rowBlock,
          ),
          decoration: BoxDecoration(
            color: selected ? c.selected : Colors.transparent,
            borderRadius: BorderRadius.circular(ShootRadius.row),
          ),
          child: Row(
            spacing: ShootSpace.s3,
            children: [
              Container(
                width: ShootSize.tile,
                height: ShootSize.tile,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: selected ? c.accent : c.tile,
                  borderRadius: BorderRadius.circular(ShootRadius.tile),
                ),
                child: ShootIcon(
                  row.icon,
                  color: selected ? c.onAccent : c.tileInk,
                ),
              ),
              Expanded(
                child: Text(
                  row.label,
                  style: TextStyle(
                    fontSize: 16,
                    height: 1.375,
                    color: ink,
                    leadingDistribution: TextLeadingDistribution.even,
                    fontFamilyFallback: const ['Noto Sans Arabic'],
                  ),
                ),
              ),
              if (selected)
                ShootIcon(ShootIcons.check, strokeWidth: 2.4, color: ink),
            ],
          ),
        ),
      ),
    );
  }
}
