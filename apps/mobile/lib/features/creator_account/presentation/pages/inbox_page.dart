import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/empty_state.dart';
import 'package:shoot_mobile/core/widgets/secondary_button.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/core/widgets/status_badge.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/inbox.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/inbox_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/widgets/creator_parts.dart';
import 'package:shoot_mobile/features/creator_account/presentation/widgets/reject_sheet.dart';

/// The creator brief inbox at `/account/inbox` (feature 019), built to board
/// `S07e-creator-inbox`. Only the first waiting brief carries the red action.
class InboxPage extends StatelessWidget {
  const InboxPage({super.key, required this.create, this.onShown});

  final InboxCubit Function() create;

  /// Called once the screen is shown (the push permission ask, research R7).
  final VoidCallback? onShown;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) {
        final cubit = create();
        unawaited(cubit.load());
        onShown?.call();
        return cubit;
      },
      child: BlocBuilder<InboxCubit, InboxState>(
        builder: (context, state) {
          final cubit = context.read<InboxCubit>();
          return InboxView(
            state: state,
            onRetry: cubit.load,
            onAccept: cubit.accept,
            onReject: (item) async {
              final s = cubit.state;
              final reasons = s is InboxLoaded
                  ? s.inbox.reasons
                  : const <RejectReason>[];
              final answer = await showRejectSheet(
                context,
                item: item,
                reasons: reasons,
              );
              if (answer != null) {
                await cubit.reject(
                  item,
                  reason: answer.reason,
                  note: answer.note,
                );
              }
            },
            onWithdraw: cubit.withdraw,
          );
        },
      ),
    );
  }
}

class InboxView extends StatelessWidget {
  const InboxView({
    super.key,
    required this.state,
    required this.onRetry,
    required this.onAccept,
    required this.onReject,
    required this.onWithdraw,
  });

  final InboxState state;
  final VoidCallback onRetry;
  final ValueChanged<BriefItem> onAccept;
  final ValueChanged<BriefItem> onReject;
  final ValueChanged<BriefItem> onWithdraw;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      InboxLoading() => const CreatorLoading(),
      InboxFailed(:final failure) => creatorFailure(failure, onRetry),
      final InboxLoaded s => _Loaded(view: this, state: s),
    };
  }
}

class _Loaded extends StatelessWidget {
  const _Loaded({required this.view, required this.state});

  final InboxView view;
  final InboxLoaded state;

  String _when(BuildContext context, BriefItem i) =>
      i.date == null ? context.l10n.inboxAnyDate : formatDay(context, i.date!);

  String _outcome(BuildContext context, BriefOutcome o) => switch (o) {
    BriefOutcome.open => context.l10n.inboxOutcomeOpen,
    BriefOutcome.otherCreator => context.l10n.inboxOutcomeOther,
    BriefOutcome.bookedYou => context.l10n.inboxOutcomeBooked,
    BriefOutcome.closed => context.l10n.inboxOutcomeClosed,
  };

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final inbox = state.inbox;
    return CreatorShell(
      child: CreatorBody(
        children: [
          CreatorTitle(l10n.inboxTitle),
          MetaText(l10n.inboxIntro),
          if (state.failure != null) FailureLine(state.failure!),
          GroupText(l10n.inboxWaiting),
          if (inbox.open.isEmpty)
            EmptyState(
              mark: ShootIcon(
                ShootIcons.calendar,
                size: 24,
                color: context.colors.mute,
              ),
              title: l10n.inboxTitle,
              body: l10n.inboxEmpty,
            ),
          for (final (i, item) in inbox.open.indexed)
            _BriefCard(
              item: item,
              when: _when(context, item),
              primary: i == 0,
              busy: state.busyKey == item.key,
              onAccept: () => view.onAccept(item),
              onReject: () => view.onReject(item),
            ),
          if (inbox.accepted.isNotEmpty) ...[
            GroupText(l10n.inboxSaidYes),
            ShootPanel(
              padding: const EdgeInsetsDirectional.symmetric(horizontal: 12),
              child: Column(
                children: [
                  for (final (i, item) in inbox.accepted.indexed)
                    ShootRow(
                      label: '${item.occasion} · ${_when(context, item)}',
                      chevron: false,
                      link: false,
                      divider: i == 0 ? RowDivider.none : RowDivider.top,
                      minHeight: 60,
                      trailing: item.outcome == BriefOutcome.open
                          ? TextLink(
                              label: l10n.inboxWithdraw,
                              onTap: state.busyKey == null
                                  ? () => view.onWithdraw(item)
                                  : null,
                            )
                          : StatusBadge(
                              label: _outcome(context, item.outcome),
                              tone: BadgeTone.neutral,
                            ),
                      onTap: null,
                    ),
                ],
              ),
            ),
          ],
          if (inbox.rejected.isNotEmpty) ...[
            GroupText(l10n.inboxNotForYou),
            ShootPanel(
              padding: const EdgeInsetsDirectional.symmetric(horizontal: 12),
              child: Column(
                children: [
                  for (final (i, item) in inbox.rejected.indexed)
                    ShootRow(
                      label:
                          '${item.occasion} · ${inbox.reasonLabel(item.reason) ?? _when(context, item)}',
                      chevron: false,
                      link: false,
                      divider: i == 0 ? RowDivider.none : RowDivider.top,
                      minHeight: 60,
                      trailing: item.outcome == BriefOutcome.open
                          ? TextLink(
                              label: l10n.inboxUndo,
                              onTap: state.busyKey == null
                                  ? () => view.onWithdraw(item)
                                  : null,
                            )
                          : null,
                      onTap: null,
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// One open brief: what and where, when, which profession, when it was sent and its reference.
/// Never anything about the client (FR-004).
class _BriefCard extends StatelessWidget {
  const _BriefCard({
    required this.item,
    required this.when,
    required this.primary,
    required this.busy,
    required this.onAccept,
    required this.onReject,
  });

  final BriefItem item;
  final String when;
  final bool primary;
  final bool busy;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    return ShootPanel(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: 8,
        children: [
          Text(
            '${item.occasion} · ${item.emirate}',
            style: ShootType.heading.copyWith(color: c.ink),
          ),
          MetaText('$when · ${item.profession}'),
          MetaText(
            '${l10n.inboxSent(formatDay(context, item.sentAt.toLocal()))} · ${item.ref}',
          ),
          Row(
            spacing: 8,
            children: [
              Expanded(
                flex: 7,
                child: primary
                    ? TopHit(
                        label: l10n.inboxAccept,
                        loading: busy,
                        onPressed: busy ? null : onAccept,
                      )
                    : SecondaryButton(
                        label: l10n.inboxAccept,
                        onPressed: busy ? null : onAccept,
                      ),
              ),
              Expanded(
                flex: 5,
                child: SecondaryButton(
                  label: l10n.inboxReject,
                  onPressed: busy ? null : onReject,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
