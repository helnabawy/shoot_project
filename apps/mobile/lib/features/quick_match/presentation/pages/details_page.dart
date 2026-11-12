import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/core/widgets/message_banner.dart';
import 'package:shoot_mobile/core/widgets/money.dart';
import 'package:shoot_mobile/core/widgets/picker_field.dart';
import 'package:shoot_mobile/core/widgets/shoot_field.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/book_flow_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/match_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/widgets/qm_parts.dart';

/// Carries the flow to its end: once the quotation is saved it opens WhatsApp with the booking
/// written in and shows the quotation (FR-015, FR-017); a creator who is no longer free sends the
/// person back to step 2 (US2 edge case). Wrap every screen of steps 3 and 4 in it.
class BookFlowListener extends StatelessWidget {
  const BookFlowListener({
    super.key,
    required this.ref,
    required this.accessKey,
    required this.openUrl,
    required this.child,
  });

  final String ref;
  final String accessKey;
  final UrlOpener openUrl;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return BlocListener<BookFlowCubit, BookFlowState>(
      listenWhen: (a, b) => a.status != b.status,
      listener: (context, state) {
        final issued = state.issued;
        if (state.status == BookStatus.done && issued != null) {
          final url = issued.whatsappUrl;
          if (url != null) unawaited(openUrl(Uri.parse(url)));
          context.go('/q/${issued.reference}/${issued.key}');
        } else if (state.status == BookStatus.unavailable) {
          unawaited(context.read<MatchCubit>().load());
          context.go('/match/$ref/$accessKey');
        }
      },
      child: child,
    );
  }
}

/// Screen 09, built to board `S03-details`: the date, start time, duration, venue and a note.
/// The price follows the duration. No number, name or email is asked here (FR-011).
class DetailsPage extends StatefulWidget {
  const DetailsPage({
    super.key,
    required this.ref,
    required this.accessKey,
    this.openUrl = openInBrowser,
  });

  final String ref;
  final String accessKey;
  final UrlOpener openUrl;

  @override
  State<DetailsPage> createState() => _DetailsPageState();
}

class _DetailsPageState extends State<DetailsPage> {
  late final BookFlowCubit _flow = context.read<BookFlowCubit>();
  late final TextEditingController _venue = TextEditingController(
    text: _flow.state.venue,
  );
  late final TextEditingController _note = TextEditingController(
    text: _flow.state.note,
  );

  @override
  void dispose() {
    _venue.dispose();
    _note.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final today = DateTime.parse(_flow.today);
    final current = DateTime.tryParse(_flow.state.date) ?? today;
    final picked = await showDatePicker(
      context: context,
      initialDate: current.isBefore(today) ? today : current,
      firstDate: today,
      lastDate: today.add(const Duration(days: 730)),
    );
    if (picked != null) {
      _flow.dateChanged(picked.toIso8601String().substring(0, 10));
    }
  }

  Future<void> _pickTime() async {
    final parts = _flow.state.startTime.split(':');
    final initial = parts.length == 2
        ? TimeOfDay(
            hour: int.tryParse(parts[0]) ?? 18,
            minute: int.tryParse(parts[1]) ?? 0,
          )
        : const TimeOfDay(hour: 18, minute: 0);
    final picked = await showTimePicker(
      context: context,
      initialTime: initial,
      builder: (context, child) => MediaQuery(
        data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
        child: child!,
      ),
    );
    if (picked != null) {
      _flow.startTimeChanged(
        '${picked.hour.toString().padLeft(2, '0')}:${picked.minute.toString().padLeft(2, '0')}',
      );
    }
  }

  Future<void> _pickDuration() async {
    final options =
        context.read<MatchCubit>().state.page?.durations ?? const [];
    final chosen = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => _DurationSheet(
        title: context.l10n.qmDurationLabel,
        options: [for (final o in options) (o.value, o.label)],
        selected: _flow.state.duration,
      ),
    );
    if (chosen == null || !mounted) return;
    _flow.durationChanged(chosen);
    // The price follows the duration (US2-S2): the same brief is priced again.
    unawaited(context.read<MatchCubit>().changeDuration(chosen));
  }

  Future<void> _continue() async {
    if (!_flow.validateDetails()) return;
    if (_flow.signedIn) {
      await _flow.issue();
    } else {
      if (mounted) {
        unawaited(
          context.push('/match/${widget.ref}/${widget.accessKey}/number'),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    return BookFlowListener(
      ref: widget.ref,
      accessKey: widget.accessKey,
      openUrl: widget.openUrl,
      child: BlocBuilder<MatchCubit, MatchState>(
        builder: (context, match) => BlocBuilder<BookFlowCubit, BookFlowState>(
          builder: (context, flow) {
            final page = match.page;
            final total = page?.totalFils;
            final durations = page?.durations ?? const [];
            final label = durations
                .where((d) => d.value == flow.duration)
                .map((d) => d.label)
                .firstOrNull;
            final first = match.chosenIn(0);
            final summary = [
              first?.firstName ?? l10n.qmWeChoose,
              ?(total == null ? null : Money.format(total / 100)),
            ].join(' · ');
            return ShootScaffold(
              child: Column(
                children: [
                  QmHeader(onBack: () => qmBack(context)),
                  Expanded(
                    child: QmBody(
                      content: [
                        Padding(
                          padding: const EdgeInsetsDirectional.fromSTEB(
                            20,
                            4,
                            20,
                            0,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            spacing: 6,
                            children: [
                              QmStepLine(step: 3, summary: summary),
                              Text(
                                l10n.qmDetailsTitle,
                                style: ShootType.title.copyWith(
                                  color: c.ink,
                                  fontSize: 28,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Padding(
                          padding: const EdgeInsetsDirectional.fromSTEB(
                            20,
                            20,
                            20,
                            0,
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            spacing: ShootSpace.s4,
                            children: [
                              if (flow.status == BookStatus.failed ||
                                  flow.status == BookStatus.rateLimited)
                                MessageBanner(
                                  text: qmFailureText(context, flow.failure!),
                                  tone: BannerTone.error,
                                ),
                              PickerField(
                                key: const ValueKey('qm:date'),
                                label: l10n.qmDateLabel,
                                opensHint: l10n.qmDateLabel,
                                value: flow.date.isEmpty
                                    ? null
                                    : qmDay(context, flow.date),
                                error: qmFieldText(
                                  context,
                                  flow.errors['date'],
                                ),
                                onTap: () => unawaited(_pickDate()),
                              ),
                              PickerField(
                                key: const ValueKey('qm:time'),
                                label: l10n.qmTimeLabel,
                                opensHint: l10n.qmTimeLabel,
                                placeholder: l10n.qmTimeHint,
                                value: flow.startTime.isEmpty
                                    ? null
                                    : flow.startTime,
                                error: qmFieldText(
                                  context,
                                  flow.errors['startTime'],
                                ),
                                onTap: () => unawaited(_pickTime()),
                              ),
                              if (durations.isNotEmpty)
                                PickerField(
                                  key: const ValueKey('qm:duration'),
                                  label: l10n.qmDurationLabel,
                                  opensHint: l10n.qmDurationLabel,
                                  value: label,
                                  onTap: () => unawaited(_pickDuration()),
                                ),
                              ShootField(
                                key: const ValueKey('qm:venue'),
                                label: l10n.qmVenueLabel,
                                controller: _venue,
                                error: qmFieldText(
                                  context,
                                  flow.errors['venue'],
                                ),
                                textInputAction: TextInputAction.next,
                                onChanged: _flow.venueChanged,
                              ),
                              ShootTextArea(
                                key: const ValueKey('qm:note'),
                                label: first == null
                                    ? l10n.qmNoteLabelTeam
                                    : l10n.qmNoteLabel(first.firstName),
                                controller: _note,
                                onChanged: _flow.noteChanged,
                              ),
                            ],
                          ),
                        ),
                      ],
                      bottom: TopHit(
                        label: l10n.qmContinueLabel,
                        price: total == null ? null : Money.format(total / 100),
                        chevron: true,
                        loading: flow.status == BookStatus.issuing,
                        onPressed: () => unawaited(_continue()),
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _DurationSheet extends StatelessWidget {
  const _DurationSheet({
    required this.title,
    required this.options,
    required this.selected,
  });

  final String title;
  final List<(String, String)> options;
  final String selected;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      scopesRoute: true,
      explicitChildNodes: true,
      namesRoute: true,
      label: title,
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: c.panelSolid,
          borderRadius: const BorderRadius.vertical(
            top: Radius.circular(ShootRadius.sheet),
          ),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (final (value, label) in options)
                ListTile(
                  title: Text(
                    label,
                    style: ShootType.row.copyWith(color: c.ink),
                  ),
                  trailing: value == selected
                      ? Icon(Icons.check, color: c.accentInk)
                      : null,
                  onTap: () => Navigator.of(context).pop(value),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
