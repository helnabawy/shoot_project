import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/auth/safe_next.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/empty_state.dart';
import 'package:shoot_mobile/core/widgets/icon_tile.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/features/creator_account/presentation/widgets/creator_parts.dart';
import 'package:shoot_mobile/features/notifications/domain/entities/notice.dart';
import 'package:shoot_mobile/features/notifications/presentation/cubit/notifications_cubit.dart';

/// `/account/notifications` (feature 024): the member's latest notices, the new ones first under
/// "New", the rest under "Earlier". A tap marks one read and opens what it is about. Moved here from
/// the creator's Bookings screen ("Updates") and opened from the menu's settings.
class NotificationsPage extends StatelessWidget {
  const NotificationsPage({super.key, required this.create});

  final NotificationsCubit Function() create;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) {
        final cubit = create();
        unawaited(cubit.load());
        return cubit;
      },
      child: BlocBuilder<NotificationsCubit, NotificationsState>(
        builder: (context, state) {
          final cubit = context.read<NotificationsCubit>();
          return NotificationsView(
            state: state,
            onRetry: cubit.load,
            onOpen: (notice) {
              unawaited(cubit.markRead(notice));
              final target = noticeTarget(notice);
              if (target != null) unawaited(context.push(target));
            },
          );
        },
      ),
    );
  }
}

/// Where a notice leads: a creator's booking opens on their Bookings screen; otherwise the path the
/// server gave when the app knows it; a creator's brief notice opens the inbox; else nowhere.
String? noticeTarget(Notice notice) {
  final ref = notice.ref;
  if (notice.audience == NoticeAudience.creator &&
      !notice.aboutBrief &&
      ref != null &&
      ref.isNotEmpty) {
    return '${AppRoutes.accountBookings}/${Uri.encodeComponent(ref)}';
  }
  if (safeNext(notice.path) case final path?) return path;
  if (notice.audience == NoticeAudience.creator && notice.aboutBrief) {
    return AppRoutes.accountInbox;
  }
  return null;
}

/// The words for a notice, from its event (FR-004).
String noticeText(AppLocalizations l10n, Notice n) {
  final ref = n.ref ?? '';
  final creator = n.audience == NoticeAudience.creator;
  if (ref.isEmpty && !n.aboutBrief) {
    return switch (n.event) {
      'brief-new' => l10n.caNoticeBrief,
      _ => l10n.ntOther,
    };
  }
  return switch (n.event) {
    'quoted' => l10n.ntQuoted(ref),
    'accepted' || 'reassigned' when creator => l10n.ntRequest(ref),
    'accepted' => l10n.ntAcceptedClient(ref),
    'confirmed' => l10n.ntConfirmed(ref),
    'declined' => l10n.ntDeclined(ref),
    'lapsed' => l10n.ntLapsed(ref),
    'adjusted' => l10n.ntAdjusted(ref),
    'paid' => l10n.caNoticePaid(ref),
    'scheduled' => l10n.ntScheduled(ref),
    'delivered' => l10n.ntDelivered(ref),
    'completed' => l10n.caNoticeCompleted(ref),
    'on-hold' => l10n.ntOnHold(ref),
    'cancelled' => l10n.caNoticeCancelled(ref),
    'expired' => l10n.ntExpired(ref),
    'brief-new' => l10n.caNoticeBrief,
    'brief-accepted' => l10n.ntBriefAccepted,
    'offer-new' => l10n.ntOfferNew,
    'offer-declined' => l10n.ntOfferDeclined,
    'offer-lost' => l10n.ntOfferLost,
    _ when n.aboutBrief => l10n.ntOther,
    _ => l10n.caUpdateOther(ref),
  };
}

ShootIcons _icon(Notice n) => switch (n.event) {
  _ when n.aboutBrief => ShootIcons.search,
  'paid' || 'completed' || 'delivered' || 'confirmed' => ShootIcons.check,
  'cancelled' || 'declined' || 'expired' || 'lapsed' => ShootIcons.close,
  'quoted' || 'adjusted' => ShootIcons.document,
  _ => ShootIcons.calendar,
};

class NotificationsView extends StatelessWidget {
  const NotificationsView({
    super.key,
    required this.state,
    required this.onRetry,
    required this.onOpen,
  });

  final NotificationsState state;
  final VoidCallback onRetry;

  /// A notice was tapped: mark it read and open what it is about.
  final ValueChanged<Notice> onOpen;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      NotificationsLoading() => const CreatorLoading(),
      NotificationsFailed(:final failure) => creatorFailure(failure, onRetry),
      final NotificationsLoaded s => _Loaded(state: s, onOpen: onOpen),
    };
  }
}

class _Loaded extends StatelessWidget {
  const _Loaded({required this.state, required this.onOpen});

  final NotificationsLoaded state;
  final ValueChanged<Notice> onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final unread = state.unread;
    final earlier = state.earlier;
    return CreatorShell(
      child: CreatorBody(
        children: [
          CreatorTitle(l10n.ntTitle),
          if (state.failure != null) FailureLine(state.failure!),
          if (unread.isEmpty && earlier.isEmpty)
            EmptyState(
              mark: ShootIcon(
                ShootIcons.bell,
                size: 24,
                color: context.colors.mute,
              ),
              title: l10n.ntEmptyTitle,
              body: l10n.ntEmptyBody,
            ),
          if (unread.isNotEmpty) ...[
            GroupText(l10n.ntNew),
            _NoticePanel(notices: unread, onOpen: onOpen),
          ],
          if (earlier.isNotEmpty) ...[
            GroupText(l10n.ntEarlier),
            _NoticePanel(notices: earlier, onOpen: onOpen),
          ],
        ],
      ),
    );
  }
}

class _NoticePanel extends StatelessWidget {
  const _NoticePanel({required this.notices, required this.onOpen});

  final List<Notice> notices;
  final ValueChanged<Notice> onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return ShootPanel(
      padding: const EdgeInsetsDirectional.symmetric(horizontal: 12),
      child: Column(
        children: [
          for (final (i, n) in notices.indexed)
            Semantics(
              key: ValueKey('notice:${n.id}'),
              label: n.read ? null : l10n.ntUnreadLabel(noticeText(l10n, n)),
              excludeSemantics: !n.read,
              button: !n.read,
              child: ShootRow(
                leading: IconTile(_icon(n)),
                label: noticeText(l10n, n),
                labelStyle: n.read
                    ? null
                    : ShootType.row.copyWith(fontWeight: FontWeight.w600),
                trailing: MetaText(formatTime(context, n.createdAt)),
                chevron: noticeTarget(n) != null,
                divider: i == 0 ? RowDivider.none : RowDivider.top,
                minHeight: 56,
                onTap: () => onOpen(n),
              ),
            ),
        ],
      ),
    );
  }
}
