import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/group_label.dart';
import 'package:shoot_mobile/core/widgets/inline_error.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/brief/domain/brief_draft.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

/// The Brief Bar, as on the website: one panel with a search field ("Type what you're looking
/// for"), the asked step as a group of glyph-tile rows ("PROFESSIONAL · pick one or more", "1 of
/// 6"), and an Actions group (WhatsApp, "I'm a …"). Answered words print as tappable tokens in the
/// field. The primary action shows once every step is answered. Every word comes from the CMS config.
class BriefBar extends StatefulWidget {
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
    this.onWhatsapp,
    this.onProvider,
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

  /// "WhatsApp us instead"; the row is left out when `null`.
  final VoidCallback? onWhatsapp;

  /// "I'm a {persona}" with the first persona's slug; the row is left out when `null`.
  final void Function(String personaSlug)? onProvider;

  @override
  State<BriefBar> createState() => _BriefBarState();
}

class _BriefBarState extends State<BriefBar> {
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
    final state = widget.state;
    final config = state.config!;
    final engine = BriefEngine(config);
    final c = context.colors;
    final l10n = context.l10n;
    final draft = state.draft;
    // The asked step shows from the start (the website's bar has no example mode).
    final activeToken = state.active ?? engine.nextStep(draft)?.token;
    final active = activeToken == null ? null : engine.slot(activeToken);
    final complete = active == null;
    final query = _search.text.trim();
    final searching = query.isNotEmpty;
    final personaSlot = engine.slots
        .where((s) => s.kind == SlotKind.persona && s.options.isNotEmpty)
        .firstOrNull;
    final firstPersona = personaSlot?.options.first;

    return Container(
      key: const ValueKey('briefBar'),
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
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Field(
            state: state,
            engine: engine,
            controller: _search,
            onChanged: () => setState(() {}),
            onReopen: widget.onReopen,
          ),
          Divider(height: 1, color: c.hair),
          if (state.message != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: InlineError(_messageText(context, state, engine)),
            ),
          if (complete && !searching) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
              child: GroupLabel(l10n.mlBriefTopHit),
            ),
            TopHit(
              label: config.submitLabel,
              chevron: true,
              leading: ShootIcons.search,
              loading: state.submitting,
              onPressed: widget.onSubmit,
            ),
            if (config.helperText.isNotEmpty)
              Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(16, 8, 16, 4),
                child: Text(
                  config.helperText,
                  style: ShootType.meta.copyWith(color: c.mute),
                ),
              ),
            const SizedBox(height: 8),
          ] else if (searching)
            _Hits(
              hits: engine.search(draft, query),
              draft: draft,
              onChoose: (slot, option) {
                widget.onChoose(slot.token, option.value);
                _search.clear();
                setState(() {});
              },
            )
          else
            _StepList(
              slot: active!,
              stepNo: engine.slots.indexOf(active) + 1,
              total: engine.slots.length,
              state: state,
              engine: engine,
              onChoose: widget.onChoose,
              onContinue: widget.onContinue,
              onSkip: widget.onSkip,
              onPickDate: _pickDate,
            ),
          if (!searching) ...[
            Divider(height: 1, color: c.hair),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 4),
              child: GroupLabel(l10n.mlBriefActions),
            ),
            if (widget.onWhatsapp case final onWhatsapp?)
              _OptionRow(
                key: const ValueKey('briefBar:whatsapp'),
                label: l10n.mlBriefWhatsappInstead,
                icon: ShootIcons.whatsapp,
                onTap: onWhatsapp,
              ),
            if (widget.onProvider != null && firstPersona != null)
              _OptionRow(
                key: const ValueKey('briefBar:provider'),
                label: l10n.mlBriefImA(firstPersona.label),
                text: '+',
                highlight: true,
                onTap: () => widget.onProvider!(firstPersona.value),
              ),
            if (!draft.isEmpty)
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: Padding(
                  padding: const EdgeInsetsDirectional.only(start: 6),
                  child: TextButton(
                    key: const ValueKey('briefBar:takeBack'),
                    onPressed: widget.onTakeBack,
                    style: TextButton.styleFrom(
                      minimumSize: const Size(44, 44),
                      foregroundColor: c.accentInk,
                    ),
                    child: Text(l10n.mlBriefTakeBack),
                  ),
                ),
              ),
            const SizedBox(height: 8),
          ],
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

/// The field: the magnifier, the words chosen so far as tappable tokens, and the search input
/// ("Type what you're looking for").
class _Field extends StatelessWidget {
  const _Field({
    required this.state,
    required this.engine,
    required this.controller,
    required this.onChanged,
    required this.onReopen,
  });

  final BriefState state;
  final BriefEngine engine;
  final TextEditingController controller;
  final VoidCallback onChanged;
  final void Function(String token) onReopen;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l10n = context.l10n;
    final style = ShootType.heading.copyWith(
      fontSize: 20,
      fontWeight: FontWeight.w500,
      height: 1.35,
      letterSpacing: -0.2,
      color: c.ink,
    );
    final tokens = _tokens(context, style);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsetsDirectional.only(top: 3, end: 12),
                child: ShootIcon(
                  ShootIcons.search,
                  size: 22,
                  strokeWidth: 2.25,
                  color: c.ink,
                ),
              ),
              Expanded(
                child: tokens != null
                    ? Padding(
                        padding: const EdgeInsetsDirectional.only(top: 1),
                        child: tokens,
                      )
                    : Semantics(
                        textField: true,
                        label: l10n.mlBriefSearchLabel,
                        child: TextField(
                          key: const ValueKey('briefBar:search'),
                          controller: controller,
                          onChanged: (_) => onChanged(),
                          textInputAction: TextInputAction.search,
                          style: style,
                          cursorColor: c.accent,
                          decoration: InputDecoration(
                            isDense: true,
                            border: InputBorder.none,
                            contentPadding: EdgeInsets.zero,
                            hintText: l10n.mlBriefSearchPrompt,
                            hintStyle: style.copyWith(color: c.mute),
                          ),
                        ),
                      ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  /// The sentence with only its answered words; an unanswered slot drops with the text before it.
  Widget? _tokens(BuildContext context, TextStyle style) {
    final c = context.colors;
    final sentence = engine.config.sentence;
    final parts = RegExp(r'\{(\w+)\}').allMatches(sentence).toList();
    final spans = <InlineSpan>[];
    var cursor = 0;
    var any = false;
    var tailAttached = false;
    for (final m in parts) {
      final slot = engine.slot(m.group(1)!);
      final answered = slot != null && engine.isAnswered(slot, state.draft);
      if (answered) {
        any = true;
        if (m.start > cursor) {
          spans.add(
            TextSpan(
              text: sentence.substring(cursor, m.start),
              style: style.copyWith(color: c.mute),
            ),
          );
        }
        final words = slot.kind == SlotKind.date
            ? (state.draft.date ?? '')
            : state.draft
                  .valuesOf(slot.token)
                  .map((v) => engine.sentenceWord(slot, v))
                  .join(', ');
        // Closing punctuation stays on the chip's last line instead of wrapping alone.
        final tail = m == parts.last ? sentence.substring(m.end) : '';
        final attach = tail.isNotEmpty && tail.trim().length <= 2;
        tailAttached = attach;
        final chip = Container(
          padding: const EdgeInsets.symmetric(horizontal: 5),
          decoration: BoxDecoration(
            color: c.selected,
            borderRadius: BorderRadius.circular(6),
            border: state.active == slot.token
                ? Border.all(color: c.accent, width: 1.5)
                : null,
          ),
          child: Text(words, style: style),
        );
        spans.add(
          WidgetSpan(
            alignment: PlaceholderAlignment.baseline,
            baseline: TextBaseline.alphabetic,
            child: GestureDetector(
              key: ValueKey('briefBar:slot:${slot.token}'),
              behavior: HitTestBehavior.opaque,
              onTap: () => onReopen(slot.token),
              child: attach
                  ? Row(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Flexible(child: chip),
                        Text(tail, style: style.copyWith(color: c.mute)),
                      ],
                    )
                  : chip,
            ),
          ),
        );
      }
      cursor = m.end;
    }
    if (!any) return null;
    if (!tailAttached && cursor < sentence.length) {
      spans.add(
        TextSpan(
          text: sentence.substring(cursor),
          style: style.copyWith(color: c.mute),
        ),
      );
    }
    return Text.rich(TextSpan(children: spans), style: style);
  }
}

/// A search over every step at once (typing): matching options, each in its own step.
class _Hits extends StatelessWidget {
  const _Hits({
    required this.hits,
    required this.draft,
    required this.onChoose,
  });

  final List<({BuilderSlot slot, BuilderOption option})> hits;
  final BriefDraft draft;
  final void Function(BuilderSlot slot, BuilderOption option) onChoose;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 6, bottom: 8),
      child: Column(
        children: [
          for (final hit in hits)
            _OptionRow(
              key: ValueKey(
                'briefBar:hit:${hit.slot.token}:${hit.option.value}',
              ),
              label: hit.option.label,
              text: hit.option.glyph,
              on: draft.valuesOf(hit.slot.token).contains(hit.option.value),
              onTap: () => onChoose(hit.slot, hit.option),
            ),
        ],
      ),
    );
  }
}

class _StepList extends StatelessWidget {
  const _StepList({
    required this.slot,
    required this.stepNo,
    required this.total,
    required this.state,
    required this.engine,
    required this.onChoose,
    required this.onContinue,
    required this.onSkip,
    required this.onPickDate,
  });

  final BuilderSlot slot;
  final int stepNo;
  final int total;
  final BriefState state;
  final BriefEngine engine;
  final void Function(String token, String value) onChoose;
  final VoidCallback onContinue;
  final void Function(String token) onSkip;
  final VoidCallback onPickDate;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l10n = context.l10n;
    final draft = state.draft;
    final chosen = draft.valuesOf(slot.token);
    final arabic = Localizations.localeOf(context).languageCode == 'ar';
    final label = arabic ? slot.groupLabel : slot.groupLabel.toUpperCase();
    final labelStyle = ShootType.groupLabel.copyWith(
      color: c.mute,
      letterSpacing: arabic ? 0 : null,
    );
    final plain = ShootType.meta.copyWith(
      color: c.mute,
      fontWeight: FontWeight.w400,
    );
    return Padding(
      padding: const EdgeInsets.only(top: 10, bottom: 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 4),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text.rich(
                      TextSpan(
                        children: [
                          TextSpan(text: label, style: labelStyle),
                          if (slot.multiple)
                            TextSpan(
                              text: ' · ${l10n.mlBriefPickAny}',
                              style: plain,
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
                Text(
                  l10n.mlBriefStepOf(stepNo, total),
                  style: ShootType.num(plain),
                ),
              ],
            ),
          ),
          if (slot.kind == SlotKind.date)
            _OptionRow(
              key: const ValueKey('briefBar:pickDate'),
              label: draft.date ?? slot.placeholder,
              icon: ShootIcons.calendar,
              on: draft.date != null,
              onTap: onPickDate,
            )
          else
            for (final o in engine.visibleOptions(slot, draft))
              _OptionRow(
                key: ValueKey('briefBar:option:${slot.token}:${o.value}'),
                label: o.label,
                text: o.glyph,
                on: chosen.contains(o.value),
                onTap: () => onChoose(slot.token, o.value),
              ),
          if (slot.multiple && chosen.isNotEmpty)
            Align(
              alignment: AlignmentDirectional.centerEnd,
              child: TextButton(
                key: const ValueKey('briefBar:continue'),
                onPressed: onContinue,
                style: TextButton.styleFrom(
                  minimumSize: const Size(44, 44),
                  foregroundColor: c.accentInk,
                ),
                child: Text(l10n.mlBriefContinue),
              ),
            ),
          if (!slot.required)
            _OptionRow(
              key: const ValueKey('briefBar:skip'),
              label: slot.placeholder.isEmpty
                  ? l10n.mlBriefAnyDate
                  : slot.placeholder,
              icon: ShootIcons.chevron,
              onTap: () => onSkip(slot.token),
            ),
        ],
      ),
    );
  }
}

/// A result row (web `rowClass` + `RowContent`): 30 px glyph tile, label, and "set" when chosen.
class _OptionRow extends StatelessWidget {
  const _OptionRow({
    super.key,
    required this.label,
    required this.onTap,
    this.icon,
    this.text,
    this.on = false,
    this.highlight = false,
  });

  final String label;
  final ShootIcons? icon;
  final String? text;
  final bool on;

  /// The row is tinted like a chosen one without saying "set" (the website's provider action).
  final bool highlight;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l10n = context.l10n;
    final tileInk = on || highlight ? c.onAccent : c.tileInk;
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
          constraints: const BoxConstraints(minHeight: ShootSize.rowHeight),
          margin: const EdgeInsets.symmetric(horizontal: 6),
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
          decoration: BoxDecoration(
            color: on || highlight ? c.selected : null,
            borderRadius: BorderRadius.circular(ShootRadius.row),
          ),
          child: Row(
            children: [
              Container(
                width: ShootSize.tile,
                height: ShootSize.tile,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: on || highlight ? c.accent : c.tile,
                  borderRadius: BorderRadius.circular(ShootRadius.tile),
                ),
                child: on
                    ? ShootIcon(ShootIcons.check, size: 15, color: tileInk)
                    : icon != null
                    ? ShootIcon(icon!, size: 16, color: tileInk)
                    : Text(
                        text == null || text!.isEmpty ? '' : text!,
                        style: ShootType.groupLabel.copyWith(
                          fontWeight: FontWeight.w700,
                          letterSpacing: -0.2,
                          color: tileInk,
                        ),
                      ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: ShootType.row.copyWith(
                    color: c.ink,
                    fontWeight: on || highlight ? FontWeight.w600 : null,
                  ),
                ),
              ),
              if (on)
                Text(
                  l10n.mlBriefSet,
                  style: ShootType.meta.copyWith(color: c.accentInk),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
