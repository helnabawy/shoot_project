import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/motion/ambient_pause.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/inline_error.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/brief/domain/brief_draft.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

/// The Brief Bar (board 05, ui-design "The Brief Bar"): the brief as one sentence you build a word
/// at a time. Before the first touch it writes an example (an illustration, never answers); the
/// first touch ends it and shows only the first step's list. Every word comes from the CMS config.
class BriefBar extends StatelessWidget {
  const BriefBar({
    super.key,
    required this.state,
    required this.onTouch,
    required this.onChoose,
    required this.onContinue,
    required this.onSkip,
    required this.onDate,
    required this.onReopen,
    required this.onTakeBack,
    required this.onSubmit,
    required this.clock,
  });

  final BriefState state;
  final VoidCallback onTouch;
  final void Function(String token, String value) onChoose;
  final VoidCallback onContinue;
  final void Function(String token) onSkip;
  final void Function(String? iso) onDate;
  final void Function(String token) onReopen;
  final VoidCallback onTakeBack;
  final VoidCallback onSubmit;
  final DateTime Function() clock;

  @override
  Widget build(BuildContext context) {
    final config = state.config!;
    final engine = BriefEngine(config);
    final c = context.colors;
    final l10n = context.l10n;
    final active = state.active == null ? null : engine.slot(state.active!);
    return Container(
      key: const ValueKey('briefBar'),
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: c.panel,
        border: Border.all(color: c.hair),
        borderRadius: BorderRadius.circular(ShootRadius.panel),
        boxShadow: const [
          BoxShadow(
            color: Color(0x38281909),
            blurRadius: 40,
            offset: Offset(0, 24),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Sentence(
            state: state,
            engine: engine,
            onTouch: onTouch,
            onReopen: onReopen,
          ),
          if (!state.example && active != null) ...[
            Divider(height: 1, color: c.hair),
            _StepList(
              slot: active,
              state: state,
              engine: engine,
              onChoose: onChoose,
              onContinue: onContinue,
              onSkip: onSkip,
              onDate: onDate,
              clock: clock,
            ),
          ],
          if (state.message != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 8, 8, 0),
              child: InlineError(_messageText(context, state, engine)),
            ),
          if (!state.example && !state.draft.isEmpty)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: TextButton(
                key: const ValueKey('briefBar:takeBack'),
                onPressed: onTakeBack,
                style: TextButton.styleFrom(
                  minimumSize: const Size(44, 44),
                  foregroundColor: c.accentInk,
                ),
                child: Text(l10n.mlBriefTakeBack),
              ),
            ),
          const SizedBox(height: 8),
          TopHit(
            label: config.submitLabel,
            chevron: true,
            leading: ShootIcons.search,
            loading: state.submitting,
            onPressed: onSubmit,
          ),
          if (config.helperText.isNotEmpty)
            Padding(
              padding: const EdgeInsetsDirectional.fromSTEB(8, 8, 8, 4),
              child: Text(
                config.helperText,
                style: ShootType.meta.copyWith(color: c.mute),
              ),
            ),
        ],
      ),
    );
  }

  static String _messageText(
    BuildContext context,
    BriefState state,
    BriefEngine engine,
  ) {
    final l10n = context.l10n;
    return switch (state.message!) {
      BriefMessage.missingStep => l10n.mlBriefMissingStep(
        engine.slot(state.messageToken ?? '')?.placeholder ?? '',
      ),
      BriefMessage.pastDate => l10n.mlBriefPastDate,
      BriefMessage.optionGone => l10n.mlBriefOptionGone,
      BriefMessage.rateLimited => l10n.mlBriefRateLimited,
      BriefMessage.network => l10n.mlBriefNetwork,
      BriefMessage.generic => l10n.mlBriefGeneric,
    };
  }
}

/// The sentence with its `{token}` slots: answered ones print their words as a tappable word;
/// the open one is highlighted; before the first touch the example plays.
class _Sentence extends StatelessWidget {
  const _Sentence({
    required this.state,
    required this.engine,
    required this.onTouch,
    required this.onReopen,
  });

  final BriefState state;
  final BriefEngine engine;
  final VoidCallback onTouch;
  final void Function(String token) onReopen;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final style = ShootType.heading.copyWith(
      fontSize: 20,
      fontWeight: FontWeight.w500,
      height: 1.5,
      color: c.ink,
    );
    final sentence = engine.config.sentence;
    final parts = RegExp(r'\{(\w+)\}').allMatches(sentence).toList();

    Widget build(double t) {
      final spans = <InlineSpan>[];
      var cursor = 0;
      var index = 0;
      for (final m in parts) {
        if (m.start > cursor) {
          spans.add(TextSpan(text: sentence.substring(cursor, m.start)));
        }
        final slot = engine.slot(m.group(1)!);
        spans.add(
          slot == null
              ? TextSpan(text: m.group(0))
              : _slotSpan(context, slot, index, t),
        );
        cursor = m.end;
        index++;
      }
      if (cursor < sentence.length) {
        spans.add(TextSpan(text: sentence.substring(cursor)));
      }
      return Text.rich(TextSpan(children: spans), style: style);
    }

    final content = state.example
        ? Ambient(
            period: const Duration(seconds: 12),
            builder: (context, t) => build(t),
          )
        : build(0);
    return Semantics(
      button: state.example,
      textField: false,
      label: engine.config.sentence.replaceAllMapped(
        RegExp(r'\{(\w+)\}'),
        (m) => engine.slot(m.group(1)!)?.placeholder ?? '',
      ),
      excludeSemantics: state.example,
      child: GestureDetector(
        key: const ValueKey('briefBar:sentence'),
        behavior: HitTestBehavior.opaque,
        onTap: state.example ? onTouch : null,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 52),
          child: Padding(
            padding: const EdgeInsetsDirectional.fromSTEB(8, 10, 8, 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsetsDirectional.only(top: 5, end: 10),
                  child: ShootIcon(ShootIcons.search, size: 20, color: c.mute),
                ),
                Expanded(child: content),
              ],
            ),
          ),
        ),
      ),
    );
  }

  /// One slot's words. In the example, slot [index] fills with the slot's default option in turn
  /// (an illustration from the CMS's own defaults, never an answer); otherwise the person's
  /// answer, or the CMS placeholder.
  InlineSpan _slotSpan(
    BuildContext context,
    BuilderSlot slot,
    int index,
    double t,
  ) {
    final c = context.colors;
    final answered = engine.isAnswered(slot, state.draft);
    final isActive = state.active == slot.token && !state.example;
    String words;
    var filled = answered;
    if (state.example) {
      final shown = t >= 0.07 + index * 0.09 && t < 0.9;
      final example = slot.defaultValue.isEmpty
          ? null
          : engine.sentenceWord(slot, slot.defaultValue);
      words = shown && example != null ? example : slot.placeholder;
      filled = shown && example != null;
    } else if (slot.kind == SlotKind.date) {
      words = state.draft.date ?? slot.placeholder;
    } else {
      words = answered
          ? state.draft
                .valuesOf(slot.token)
                .map((v) => engine.sentenceWord(slot, v))
                .join(', ')
          : slot.placeholder;
    }
    final color = filled ? c.accentInk : c.mute;
    final decoration = BoxDecoration(
      color: filled || isActive ? c.selected : null,
      borderRadius: BorderRadius.circular(ShootRadius.keyHint),
      border: filled
          ? null
          : Border(
              bottom: BorderSide(color: c.mute.withValues(alpha: .6), width: 2),
            ),
    );
    return WidgetSpan(
      alignment: PlaceholderAlignment.baseline,
      baseline: TextBaseline.alphabetic,
      child: GestureDetector(
        key: ValueKey('briefBar:slot:${slot.token}'),
        behavior: HitTestBehavior.opaque,
        onTap: state.example ? onTouch : () => onReopen(slot.token),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 6),
          decoration: decoration,
          child: Text(
            words,
            style: ShootType.heading.copyWith(
              fontSize: 20,
              fontWeight: FontWeight.w500,
              height: 1.5,
              color: color,
            ),
          ),
        ),
      ),
    );
  }
}

class _StepList extends StatefulWidget {
  const _StepList({
    required this.slot,
    required this.state,
    required this.engine,
    required this.onChoose,
    required this.onContinue,
    required this.onSkip,
    required this.onDate,
    required this.clock,
  });

  final BuilderSlot slot;
  final BriefState state;
  final BriefEngine engine;
  final void Function(String token, String value) onChoose;
  final VoidCallback onContinue;
  final void Function(String token) onSkip;
  final void Function(String? iso) onDate;
  final DateTime Function() clock;

  @override
  State<_StepList> createState() => _StepListState();
}

class _StepListState extends State<_StepList> {
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final today = businessToday(widget.clock());
    final first = DateTime.parse(today);
    final picked = await showDatePicker(
      context: context,
      firstDate: first,
      lastDate: first.add(const Duration(days: 730)),
      initialDate: first,
    );
    if (picked == null) return;
    widget.onDate(formatIsoDate(picked.year, picked.month, picked.day));
  }

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l10n = context.l10n;
    final slot = widget.slot;
    final draft = widget.state.draft;
    final query = _search.text;
    final hits = widget.engine.search(draft, query);
    final chosen = draft.valuesOf(slot.token);

    Widget option(
      BuilderSlot s,
      BuilderOption o, {
      required bool on,
      required String key,
    }) => _OptionRow(
      key: ValueKey(key),
      label: o.label,
      on: on,
      onTap: () => widget.onChoose(s.token, o.value),
    );

    return Padding(
      padding: const EdgeInsets.fromLTRB(0, 8, 0, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            textField: true,
            label: l10n.mlBriefSearchLabel,
            child: TextField(
              key: const ValueKey('briefBar:search'),
              controller: _search,
              onChanged: (_) => setState(() {}),
              style: ShootType.body.copyWith(color: c.ink),
              decoration: InputDecoration(
                isDense: true,
                border: InputBorder.none,
                hintText: l10n.mlBriefPlaceholder,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 8,
                  vertical: 10,
                ),
              ),
            ),
          ),
          if (query.trim().isNotEmpty)
            for (final hit in hits)
              option(
                hit.slot,
                hit.option,
                on: draft.valuesOf(hit.slot.token).contains(hit.option.value),
                key: 'briefBar:hit:${hit.slot.token}:${hit.option.value}',
              )
          else ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(8, 4, 8, 4),
              child: Text(
                slot.groupLabel.toUpperCase(),
                style: ShootType.groupLabel.copyWith(color: c.mute),
              ),
            ),
            if (slot.kind == SlotKind.date)
              _OptionRow(
                key: const ValueKey('briefBar:pickDate'),
                label: draft.date ?? slot.placeholder,
                on: draft.date != null,
                onTap: _pickDate,
              )
            else
              for (final o in widget.engine.visibleOptions(slot, draft))
                option(
                  slot,
                  o,
                  on: chosen.contains(o.value),
                  key: 'briefBar:option:${slot.token}:${o.value}',
                ),
            if (slot.multiple && chosen.isNotEmpty)
              Align(
                alignment: AlignmentDirectional.centerEnd,
                child: TextButton(
                  key: const ValueKey('briefBar:continue'),
                  onPressed: widget.onContinue,
                  style: TextButton.styleFrom(
                    minimumSize: const Size(44, 44),
                    foregroundColor: c.accentInk,
                  ),
                  child: Text(l10n.mlBriefContinue),
                ),
              ),
            if (!slot.required)
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: TextButton(
                  key: const ValueKey('briefBar:skip'),
                  onPressed: () => widget.onSkip(slot.token),
                  style: TextButton.styleFrom(
                    minimumSize: const Size(44, 44),
                    foregroundColor: c.accentInk,
                  ),
                  child: Text(
                    slot.placeholder.isEmpty
                        ? l10n.mlBriefAnyDate
                        : slot.placeholder,
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _OptionRow extends StatelessWidget {
  const _OptionRow({
    super.key,
    required this.label,
    required this.on,
    required this.onTap,
  });

  final String label;
  final bool on;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      selected: on,
      label: label,
      onTap: onTap,
      excludeSemantics: true,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: Container(
          height: ShootSize.rowHeight,
          padding: const EdgeInsets.symmetric(horizontal: 8),
          decoration: BoxDecoration(
            color: on ? c.selected : null,
            borderRadius: BorderRadius.circular(ShootRadius.row),
          ),
          child: Row(
            children: [
              Expanded(
                child: Text(label, style: ShootType.row.copyWith(color: c.ink)),
              ),
              if (on) ShootIcon(ShootIcons.check, size: 16, color: c.accentInk),
            ],
          ),
        ),
      ),
    );
  }
}
