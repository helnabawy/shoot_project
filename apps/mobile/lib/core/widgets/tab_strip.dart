import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// `.tabs` / `.tab` (board 26): text tabs over one bottom hairline, gap 4. Each tab is 44 high,
/// padding 0 12, 15/500 in `mute`; the chosen one is `ink` with a 2 px `ink` underline that sits
/// on the hairline. Announced as selected or not; scrolls sideways when the labels do not fit.
class TabStrip<T> extends StatelessWidget {
  const TabStrip({
    super.key,
    required this.tabs,
    required this.selected,
    required this.onChanged,
  });

  /// Value and label, in order.
  final List<(T, String)> tabs;
  final T selected;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: c.hair)),
      ),
      // Large text can make the tabs wider than the screen: they scroll sideways then.
      child: Align(
        alignment: AlignmentDirectional.centerStart,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          clipBehavior: Clip.none,
          child: Row(
            children: [
              for (final (i, (value, label)) in tabs.indexed) ...[
                if (i > 0) const SizedBox(width: 4),
                _Tab(
                  label: label,
                  selected: value == selected,
                  onTap: () => onChanged(value),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _Tab extends StatelessWidget {
  const _Tab({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      selected: selected,
      inMutuallyExclusiveGroup: true,
      child: InkWell(
        onTap: onTap,
        child: Transform.translate(
          // `margin-bottom: -1px`: the underline covers the strip's hairline.
          offset: const Offset(0, 1),
          child: Container(
            height: 44,
            padding: const EdgeInsetsDirectional.symmetric(horizontal: 12),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              border: Border(
                bottom: BorderSide(
                  color: selected ? c.ink : Colors.transparent,
                  width: 2,
                ),
              ),
            ),
            child: Text(
              label,
              style: ShootType.chip.copyWith(
                fontWeight: FontWeight.w500,
                color: selected ? c.ink : c.mute,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
