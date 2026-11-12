import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/widgets/linked_text.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';

/// `.ck` (board 23): a 22 px checkbox in `accent` beside a 14/1.5 `bodyInk` sentence (gap 12)
/// whose inline links are their own semantics nodes. The whole line is the target (its node at
/// least 44 high) and toggles the box; a link opens its page instead. [error] marks the box when the
/// form refused an unticked one (research R16).
class CheckLine extends StatelessWidget {
  const CheckLine({
    super.key,
    required this.template,
    required this.parts,
    required this.label,
    required this.checked,
    required this.onChanged,
    this.error = false,
  });

  /// The sentence with `{name}` tokens for [parts] (see [LinkedText]).
  final String template;
  final Map<String, InlinePart> parts;

  /// The sentence as plain text: what a screen reader says for the checkbox.
  final String label;
  final bool checked;
  final ValueChanged<bool> onChanged;
  final bool error;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final style = TextStyle(
      fontSize: 14,
      height: 1.5,
      color: c.bodyInk,
      leadingDistribution: TextLeadingDistribution.even,
      fontFamilyFallback: const ['Noto Sans Arabic'],
    );
    return GestureDetector(
      onTap: () => onChanged(!checked),
      behavior: HitTestBehavior.opaque,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          // The checkbox's node spans the whole line, its target, and at least 44 high (a
          // two-line sentence is 42, board 23, so it reaches 1 px past either edge). It comes
          // first, so a screen reader meets the box, then the sentence with its links.
          Positioned.fill(
            child: LayoutBuilder(
              builder: (context, constraints) {
                final grow = constraints.maxHeight >= 44
                    ? 0.0
                    : (44 - constraints.maxHeight) / 2;
                return OverflowBox(
                  maxHeight: constraints.maxHeight + 2 * grow,
                  minHeight: constraints.maxHeight + 2 * grow,
                  child: Semantics(
                    checked: checked,
                    label: label,
                    onTap: () => onChanged(!checked),
                    child: const SizedBox.expand(),
                  ),
                );
              },
            ),
          ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 12,
            children: [
              ExcludeSemantics(
                child: _Box(checked: checked, error: error),
              ),
              Expanded(
                child: LinkedText(template, parts: parts, style: style),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Chromium's 22 px checkbox with `accent-color`: a 1 px border and radius 4 when empty, filled
/// `accent` with a white tick when ticked.
class _Box extends StatelessWidget {
  const _Box({required this.checked, required this.error});

  final bool checked;
  final bool error;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      width: 22,
      height: 22,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: checked ? c.accent : c.panelSolid,
        borderRadius: BorderRadius.circular(4),
        border: checked
            ? null
            : Border.all(
                color: error ? c.onDanger : c.controlBorder,
                width: error ? 2 : 1,
              ),
      ),
      child: checked
          ? ShootIcon(
              ShootIcons.check,
              size: 16,
              strokeWidth: 3,
              color: c.onAccent,
            )
          : null,
    );
  }
}
