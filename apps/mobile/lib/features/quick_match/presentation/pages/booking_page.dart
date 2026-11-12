import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/error_page.dart';
import 'package:shoot_mobile/core/routing/not_found_page.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/core/widgets/message_banner.dart';
import 'package:shoot_mobile/core/widgets/quote_lines.dart';
import 'package:shoot_mobile/core/widgets/shoot_field.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/status_badge.dart';
import 'package:shoot_mobile/core/widgets/summary_row.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/quick_match/domain/entities/quick_match.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/booking_view_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/widgets/qm_parts.dart';

/// Screens 12, 13, 14, 40 and the states without a board, at `/q/{ref}/{key}`
/// (boards `S04a-quote-accept`, `S04-quotation`, `S04b-delivered`, `S04c-expired`). One layout, read
/// from the server each time it opens, with the badge, progress and the one next step of the
/// booking's state (FR-030, FR-035). Nothing here takes or asks for a payment (FR-034).
class BookingPage extends StatefulWidget {
  const BookingPage({
    super.key,
    required this.ref,
    required this.accessKey,
    required this.links,
    this.openUrl = openInBrowser,
  });

  final String ref;
  final String accessKey;
  final WebsiteLinks links;
  final UrlOpener openUrl;

  @override
  State<BookingPage> createState() => _BookingPageState();
}

class _BookingPageState extends State<BookingPage> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    unawaited(context.read<BookingViewCubit>().load());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  // Back from WhatsApp: show the booking as it stands now (FR-017, FR-030).
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      unawaited(context.read<BookingViewCubit>().load());
    }
  }

  void _chat(BookingView view) {
    final url = view.whatsappUrl;
    if (url != null) unawaited(widget.openUrl(Uri.parse(url)));
  }

  void _pdf() {
    final language = Localizations.localeOf(context).languageCode;
    unawaited(
      widget.openUrl(
        widget.links.address(
          '/q/${widget.ref}/${widget.accessKey}',
          languageCode: language,
        ),
      ),
    );
  }

  Future<void> _report() async {
    final reason = await showModalBottomSheet<String>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const _ReportSheet(),
    );
    if (reason != null && mounted) {
      unawaited(context.read<BookingViewCubit>().report(reason));
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<BookingViewCubit, BookingViewState>(
      listenWhen: (a, b) => a.fresh != b.fresh && b.fresh != null,
      listener: (context, state) {
        final fresh = state.fresh!;
        context.go('/match/${fresh.briefReference}/${fresh.briefKey}');
      },
      builder: (context, state) {
        switch (state.status) {
          case BookingViewStatus.loading:
            return const ShootScaffold(
              child: Center(child: CircularProgressIndicator()),
            );
          case BookingViewStatus.notFound:
            return const NotFoundPage();
          case BookingViewStatus.failed:
            return ErrorPage(
              onRetry: () => unawaited(context.read<BookingViewCubit>().load()),
            );
          case BookingViewStatus.ready:
            return _Ready(
              state: state,
              view: state.view!,
              onChat: () => _chat(state.view!),
              onPdf: _pdf,
              onReport: () => unawaited(_report()),
            );
        }
      },
    );
  }
}

class _Ready extends StatelessWidget {
  const _Ready({
    required this.state,
    required this.view,
    required this.onChat,
    required this.onPdf,
    required this.onReport,
  });

  final BookingViewState state;
  final BookingView view;
  final VoidCallback onChat;
  final VoidCallback onPdf;
  final VoidCallback onReport;

  static (String, BadgeTone) _badge(BuildContext context, BookingState s) {
    final l10n = context.l10n;
    return switch (s) {
      BookingState.quoted => (l10n.qmStateQuoted, BadgeTone.neutral),
      BookingState.accepted => (l10n.qmStateAccepted, BadgeTone.attention),
      BookingState.confirmed => (l10n.qmStateConfirmed, BadgeTone.attention),
      BookingState.paid => (l10n.qmStatePaid, BadgeTone.success),
      BookingState.scheduled => (l10n.qmStateScheduled, BadgeTone.success),
      BookingState.delivered => (l10n.qmStateDelivered, BadgeTone.accent),
      BookingState.completed => (l10n.qmStateCompleted, BadgeTone.success),
      BookingState.cancelled => (l10n.qmStateCancelled, BadgeTone.danger),
      BookingState.expired => (l10n.qmStateExpired, BadgeTone.danger),
      BookingState.onHold => (l10n.qmStateOnHold, BadgeTone.danger),
      BookingState.unknown => (l10n.qmStateQuoted, BadgeTone.neutral),
    };
  }

  String _next(BuildContext context) {
    final l10n = context.l10n;
    final pro = view.professionals.firstOrNull;
    final name = pro?.name;
    final lapsed = view.replacements.firstOrNull?.persona.singular ?? '';
    return switch (view.nextStep) {
      NextStep.accept =>
        name == null ? l10n.qmNextAcceptTeam : l10n.qmNextAccept(name),
      NextStep.waitProfessional =>
        name == null ? l10n.qmNextWaitTeam : l10n.qmNextWait(name),
      NextStep.chooseAnother => l10n.qmNextChooseAnother(lapsed.toLowerCase()),
      NextStep.pay => l10n.qmNextPay,
      NextStep.shootDay =>
        view.shootDate == null
            ? l10n.qmNextShootDayOpen
            : l10n.qmNextShootDay(qmDay(context, view.shootDate!)),
      NextStep.confirmDelivery => l10n.qmNextConfirmDelivery,
      NextStep.freshQuotation => l10n.qmNextExpired,
      NextStep.contactTeam =>
        view.holdReason == null
            ? l10n.qmNextOnHold
            : l10n.qmHoldReason(view.holdReason!),
      NextStep.none => switch (view.state) {
        BookingState.completed => l10n.qmNextCompleted,
        BookingState.cancelled => l10n.qmNextCancelled,
        _ => '',
      },
    };
  }

  String _stamp(BuildContext context, DateTime at) {
    final locale = Localizations.localeOf(context).languageCode;
    return DateFormat('d MMM', '${locale}_AE').format(at.toLocal());
  }

  String _progressLabel(BuildContext context, ProgressKey key) {
    final l10n = context.l10n;
    return switch (key) {
      ProgressKey.briefSent => l10n.qmProgBriefSent,
      ProgressKey.confirmed => l10n.qmProgConfirmed,
      ProgressKey.paid => l10n.qmProgPaid,
      ProgressKey.shootDay => l10n.qmProgShootDay,
      ProgressKey.delivered => l10n.qmProgDelivered,
      ProgressKey.completed => l10n.qmProgCompleted,
    };
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final cubit = context.read<BookingViewCubit>();
    final (badgeText, tone) = _badge(context, view.state);
    final expired = view.state == BookingState.expired;
    final meta = ShootType.meta.copyWith(color: c.mute);
    final lastDone = view.progress.lastIndexWhere((p) => p.at != null);
    final shown = view.state == BookingState.quoted || expired
        ? const <ProgressStep>[]
        : view.progress
              .where(
                (p) =>
                    p.key != ProgressKey.delivered &&
                        p.key != ProgressKey.completed ||
                    p.at != null,
              )
              .toList();

    Widget? primary() {
      final loading = state.busy;
      switch (view.nextStep) {
        case NextStep.accept:
          return view.canAccept
              ? TopHit(
                  label: l10n.qmAccept,
                  centered: true,
                  loading: loading,
                  onPressed: () => unawaited(cubit.accept()),
                )
              : null;
        case NextStep.chooseAnother:
          final r = view.replacements.firstOrNull;
          final creator = r?.creators.firstOrNull;
          if (r == null || creator == null) return null;
          return TopHit(
            label: l10n.qmChooseAnotherWith(creator.name.split(' ').first),
            chevron: true,
            loading: loading,
            onPressed: () =>
                unawaited(cubit.pickAnother(r.persona.slug, creator.code)),
          );
        case NextStep.confirmDelivery:
          return TopHit(
            label: l10n.qmConfirmDelivery,
            centered: true,
            loading: loading,
            onPressed: () => unawaited(cubit.confirmDelivery()),
          );
        case NextStep.freshQuotation:
          return TopHit(
            label: l10n.qmFreshAction,
            centered: true,
            loading: loading,
            onPressed: () => unawaited(cubit.getFresh()),
          );
        case NextStep.none:
          return null;
        case NextStep.waitProfessional ||
            NextStep.pay ||
            NextStep.shootDay ||
            NextStep.contactTeam:
          return view.whatsappUrl == null
              ? null
              : TopHit(
                  label: l10n.qmOpenChat,
                  leading: ShootIcons.whatsapp,
                  centered: true,
                  onPressed: onChat,
                );
      }
    }

    final first = view.professionals.firstOrNull?.name?.split(' ').first;
    final failure = state.commandFailure;
    return ShootScaffold(
      child: Column(
        children: [
          QmHeader(onBack: () => qmBack(context)),
          Expanded(
            child: QmBody(
              content: [
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(20, 4, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    spacing: 8,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              expired
                                  ? l10n.qmExpiredTitle
                                  : l10n.qmQuoteTitle(view.reference),
                              style: ShootType.title.copyWith(
                                color: c.ink,
                                fontSize: expired ? 26 : 24,
                              ),
                            ),
                          ),
                          TextLink(label: l10n.qmDownloadPdf, onTap: onPdf),
                        ],
                      ),
                      Align(
                        alignment: AlignmentDirectional.centerStart,
                        child: StatusBadge(label: badgeText, tone: tone),
                      ),
                      if (view.sentence.isNotEmpty)
                        Text(
                          view.sentence,
                          style: ShootType.body.copyWith(
                            color: c.bodyInk,
                            height: 1.5,
                          ),
                        ),
                      Text(
                        '${l10n.qmIssued(_stamp(context, view.issuedAt))} · ${l10n.qmValidUntil(_stamp(context, view.validUntil))}',
                        style: meta,
                      ),
                    ],
                  ),
                ),
                if (failure != null)
                  Padding(
                    padding: const EdgeInsetsDirectional.fromSTEB(
                      20,
                      12,
                      20,
                      0,
                    ),
                    child: MessageBanner(
                      text: qmFailureText(context, failure),
                      tone: BannerTone.error,
                    ),
                  ),
                Padding(
                  padding: const EdgeInsetsDirectional.fromSTEB(20, 16, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    spacing: 12,
                    children: [
                      if (_next(context).isNotEmpty)
                        Text(
                          _next(context),
                          style: ShootType.body.copyWith(
                            color: c.ink,
                            fontWeight: FontWeight.w500,
                            height: 1.5,
                          ),
                        ),
                      if (view.shootDate != null)
                        SummaryRow(
                          label: l10n.qmShootOn,
                          value: [
                            qmDay(context, view.shootDate!),
                            ?view.startTime,
                          ].join(' · '),
                        ),
                      for (final p in view.professionals)
                        SummaryRow(
                          label: p.type,
                          value: p.name ?? l10n.qmWeChoose,
                        ),
                      QuoteLines(
                        lines: [
                          for (final l in view.lines)
                            (
                              label: l.label,
                              detail: l.includes.isEmpty
                                  ? null
                                  : l.includes.join(' · '),
                              amount: l.amountFils / 100,
                            ),
                        ],
                        totalLabel: l10n.qmTotal,
                        total: view.totalFils / 100,
                        totalNote: l10n.qmVatNote,
                      ),
                      if (shown.isNotEmpty)
                        Semantics(
                          container: true,
                          label: l10n.qmProgressLabel,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              for (final step in shown)
                                _ProgressRow(
                                  label: _progressLabel(context, step.key),
                                  date: step.at == null
                                      ? null
                                      : _stamp(context, step.at!),
                                  done: step.at != null,
                                  current:
                                      view.progress.indexOf(step) ==
                                      lastDone + 1,
                                ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ],
              bottom: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: 12,
                children: [
                  ?primary(),
                  if (view.canReport &&
                      view.nextStep == NextStep.confirmDelivery)
                    Center(
                      child: TextLink(
                        label: l10n.qmReportProblem,
                        onTap: onReport,
                      ),
                    ),
                  if (view.nextStep == NextStep.accept &&
                      view.whatsappUrl != null)
                    Center(
                      child: TextLink(label: l10n.qmQuestions, onTap: onChat),
                    ),
                  if (expired)
                    Center(
                      child: Text(
                        l10n.qmFreshNote,
                        textAlign: TextAlign.center,
                        style: meta,
                      ),
                    ),
                  if (view.nextStep == NextStep.pay && first != null)
                    Center(
                      child: Text(
                        l10n.qmChangeDate(first),
                        textAlign: TextAlign.center,
                        style: meta,
                      ),
                    )
                  else if (view.nextStep == NextStep.pay)
                    Center(
                      child: Text(
                        l10n.qmChangeDateTeam,
                        textAlign: TextAlign.center,
                        style: meta,
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProgressRow extends StatelessWidget {
  const _ProgressRow({
    required this.label,
    required this.date,
    required this.done,
    required this.current,
  });

  final String label;
  final String? date;
  final bool done;
  final bool current;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final ink = done ? c.ink : c.mute;
    return Container(
      constraints: const BoxConstraints(minHeight: 40),
      padding: const EdgeInsetsDirectional.symmetric(vertical: 8),
      child: Row(
        spacing: ShootSpace.s3,
        children: [
          Container(
            width: 20,
            height: 20,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: done ? c.accent : Colors.transparent,
              border: done
                  ? null
                  : Border.all(color: current ? c.accent : c.hair, width: 2),
            ),
            child: done
                ? ShootIcon(ShootIcons.check, size: 12, color: c.onAccent)
                : null,
          ),
          Expanded(
            child: Text(
              label,
              style: ShootType.row.copyWith(
                color: ink,
                fontWeight: current ? FontWeight.w600 : FontWeight.w400,
              ),
            ),
          ),
          if (date != null)
            Text(date!, style: ShootType.meta.copyWith(color: c.mute)),
        ],
      ),
    );
  }
}

/// "What went wrong?": sends the text to the team and puts the booking on hold (US5-S3).
class _ReportSheet extends StatefulWidget {
  const _ReportSheet();

  @override
  State<_ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends State<_ReportSheet> {
  final TextEditingController _text = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: Semantics(
        scopesRoute: true,
        explicitChildNodes: true,
        namesRoute: true,
        label: l10n.qmReportProblem,
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: c.panelSolid,
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(ShootRadius.sheet),
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(ShootSpace.s5),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                spacing: ShootSpace.s4,
                children: [
                  ShootTextArea(
                    key: const ValueKey('qm:report'),
                    label: l10n.qmReportLabel,
                    controller: _text,
                    error: _error,
                  ),
                  TopHit(
                    label: l10n.qmReportSend,
                    centered: true,
                    onPressed: () {
                      final reason = _text.text.trim();
                      if (reason.length < 5) {
                        setState(() => _error = l10n.qmErrReason);
                        return;
                      }
                      Navigator.of(context).pop(reason);
                    },
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
