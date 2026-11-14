import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/progress_bar.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/core/widgets/status_badge.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/account_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/widgets/creator_parts.dart';

/// Screen 27 at `/account` (a creator's), built to board `S07c-account-creator`.
class AccountPage extends StatelessWidget {
  const AccountPage({super.key, required this.create});

  final AccountCubit Function() create;

  @override
  Widget build(BuildContext context) {
    return BlocProvider(
      create: (_) {
        final cubit = create();
        unawaited(cubit.load());
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
        Text(
          l10n.caAnswerRequestTitle,
          style: ShootType.heading.copyWith(color: context.colors.ink),
        ),
        MetaText(
          [
            a.waiting!.occasion,
            if (a.waiting!.respondBy != null)
              l10n.caAnswerBy(formatTime(context, a.waiting!.respondBy!)),
          ].join(' · '),
        ),
        TopHit(
          label: l10n.caAnswerRequestAction,
          chevron: true,
          onPressed: () => onOpen(AppRoutes.accountBookings),
        ),
      ],
      UpNextKind.briefs => <Widget>[
        MetaText(
          [
            if (a.briefs!.soonest?.date case final d?)
              formatDay(context, d)
            else
              l10n.inboxAnyDate,
            if (a.briefs!.soonest?.emirate case final e? when e.isNotEmpty) e,
          ].join(' · '),
        ),
        Text(
          l10n.caBriefsTitle(a.briefs!.count),
          style: ShootType.heading.copyWith(color: context.colors.ink),
        ),
        if (a.briefs!.soonest case final s?)
          MetaText(
            [s.profession, s.occasion].where((t) => t.isNotEmpty).join(' · '),
          ),
        TopHit(
          label: l10n.caBriefsAction(a.briefs!.count),
          chevron: true,
          onPressed: () => onOpen(AppRoutes.accountInbox),
        ),
      ],
      UpNextKind.markDelivered => <Widget>[
        Text(
          l10n.caMarkDeliveredTitle,
          style: ShootType.heading.copyWith(color: context.colors.ink),
        ),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (final (i, child) in children.indexed) ...[
            if (i > 0) const SizedBox(height: 12),
            child,
          ],
        ],
      ),
    );
  }
}
