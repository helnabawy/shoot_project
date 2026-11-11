import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// The tone of a tab's state line (`.tstate`): done in `accentInk`, needs attention on peach,
/// otherwise `mute`.
enum StepTone { neutral, done, attention }

/// One tab: its label and an optional short state line.
typedef StepTab = ({String label, String? state, StepTone tone});

/// `.tabs` / `.tab`: a scrolling row of tabs, gap 4, 44 high, 15/500 in `mute`; the selected tab is
/// `ink` with a 2 px `ink` underline, over a `hair` rule. Tabs for screen readers, the selected one
/// announced.
class StepStrip extends StatelessWidget {
  const StepStrip({
    super.key,
    required this.tabs,
    required this.selected,
    required this.onSelect,
  });

  final List<StepTab> tabs;
  final int selected;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: c.hair)),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          spacing: ShootSpace.s1,
          children: [
            for (final (i, tab) in tabs.indexed)
              Semantics(
                selected: i == selected,
                button: true,
                label: [tab.label, ?tab.state].join(', '),
                onTap: () => onSelect(i),
                excludeSemantics: true,
                child: GestureDetector(
                  onTap: () => onSelect(i),
                  child: Container(
                    constraints: const BoxConstraints(
                      minHeight: 44,
                      minWidth: 44,
                    ),
                    padding: const EdgeInsetsDirectional.symmetric(
                      horizontal: 12,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      border: Border(
                        bottom: BorderSide(
                          color: i == selected ? c.ink : Colors.transparent,
                          width: 2,
                        ),
                      ),
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tab.label,
                          style: ShootType.chip.copyWith(
                            fontWeight: FontWeight.w500,
                            color: i == selected ? c.ink : c.mute,
                          ),
                        ),
                        if (tab.state case final s?) _StateLine(s, tab.tone),
                      ],
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

class _StateLine extends StatelessWidget {
  const _StateLine(this.text, this.tone);

  final String text;
  final StepTone tone;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final style = ShootType.meta.copyWith(height: 1.25);
    return Padding(
      padding: const EdgeInsetsDirectional.only(top: 2),
      child: switch (tone) {
        StepTone.attention => DecoratedBox(
          decoration: BoxDecoration(
            color: c.attention,
            borderRadius: BorderRadius.circular(ShootRadius.keyHint),
          ),
          child: Padding(
            padding: const EdgeInsetsDirectional.symmetric(horizontal: 4),
            child: Text(text, style: style.copyWith(color: c.onAttention)),
          ),
        ),
        StepTone.done => Text(text, style: style.copyWith(color: c.accentInk)),
        StepTone.neutral => Text(text, style: style.copyWith(color: c.mute)),
      },
    );
  }
}
