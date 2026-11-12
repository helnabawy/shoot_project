import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/group_label.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/features/creators/domain/brief/brief_rules.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/brief_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/widgets/creator_parts.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

/// The brief as one panel (board `.bar`): the sentence with a token per slot, the choices for
/// the slot being answered, and [action] (the screen's one primary action) at the foot. The words
/// are the CMS brief builder's; nothing here names a profession or a place (MC FR-062).
///
/// Tapping a token reopens its choices (a date token opens [onPickDate]).
class BriefBar extends StatelessWidget {
  const BriefBar({
    super.key,
    required this.state,
    required this.onChoose,
    required this.onReopen,
    required this.onPickDate,
    required this.formatDate,
    required this.action,
    this.groupLabelFor,
  });

  final BriefState state;
  final void Function(BuilderSlot slot, String value) onChoose;
  final void Function(BuilderSlot slot) onReopen;
  final void Function(BuilderSlot slot) onPickDate;
  final String Function(String iso) formatDate;
  final Widget action;

  /// The label over a slot's choices; defaults to the slot's CMS group label.
  final String Function(BuilderSlot slot)? groupLabelFor;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final slot = state.activeSlot;
    final choices = slot == null
        ? const <BuilderOption>[]
        : state.rules.options(slot, state.values);
    final chosen = slot == null
        ? const <String>[]
        : BriefRules.split(state.values[slot.token] ?? '');
    return Semantics(
      container: true,
      label: context.l10n.mcBriefGroup,
      child: FloatingPanel(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _Sentence(
              state: state,
              formatDate: formatDate,
              onTapToken: (token) => token.slot.kind == SlotKind.date
                  ? onPickDate(token.slot)
                  : onReopen(token.slot),
            ),
            if (slot != null && choices.isNotEmpty) ...[
              Container(height: 1, color: c.hair),
              Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(8, 8, 8, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    GroupLabel(
                      groupLabelFor?.call(slot) ?? slot.groupLabel,
                      padding: const EdgeInsetsDirectional.fromSTEB(8, 6, 8, 4),
                    ),
                    for (final option in choices)
                      _OptionRow(
                        option: option,
                        selected: chosen.contains(option.value),
                        onTap: () => onChoose(slot, option.value),
                      ),
                  ],
                ),
              ),
            ],
            Padding(padding: const EdgeInsets.all(8), child: action),
          ],
        ),
      ),
    );
  }
}

class _Sentence extends StatelessWidget {
  const _Sentence({
    required this.state,
    required this.formatDate,
    required this.onTapToken,
  });

  final BriefState state;
  final String Function(String iso) formatDate;
  final void Function(SentenceToken token) onTapToken;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final parts = state.rules.sentence(state.values, formatDate: formatDate);
    final style = ShootType.heading.copyWith(
      fontSize: 20,
      fontWeight: FontWeight.w500,
      height: 1.4,
      color: c.ink,
    );
    return ConstrainedBox(
      constraints: const BoxConstraints(minHeight: 52),
      child: Padding(
        padding: const EdgeInsetsDirectional.symmetric(
          horizontal: 16,
          vertical: 9,
        ),
        child: Row(
          spacing: 12,
          children: [
            Tile30(
              child: ShootIcon(ShootIcons.search, size: 15, color: c.tileInk),
            ),
            Expanded(
              child: Text.rich(
                TextSpan(
                  style: style,
                  children: [
                    for (final part in parts)
                      switch (part) {
                        SentenceText(:final text) => TextSpan(text: text),
                        SentenceToken() => WidgetSpan(
                          alignment: PlaceholderAlignment.baseline,
                          baseline: TextBaseline.alphabetic,
                          child: _Token(
                            token: part,
                            style: style,
                            onTap: () => onTapToken(part),
                          ),
                        ),
                      },
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Token extends StatelessWidget {
  const _Token({required this.token, required this.style, required this.onTap});

  final SentenceToken token;
  final TextStyle style;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      label: token.label,
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: token.isSet
            ? DecoratedBox(
                decoration: BoxDecoration(
                  color: c.selected,
                  borderRadius: BorderRadius.circular(ShootRadius.message),
                ),
                child: Padding(
                  padding: const EdgeInsetsDirectional.symmetric(horizontal: 4),
                  child: Text(
                    token.label,
                    style: style.copyWith(color: c.accentInk),
                  ),
                ),
              )
            : DecoratedBox(
                decoration: BoxDecoration(
                  border: Border(
                    bottom: BorderSide(color: c.controlBorder, width: 2),
                  ),
                ),
                child: Text(token.label, style: style.copyWith(color: c.mute)),
              ),
      ),
    );
  }
}

/// `.opt`: a choice row, 44 px, with its glyph tile.
class _OptionRow extends StatelessWidget {
  const _OptionRow({
    required this.option,
    required this.selected,
    required this.onTap,
  });

  final BuilderOption option;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      selected: selected,
      label: option.label,
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: selected ? c.selected : null,
            borderRadius: BorderRadius.circular(ShootRadius.row),
          ),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 44),
            child: Padding(
              padding: const EdgeInsetsDirectional.symmetric(
                vertical: 7,
                horizontal: 8,
              ),
              child: Row(
                spacing: 12,
                children: [
                  Tile30(
                    child: Text(
                      option.glyph ?? '',
                      style: ShootType.badge.copyWith(
                        color: c.tileInk,
                        fontSize: 12,
                      ),
                    ),
                  ),
                  Expanded(
                    child: Text(
                      option.label,
                      style: ShootType.row.copyWith(
                        color: selected ? c.accentInk : c.ink,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
