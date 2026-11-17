import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/empty_state.dart';
import 'package:shoot_mobile/core/widgets/money.dart';
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
import 'package:shoot_mobile/features/creator_account/presentation/widgets/offer_sheet.dart';
import 'package:shoot_mobile/features/creator_account/presentation/widgets/reject_sheet.dart';

/// The creator brief inbox at `/account/inbox` (feature 019), built to board
/// `S07e-creator-inbox`. Only the first waiting brief carries the red action.
class InboxPage extends StatelessWidget {
  const InboxPage({super.key, required this.create, this.onShown});

  final InboxCubit Function() create;

  /// Called once after the screen first shows (the push permission ask, research R7).
  final void Function(BuildContext context)? onShown;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final cubit = create();
        // 022: the inbox stays live while it is open (FR-023).
        unawaited(cubit.load().then((_) => cubit.startLive()));
        if (onShown case final shown?) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (context.mounted) shown(context);
          });
        }
        return cubit;
      },
      child: BlocBuilder<InboxCubit, InboxState>(
        builder: (context, state) {
          final cubit = context.read<InboxCubit>();
          return InboxView(
            state: state,
            onRetry: cubit.load,
            onAccept: cubit.accept,
            onOffer: (item) async {
              final amount = await showOfferSheet(context, item: item);
              if (amount != null) await cubit.accept(item, amountFils: amount);
            },
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
    this.onOffer,
  });

  final InboxState state;
  final VoidCallback onRetry;
  final ValueChanged<BriefItem> onAccept;

  /// 022: open the offer sheet for an offers brief.
  final ValueChanged<BriefItem>? onOffer;
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
              onOffer: view.onOffer == null ? null : () => view.onOffer!(item),
            ),
          if (inbox.accepted.isNotEmpty) ...[
            GroupText(
              inbox.accepted.any((i) => i.offer?.offerFils != null)
                  ? l10n.inboxOfferYouOffered
                  : l10n.inboxSaidYes,
            ),
            ShootPanel(
              padding: const EdgeInsetsDirectional.symmetric(horizontal: 12),
              child: Column(
                children: [
                  for (final (i, item) in inbox.accepted.indexed)
                    ShootRow(
                      label: [
                        item.occasion,
                        _when(context, item),
                        if (item.offer?.offerFils case final fils?)
                          Money.format(fils / 100),
                      ].join(' · '),
                      chevron: false,
                      link: false,
                      divider: i == 0 ? RowDivider.none : RowDivider.top,
                      minHeight: 60,
                      trailing: item.offer?.declined == true
                          ? StatusBadge(
                              label: l10n.inboxOfferDeclined,
                              tone: BadgeTone.neutral,
                            )
                          : item.outcome == BriefOutcome.open
                          ? Wrap(
                              spacing: 12,
                              children: [
                                if (item.offer != null &&
                                    item.offer!.revisionsLeft > 0 &&
                                    view.onOffer != null)
                                  TextLink(
                                    label: l10n.inboxOfferChange,
                                    onTap: state.busyKey == null
                                        ? () => view.onOffer!(item)
                                        : null,
                                  ),
                                TextLink(
                                  label: l10n.inboxWithdraw,
                                  onTap: state.busyKey == null
                                      ? () => view.onWithdraw(item)
                                      : null,
                                ),
                              ],
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

/// One open brief, so the creator can decide on the spot: what it is, the client's own words, when,
/// where, as what and when it came in, then the two answers and what each one does. Never anything
/// about who the client is (FR-004).
class _BriefCard extends StatelessWidget {
  const _BriefCard({
    required this.item,
    required this.when,
    required this.primary,
    required this.busy,
    required this.onAccept,
    required this.onReject,
    this.onOffer,
  });

  final BriefItem item;
  final String when;
  final bool primary;
  final bool busy;
  final VoidCallback onAccept;
  final VoidCallback onReject;
  final VoidCallback? onOffer;

  /// 022: "Accept {price}" on an offers brief, "I can do this" otherwise.
  String _acceptLabel(BuildContext context) => switch (item.offer) {
    final offer? => context.l10n.inboxOfferAccept(
      Money.format(offer.budgetFils / 100),
    ),
    null => context.l10n.inboxAccept,
  };

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    return ShootPanel(
      padding: const EdgeInsetsDirectional.fromSTEB(16, 16, 16, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            headingCase(
              item.occasion.isNotEmpty ? item.occasion : item.profession,
            ),
            style: ShootType.heading.copyWith(color: c.ink),
          ),
          if (item.sentence.isNotEmpty) ...[
            const SizedBox(height: 12),
            ClientWords(item.sentence),
          ],
          const SizedBox(height: 8),
          CreatorFact(
            icon: ShootIcons.calendar,
            value: when,
            label: l10n.inboxFactWhen,
          ),
          if (item.offer?.place case final place?)
            CreatorFact(
              icon: ShootIcons.pin,
              value: [
                '${place.area}, ${place.emirate}',
                if (place.distanceKm case final km?)
                  l10n.inboxOfferDistance(km)
                else
                  l10n.inboxOfferSetBase,
              ].join(' · '),
              label: l10n.caFactWhere,
            )
          else if (item.emirate.isNotEmpty)
            CreatorFact(
              icon: ShootIcons.pin,
              value: item.emirate,
              label: l10n.caFactWhere,
            ),
          if (item.profession.isNotEmpty)
            CreatorFact(
              icon: ShootIcons.camera,
              value: item.profession,
              label: l10n.caFactAs,
            ),
          CreatorFact(
            icon: ShootIcons.lines,
            value: '${formatDay(context, item.sentAt.toLocal())} · ${item.ref}',
            label: l10n.inboxFactSent,
          ),
          if (item.offer case final offer?)
            CreatorFact(
              icon: ShootIcons.lines,
              value: Money.format(offer.budgetFils / 100),
              label: l10n.inboxFactPrice,
            ),
          const SizedBox(height: 12),
          if (item.offer != null && onOffer != null) ...[
            SecondaryButton(
              label: l10n.inboxOfferAnother,
              onPressed: busy ? null : onOffer,
            ),
            const SizedBox(height: 8),
          ],
          Row(
            spacing: 8,
            children: [
              Expanded(
                flex: 7,
                child: primary
                    ? TopHit(
                        label: _acceptLabel(context),
                        loading: busy,
                        onPressed: busy ? null : onAccept,
                      )
                    : SecondaryButton(
                        label: _acceptLabel(context),
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
          // Said once, under the first brief: the page intro already says what yes does.
          if (primary) ...[
            const SizedBox(height: 10),
            MetaText(l10n.inboxRejectHint),
          ],
        ],
      ),
    );
  }
}
