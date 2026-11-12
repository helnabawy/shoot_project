import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/empty_state.dart';
import 'package:shoot_mobile/core/widgets/secondary_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_field.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/core/widgets/status_badge.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/bookings_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/widgets/creator_parts.dart';

/// Screen 32 at `/account/bookings` (and `/account/bookings/:ref` for one request), built to
/// board `S07d-creator-bookings`. The request with the nearest deadline is the one primary action.
class BookingsPage extends StatelessWidget {
  const BookingsPage({super.key, required this.create, this.ref});

  final BookingsCubit Function() create;

  /// Shows only this booking's request when set.
  final String? ref;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) {
        final cubit = create();
        unawaited(cubit.load());
        return cubit;
      },
      child: BlocBuilder<BookingsCubit, BookingsState>(
        builder: (context, state) {
          final cubit = context.read<BookingsCubit>();
          return BookingsView(
            state: state,
            only: ref,
            onRetry: cubit.load,
            onConfirm: cubit.confirm,
            onDecline: (ref) async {
              final reason = await showDeclineSheet(context);
              if (reason != null) await cubit.decline(ref, reason: reason);
            },
            onDeliver: cubit.markDelivered,
            onMarkRead: cubit.markRead,
            onCalendar: () => context.push(AppRoutes.accountAvailability),
          );
        },
      ),
    );
  }
}

/// The decline sheet: an optional reason. `null` when closed without sending.
Future<String?> showDeclineSheet(BuildContext context) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => const DeclineSheet(),
  );
}

class DeclineSheet extends StatefulWidget {
  const DeclineSheet({super.key});

  @override
  State<DeclineSheet> createState() => _DeclineSheetState();
}

class _DeclineSheetState extends State<DeclineSheet> {
  final _reason = TextEditingController();

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom),
      child: ShootSheet(
        label: l10n.caDeclineTitle,
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 12,
            children: [
              Text(
                l10n.caDeclineTitle,
                style: ShootType.heading.copyWith(color: context.colors.ink),
              ),
              MetaText(l10n.caDeclineBody),
              ShootField(label: l10n.caDeclineReason, controller: _reason),
              SecondaryButton(
                label: l10n.caSendDecline,
                onPressed: () => Navigator.of(context).pop(_reason.text),
              ),
              TextLink(
                label: l10n.caCancel,
                onTap: () => Navigator.of(context).pop(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class BookingsView extends StatelessWidget {
  const BookingsView({
    super.key,
    required this.state,
    required this.onRetry,
    required this.onConfirm,
    required this.onDecline,
    required this.onDeliver,
    required this.onMarkRead,
    required this.onCalendar,
    this.only,
  });

  final BookingsState state;
  final String? only;
  final VoidCallback onRetry;
  final ValueChanged<String> onConfirm;
  final ValueChanged<String> onDecline;
  final ValueChanged<String> onDeliver;
  final ValueChanged<String> onMarkRead;
  final VoidCallback onCalendar;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      BookingsLoading() => const CreatorLoading(),
      BookingsFailed(:final failure) => creatorFailure(failure, onRetry),
      final BookingsLoaded s => _Loaded(view: this, state: s),
    };
  }
}

class _Loaded extends StatelessWidget {
  const _Loaded({required this.view, required this.state});

  final BookingsView view;
  final BookingsLoaded state;

  bool _shown(BookingRequest r) => view.only == null || r.ref == view.only;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final waiting = state.waiting.where(_shown).toList();
    final lapsed = state.lapsed.where(_shown).toList();
    final upcoming = state.bookings.upcoming.where(_shown).toList();
    final done = state.bookings.done.where(_shown).toList();
    final unread = view.only == null ? state.unread : const <BookingUpdate>[];
    final empty =
        waiting.isEmpty &&
        lapsed.isEmpty &&
        upcoming.isEmpty &&
        done.isEmpty &&
        unread.isEmpty;
    return CreatorShell(
      child: CreatorBody(
        children: [
          CreatorTitle(l10n.caBookings),
          if (state.failure != null) FailureLine(state.failure!),
          if (empty)
            EmptyState(
              mark: ShootIcon(
                ShootIcons.calendar,
                size: 24,
                color: context.colors.mute,
              ),
              title: l10n.caBookings,
              body: l10n.caNoRequests,
            ),
          if (unread.isNotEmpty) ...[
            GroupText(l10n.caUpdates),
            ShootPanel(
              padding: const EdgeInsetsDirectional.symmetric(horizontal: 12),
              child: Column(
                children: [
                  for (final (i, u) in unread.indexed)
                    ShootRow(
                      label: _updateText(context, u),
                      chevron: false,
                      link: false,
                      divider: i == 0 ? RowDivider.none : RowDivider.top,
                      minHeight: 52,
                      trailing: TextLink(
                        label: l10n.caMarkRead,
                        onTap: () => view.onMarkRead(u.id),
                      ),
                      onTap: null,
                    ),
                ],
              ),
            ),
          ],
          if (waiting.isNotEmpty) ...[
            GroupText(l10n.caWaitingForYou),
            for (final (i, r) in waiting.indexed)
              _RequestCard(
                request: r,
                primary: i == 0,
                busy: state.busyRef == r.ref,
                onConfirm: () => view.onConfirm(r.ref),
                onDecline: () => view.onDecline(r.ref),
              ),
          ],
          for (final r in lapsed)
            MetaText('${r.occasion} · ${l10n.caLapsedLine}'),
          if (upcoming.isNotEmpty) ...[
            GroupText(l10n.caComingUp),
            for (final r in upcoming)
              _RequestCard(
                request: r,
                busy: state.busyRef == r.ref,
                onDeliver: r.canDeliver ? () => view.onDeliver(r.ref) : null,
              ),
          ],
          if (done.isNotEmpty) ...[
            GroupText(l10n.caDoneGroup),
            for (final r in done) _RequestCard(request: r),
          ],
          ShootPanel(
            padding: const EdgeInsetsDirectional.symmetric(horizontal: 12),
            child: ShootRow(
              label: l10n.caCalendarStatus,
              trailing: MetaText(l10n.caAvailability),
              onTap: view.onCalendar,
            ),
          ),
        ],
      ),
    );
  }

  String _updateText(BuildContext context, BookingUpdate u) {
    final l10n = context.l10n;
    final request = [
      ...state.bookings.waiting,
      ...state.bookings.upcoming,
      ...state.bookings.done,
    ].where((r) => r.ref == u.ref).firstOrNull;
    if (u.event == 'accepted' && request != null) {
      return l10n.caUpdateAccepted(formatDay(context, request.date));
    }
    return l10n.caUpdateOther(u.ref ?? '');
  }
}

/// One request: what, where, when, which profession, for whom, the reference and the deadline.
/// Never a phone number (FR-045).
class _RequestCard extends StatelessWidget {
  const _RequestCard({
    required this.request,
    this.primary = false,
    this.busy = false,
    this.onConfirm,
    this.onDecline,
    this.onDeliver,
  });

  final BookingRequest request;
  final bool primary;
  final bool busy;
  final VoidCallback? onConfirm;
  final VoidCallback? onDecline;
  final VoidCallback? onDeliver;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final r = request;
    return ShootPanel(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 8,
        children: [
          Text(r.occasion, style: ShootType.heading.copyWith(color: c.ink)),
          if (r.respondBy != null && r.answer == RequestAnswer.pending)
            StatusBadge(
              label: l10n.caAnswerBy(formatTime(context, r.respondBy!)),
              tone: BadgeTone.attention,
            ),
          MetaText(
            '${formatDay(context, r.date)} · '
            '${l10n.caProfessionLine(r.profession, r.emirate)}',
          ),
          MetaText(
            [
              l10n.caClientName(r.client),
              if (r.quotation != null) l10n.caQuotationRef(r.quotation!),
            ].join(' · '),
          ),
          if (r.paid)
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: StatusBadge(label: l10n.caPaid, tone: BadgeTone.success),
            ),
          if (onConfirm != null)
            primary
                ? TopHit(
                    label: l10n.caConfirm,
                    loading: busy,
                    onPressed: busy ? null : onConfirm,
                  )
                : SecondaryButton(
                    label: l10n.caConfirm,
                    onPressed: busy ? null : onConfirm,
                  ),
          if (onDecline != null)
            SecondaryButton(
              label: l10n.caDecline,
              onPressed: busy ? null : onDecline,
            ),
          if (onDeliver != null)
            SecondaryButton(
              label: l10n.caMarkDelivered,
              onPressed: busy ? null : onDeliver,
            ),
        ],
      ),
    );
  }
}
