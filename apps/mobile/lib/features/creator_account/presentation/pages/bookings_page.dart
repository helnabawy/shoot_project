import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/empty_state.dart';
import 'package:shoot_mobile/core/widgets/icon_tile.dart';
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

/// Screen 32 at `/account/bookings` (and `/account/bookings/:ref` for one booking, opened from a
/// notice or a push), built to board `S07d-creator-bookings`. Each request leads with the day and
/// the client's own words; the request with the nearest deadline carries the one primary action.
class BookingsPage extends StatelessWidget {
  const BookingsPage({super.key, required this.create, this.ref});

  final BookingsCubit Function() create;

  /// Shows only this booking when set.
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
            onOpenUpdate: (update) {
              unawaited(cubit.markRead(update.id));
              final target = updateTarget(update);
              if (target != null) unawaited(context.push(target));
            },
            onAllBookings: () => context.canPop()
                ? context.pop()
                : context.go(AppRoutes.accountBookings),
            onCalendar: () => context.push(AppRoutes.accountAvailability),
          );
        },
      ),
    );
  }
}

/// Where a notice leads: its booking, or the brief inbox for a brief; `null` when it has neither.
String? updateTarget(BookingUpdate update) {
  if (update.ref case final ref? when ref.isNotEmpty) {
    return '${AppRoutes.accountBookings}/${Uri.encodeComponent(ref)}';
  }
  if (update.event.startsWith('brief')) return AppRoutes.accountInbox;
  return null;
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
    required this.onOpenUpdate,
    required this.onCalendar,
    this.onAllBookings,
    this.only,
  });

  final BookingsState state;
  final String? only;
  final VoidCallback onRetry;
  final ValueChanged<String> onConfirm;
  final ValueChanged<String> onDecline;
  final ValueChanged<String> onDeliver;

  /// A notice was tapped: mark it read and open what it is about.
  final ValueChanged<BookingUpdate> onOpenUpdate;
  final VoidCallback onCalendar;

  /// From one opened booking back to the whole list.
  final VoidCallback? onAllBookings;

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
    final one = view.only != null;
    final waiting = state.waiting.where(_shown).toList();
    final lapsed = state.lapsed.where(_shown).toList();
    final upcoming = state.bookings.upcoming.where(_shown).toList();
    final done = state.bookings.done.where(_shown).toList();
    final unread = one ? const <BookingUpdate>[] : state.unread;
    final nothing =
        waiting.isEmpty && lapsed.isEmpty && upcoming.isEmpty && done.isEmpty;
    return CreatorShell(
      child: CreatorBody(
        children: [
          CreatorTitle(one ? l10n.caBookingTitle(view.only!) : l10n.caBookings),
          if (state.failure != null) FailureLine(state.failure!),
          if (nothing && unread.isEmpty)
            EmptyState(
              mark: ShootIcon(
                ShootIcons.calendar,
                size: 24,
                color: context.colors.mute,
              ),
              title: one ? l10n.caBookingTitle(view.only!) : l10n.caBookings,
              body: one ? l10n.caBookingGone : l10n.caNoRequests,
            ),
          if (waiting.isNotEmpty) ...[
            if (!one) GroupText(l10n.caWaitingForYou),
            for (final (i, r) in waiting.indexed)
              _RequestCard(
                request: r,
                primary: i == 0,
                busy: state.busyRef == r.ref,
                onConfirm: () => view.onConfirm(r.ref),
                onDecline: () => view.onDecline(r.ref),
              ),
          ],
          if (unread.isNotEmpty) ...[
            GroupText(l10n.caUpdates),
            ShootPanel(
              padding: const EdgeInsetsDirectional.symmetric(horizontal: 12),
              child: Column(
                children: [
                  for (final (i, u) in unread.indexed)
                    ShootRow(
                      leading: IconTile(_noticeIcon(u)),
                      label: _noticeText(context, u),
                      trailing: MetaText(formatTime(context, u.createdAt)),
                      chevron: updateTarget(u) != null,
                      divider: i == 0 ? RowDivider.none : RowDivider.top,
                      minHeight: 56,
                      onTap: () => view.onOpenUpdate(u),
                    ),
                ],
              ),
            ),
          ],
          for (final r in lapsed)
            MetaText('${formatDay(context, r.date)} · ${l10n.caLapsedLine}'),
          if (upcoming.isNotEmpty) ...[
            if (!one) GroupText(l10n.caComingUp),
            for (final r in upcoming)
              _RequestCard(
                request: r,
                busy: state.busyRef == r.ref,
                onDeliver: r.canDeliver ? () => view.onDeliver(r.ref) : null,
              ),
          ],
          if (done.isNotEmpty) ...[
            if (!one) GroupText(l10n.caDoneGroup),
            for (final r in done) _RequestCard(request: r, quiet: true),
          ],
          ShootPanel(
            padding: const EdgeInsetsDirectional.symmetric(horizontal: 12),
            child: one && view.onAllBookings != null
                ? ShootRow(label: l10n.caAllBookings, onTap: view.onAllBookings)
                : ShootRow(
                    label: l10n.caCalendarStatus,
                    trailing: MetaText(l10n.caAvailability),
                    onTap: view.onCalendar,
                  ),
          ),
        ],
      ),
    );
  }

  ShootIcons _noticeIcon(BookingUpdate u) => switch (u.event) {
    'brief-new' || 'brief-accepted' => ShootIcons.search,
    'paid' || 'completed' => ShootIcons.check,
    'cancelled' => ShootIcons.close,
    _ => ShootIcons.calendar,
  };

  String _noticeText(BuildContext context, BookingUpdate u) {
    final l10n = context.l10n;
    final ref = u.ref ?? '';
    final request = [
      ...state.bookings.waiting,
      ...state.bookings.upcoming,
      ...state.bookings.done,
    ].where((r) => r.ref == u.ref).firstOrNull;
    return switch (u.event) {
      'accepted' || 'reassigned' when request != null => l10n.caNoticeRequest(
        formatDay(context, request.date),
      ),
      'paid' => l10n.caNoticePaid(ref),
      'cancelled' => l10n.caNoticeCancelled(ref),
      'completed' => l10n.caNoticeCompleted(ref),
      'brief-new' => l10n.caNoticeBrief,
      _ => l10n.caUpdateOther(ref),
    };
  }
}

/// One booking, to the point: the day, what the creator must do and by when, the client's own
/// words, then where, for whom, as what and the reference. Never a phone number or a price.
class _RequestCard extends StatelessWidget {
  const _RequestCard({
    required this.request,
    this.primary = false,
    this.busy = false,
    this.quiet = false,
    this.onConfirm,
    this.onDecline,
    this.onDeliver,
  });

  final BookingRequest request;
  final bool primary;
  final bool busy;

  /// A finished booking: the facts only.
  final bool quiet;
  final VoidCallback? onConfirm;
  final VoidCallback? onDecline;
  final VoidCallback? onDeliver;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final r = request;
    final waiting = r.answer == RequestAnswer.pending && r.respondBy != null;
    final badge = waiting
        ? StatusBadge(
            label: l10n.caAnswerBy(formatTime(context, r.respondBy!)),
            tone: BadgeTone.attention,
          )
        : r.paid
        ? StatusBadge(label: l10n.caPaid, tone: BadgeTone.success)
        : r.state == 'confirmed'
        ? StatusBadge(label: l10n.caAwaitingPayment, tone: BadgeTone.neutral)
        : null;
    return ShootPanel(
      padding: const EdgeInsetsDirectional.fromSTEB(16, 16, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            formatDay(context, r.date),
            style: ShootType.heading.copyWith(color: c.ink),
          ),
          if (badge != null) ...[
            const SizedBox(height: 8),
            Align(alignment: AlignmentDirectional.centerStart, child: badge),
          ],
          if (r.occasion.isNotEmpty && !quiet) ...[
            const SizedBox(height: 12),
            ClientWords(r.occasion),
          ],
          const SizedBox(height: 8),
          if (r.emirate.isNotEmpty)
            CreatorFact(
              icon: ShootIcons.pin,
              value: r.emirate,
              label: l10n.caFactWhere,
            ),
          if (r.client.isNotEmpty)
            CreatorFact(
              icon: ShootIcons.person,
              value: r.client,
              label: l10n.caFactClient,
            ),
          if (r.profession.isNotEmpty && !quiet)
            CreatorFact(
              icon: ShootIcons.camera,
              value: r.profession,
              label: l10n.caFactAs,
            ),
          CreatorFact(
            icon: ShootIcons.lines,
            value: r.quotation ?? r.ref,
            label: l10n.caFactReference,
          ),
          if (onConfirm != null) ...[
            const SizedBox(height: 12),
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
            if (primary) ...[
              const SizedBox(height: 8),
              MetaText(l10n.caConfirmHint),
            ],
          ],
          if (onDecline != null) ...[
            const SizedBox(height: 16),
            SecondaryButton(
              label: l10n.caDecline,
              onPressed: busy ? null : onDecline,
            ),
            if (primary) ...[
              const SizedBox(height: 8),
              MetaText(l10n.caDeclineHint),
            ],
          ],
          if (onDeliver != null) ...[
            const SizedBox(height: 12),
            SecondaryButton(
              label: l10n.caMarkDelivered,
              onPressed: busy ? null : onDeliver,
            ),
          ],
        ],
      ),
    );
  }
}
