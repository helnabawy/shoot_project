import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/icon_tile.dart';
import 'package:shoot_mobile/core/widgets/money.dart';
import 'package:shoot_mobile/core/widgets/progress_bar.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/core/widgets/status_badge.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/account_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/widgets/creator_parts.dart';

/// Screen 27 at `/account` (a creator's), built to board `S07c-account-creator`.
class AccountPage extends StatelessWidget {
  const AccountPage({super.key, required this.create, this.onShown});

  final AccountCubit Function() create;

  /// Called once after the screen first shows (the push permission ask, so a creator hears about
  /// requests and briefs without opening the inbox first).
  final void Function(BuildContext context)? onShown;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (context) {
        final cubit = create();
        unawaited(cubit.load());
        if (onShown case final shown?) {
          WidgetsBinding.instance.addPostFrameCallback((_) {
            if (context.mounted) shown(context);
          });
        }
        return cubit;
      },
      child: BlocBuilder<AccountCubit, AccountState>(
        builder: (context, state) => AccountView(
          state: state,
          onRetry: context.read<AccountCubit>().load,
          onOpen: (path) async {
            await context.push(path);
            if (context.mounted) await context.read<AccountCubit>().load();
          },
          onLogOut: () => context.read<SessionCubit>().signOut(),
        ),
      ),
    );
  }
}

/// Renders any [AccountState]; navigation goes through [onOpen].
class AccountView extends StatelessWidget {
  const AccountView({
    super.key,
    required this.state,
    required this.onRetry,
    required this.onOpen,
    required this.onLogOut,
  });

  final AccountState state;
  final VoidCallback onRetry;
  final void Function(String path) onOpen;
  final VoidCallback onLogOut;

  @override
  Widget build(BuildContext context) {
    return switch (state) {
      AccountLoading() => const CreatorLoading(),
      AccountFailed(:final failure) => creatorFailure(failure, onRetry),
      final AccountLoaded loaded => _Loaded(
        loaded: loaded,
        onOpen: onOpen,
        onLogOut: onLogOut,
      ),
    };
  }
}

class _Loaded extends StatelessWidget {
  const _Loaded({
    required this.loaded,
    required this.onOpen,
    required this.onLogOut,
  });

  final AccountLoaded loaded;
  final void Function(String path) onOpen;
  final VoidCallback onLogOut;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final a = loaded.account;
    final badge = statusBadge(context, a.status);
    final professions = a.professions.join(' · ');
    final meta = [
      if (professions.isNotEmpty) professions,
      if (a.code != null) a.code!,
    ].join(' · ');
    return CreatorShell(
      onBack: () => GoRouter.of(context).go(AppRoutes.home),
      child: CreatorBody(
        children: [
          CreatorTitle(a.name, meta: meta.isEmpty ? null : meta),
          GroupText(l10n.caUpNext),
          _UpNext(loaded: loaded, onOpen: onOpen),
          GroupText(l10n.caInYourAccount),
          ShootPanel(
            padding: const EdgeInsetsDirectional.symmetric(horizontal: 12),
            child: Column(
              children: [
                ShootRow(
                  label: l10n.caBookings,
                  trailing: MetaText(
                    a.waitingCount == 0 && a.upcomingCount == 0
                        ? l10n.caNoneYet
                        : l10n.caBookingsCounts(
                            a.waitingCount,
                            a.upcomingCount,
                          ),
                  ),
                  onTap: () => onOpen(AppRoutes.accountBookings),
                ),
                ShootRow(
                  label: l10n.caMyProfile,
                  trailing: MetaText(
                    a.status == ProfileStatus.draft
                        ? l10n.caStatusDraftPercent(a.strength)
                        : l10n.caStatusPercent(badge.label, a.strength),
                  ),
                  onTap: () => onOpen(AppRoutes.accountProfile),
                  divider: RowDivider.top,
                ),
                ShootRow(
                  label: l10n.caAvailability,
                  trailing: MetaText(
                    a.blockedDays == 0
                        ? l10n.caFreeEveryDay
                        : l10n.caBlockedDaysStatus(a.blockedDays),
                  ),
                  onTap: () => onOpen(AppRoutes.accountAvailability),
                  divider: RowDivider.top,
                ),
                ShootRow(
                  label: l10n.caViewPublic,
                  trailing: MetaText(
                    a.status.isPublic
                        ? l10n.caPublicProfileLive
                        : l10n.caOnlyYouUntilLive,
                  ),
                  onTap: a.code == null
                      ? null
                      : () => onOpen('/creators/${a.code}'),
                  divider: RowDivider.top,
                ),
                ShootRow(
                  label: l10n.caLogOut,
                  chevron: false,
                  link: false,
                  labelStyle: ShootType.row.copyWith(color: c.ink),
                  onTap: onLogOut,
                  divider: RowDivider.top,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// "Up next": one item and its primary action (FR-002, FR-051).
class _UpNext extends StatelessWidget {
  const _UpNext({required this.loaded, required this.onOpen});

  final AccountLoaded loaded;
  final void Function(String path) onOpen;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final a = loaded.account;
    final badge = statusBadge(context, a.status);
    final children = switch (loaded.upNext) {
      UpNextKind.finishProfile => <Widget>[
        Wrap(
          spacing: 8,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            StatusBadge(label: badge.label, tone: badge.tone),
            MetaText(l10n.caStrengthValue(a.strength)),
          ],
        ),
        ProgressBar(
          value: a.strength / 100,
          label: l10n.caProfileStrengthLabel,
        ),
        Text(
          l10n.caProfileIncompleteTitle,
          style: ShootType.heading.copyWith(color: context.colors.ink),
        ),
        for (final need in a.needs.where((n) => n.required.isNotEmpty))
          MetaText(
            l10n.caNeedsLine(
              stepName(context, need.step),
              needText(context, need.required.first),
            ),
          ),
        TopHit(
          label: l10n.caFinishProfile,
          chevron: true,
          onPressed: () => onOpen(AppRoutes.accountProfile),
        ),
      ],
      UpNextKind.answerRequest => <Widget>[
        _UpNextHead(
          icon: ShootIcons.calendar,
          title: l10n.caAnswerRequestTitle,
          badge: a.waiting!.respondBy == null
              ? null
              : StatusBadge(
                  label: l10n.caAnswerBy(
                    formatTime(context, a.waiting!.respondBy!),
                  ),
                  tone: BadgeTone.attention,
                ),
        ),
        if (a.waiting!.occasion.isNotEmpty)
          Text(
            a.waiting!.occasion,
            style: ShootType.body.copyWith(color: context.colors.ink),
          ),
        TopHit(
          label: l10n.caAnswerRequestAction,
          chevron: true,
          onPressed: () => onOpen(AppRoutes.accountBookings),
        ),
      ],
      UpNextKind.briefs => <Widget>[
        _UpNextHead(
          icon: ShootIcons.search,
          title: l10n.caBriefsTitle(a.briefs!.count),
          meta: [
            if (a.briefs!.soonest?.date case final d?)
              formatDay(context, d)
            else
              l10n.inboxAnyDate,
            if (a.briefs!.soonest?.emirate case final e? when e.isNotEmpty) e,
          ].join(' · '),
        ),
        if (a.briefs!.soonest case final s?)
          MetaText(
            [s.profession, s.occasion].where((t) => t.isNotEmpty).join(' · '),
          ),
        // 022 (board 53): the client's price, so the creator knows what is being asked before opening it.
        if (a.briefs!.budgetFils case final fils?)
          MetaText(l10n.caBriefsPrice(Money.format(fils / 100))),
        TopHit(
          label: l10n.caBriefsAction(a.briefs!.count),
          chevron: true,
          onPressed: () => onOpen(AppRoutes.accountInbox),
        ),
      ],
      UpNextKind.markDelivered => <Widget>[
        _UpNextHead(icon: ShootIcons.check, title: l10n.caMarkDeliveredTitle),
        TopHit(
          label: l10n.caMarkDeliveredAction,
          chevron: true,
          onPressed: () => onOpen(AppRoutes.accountBookings),
        ),
      ],
      UpNextKind.none => <Widget>[
        Text(
          l10n.caNothingNext,
          style: ShootType.heading.copyWith(color: context.colors.ink),
        ),
      ],
    };
    return ShootPanel(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (i, child) in children.indexed) ...[
            if (i > 0) const SizedBox(height: 14),
            child,
          ],
        ],
      ),
    );
  }
}

/// The head of an Up next panel: what it is about as a tile, the title, then its deadline or
/// where and when.
class _UpNextHead extends StatelessWidget {
  const _UpNextHead({
    required this.icon,
    required this.title,
    this.badge,
    this.meta,
  });

  final ShootIcons icon;
  final String title;
  final Widget? badge;
  final String? meta;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      spacing: 12,
      children: [
        IconTile(icon, size: 40, iconSize: 20, strokeWidth: 2),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            spacing: 6,
            children: [
              Text(
                title,
                style: ShootType.heading.copyWith(color: context.colors.ink),
              ),
              ?badge,
              if (meta case final m? when m.isNotEmpty) MetaText(m),
            ],
          ),
        ),
      ],
    );
  }
}
