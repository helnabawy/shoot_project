import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/routing/error_page.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_scene.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/appearance_sheet.dart';
import 'package:shoot_mobile/core/widgets/group_label.dart';
import 'package:shoot_mobile/core/widgets/icon_tile.dart';
import 'package:shoot_mobile/core/widgets/progress_bar.dart';
import 'package:shoot_mobile/core/widgets/scene_tile.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_panel.dart';
import 'package:shoot_mobile/core/widgets/shoot_row.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/status_badge.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/account/domain/entities/account.dart';
import 'package:shoot_mobile/features/account/presentation/account_paths.dart';
import 'package:shoot_mobile/features/account/presentation/cubit/account_cubit.dart';
import 'package:shoot_mobile/features/account/presentation/widgets/account_parts.dart';
import 'package:shoot_mobile/features/account/presentation/widgets/prefs.dart';

/// Screen 24, built to board `S07a-account-client`: who you are, Up next (the one thing that needs
/// you), the places in the account with a status each, your briefs, "Start a brief" and "Log out".
/// A person whose account is a creator's is sent to the creator's account; the first visit after a
/// first booking opens "Finish your account" once (FR-020).
class AccountHomePage extends StatefulWidget {
  const AccountHomePage({super.key});

  @override
  State<AccountHomePage> createState() => _AccountHomePageState();
}

class _AccountHomePageState extends State<AccountHomePage> {
  @override
  void initState() {
    super.initState();
    unawaited(context.read<AccountCubit>().load());
  }

  void _logOut() {
    final router = GoRouter.of(context);
    unawaited(
      context.read<SessionCubit>().signOut().then(
        (_) => router.go(AppRoutes.home),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AccountCubit, AccountState>(
      listenWhen: (a, b) =>
          a.status != b.status && b.status == AccountStatus.ready,
      listener: (context, state) {
        if (state.home?.finishAutoOpen ?? false) {
          context.go(AppRoutes.accountFinish);
        }
      },
      builder: (context, state) {
        if (state.status == AccountStatus.failed) {
          if (state.failure is NotFoundFailure) {
            // A creator's account: feature 014's screens.
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (!mounted) return;
              final profileBuilt = AppRoutes.table.any(
                (r) => r.path == AppRoutes.accountProfile && r.built,
              );
              context.go(
                profileBuilt ? AppRoutes.accountProfile : AppRoutes.home,
              );
            });
            return const ShootScaffold(child: SizedBox.shrink());
          }
          return ErrorPage(
            onRetry: () => unawaited(context.read<AccountCubit>().load()),
          );
        }
        final home = state.home;
        return ShootScaffold(
          child: Column(
            children: [
              const AccountHeader(current: true),
              Expanded(
                child: home == null
                    ? const Center(child: CircularProgressIndicator.adaptive())
                    : RefreshIndicator(
                        onRefresh: () =>
                            context.read<AccountCubit>().load(refresh: true),
                        child: _Body(home: home, onLogOut: _logOut),
                      ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Body extends StatelessWidget {
  const _Body({required this.home, required this.onLogOut});

  final AccountHome home;
  final VoidCallback onLogOut;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final upNext = home.upNext;
    final progress = finishProgress(context, home);
    final briefs = home.briefs;
    // `.mx`: a column with a 28 px gap; "Log out" sits at the bottom (`margin-top: auto`).
    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        SliverPadding(
          padding: const EdgeInsetsDirectional.fromSTEB(12, 24, 12, 0),
          sliver: SliverFillRemaining(
            hasScrollBody: false,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _Person(name: home.name, phone: home.phone),
                const SizedBox(height: 28),
                if (upNext != null) ...[
                  Semantics(
                    container: true,
                    label: l10n.accountUpNext,
                    child: _UpNextCard(upNext: upNext),
                  ),
                  const SizedBox(height: 28),
                ],
                _Section(
                  label: l10n.accountInYourAccount,
                  rows: [
                    _PlaceRow(
                      icon: ShootIcons.document,
                      label: l10n.accountRowBookings,
                      status: _bookingsStatus(context, home),
                      hot: home.bookingsWaiting > 0,
                      onTap: () => context.go(AppRoutes.accountBookings),
                    ),
                    _PlaceRow(
                      icon: ShootIcons.search,
                      label: l10n.accountYourBriefs,
                      status: home.briefsOpen > 0
                          ? l10n.accountOpenCount(home.briefsOpen)
                          : null,
                      onTap: () => context.go(AppRoutes.accountBookings),
                    ),
                    _PlaceRow(
                      icon: ShootIcons.person,
                      label: l10n.accountRowDetails,
                      onTap: () => context.go(AppRoutes.accountFinish),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          SizedBox(
                            width: 56,
                            child: ProgressBar(
                              value: progress.done / progress.total,
                              label: l10n.finishProgressLabel,
                              thickness: 4,
                            ),
                          ),
                          const SizedBox(width: ShootSpace.s2),
                          Text(
                            l10n.accountProgress(progress.done, progress.total),
                            style: ShootType.num(
                              ShootType.meta.copyWith(color: c.mute),
                            ),
                          ),
                        ],
                      ),
                    ),
                    _PlaceRow(
                      icon: ShootIcons.globe,
                      label: l10n.accountRowPreferences,
                      status: prefsStatus(context),
                      onTap: () => unawaited(showAppearanceSheet(context)),
                    ),
                  ],
                ),
                const SizedBox(height: 28),
                _Section(
                  label: l10n.accountYourBriefs,
                  empty: briefs.isEmpty
                      ? Padding(
                          padding: const EdgeInsetsDirectional.fromSTEB(
                            12,
                            0,
                            12,
                            8,
                          ),
                          child: Text(
                            l10n.accountBriefsEmpty,
                            style: ShootType.meta.copyWith(color: c.mute),
                          ),
                        )
                      : null,
                  rows: [
                    for (final b in briefs)
                      BriefRow(
                        brief: b,
                        onTap: () => context.go(
                          b.bookingReference == null
                              ? AppRoutes.accountBookings
                              : bookingPath(b.bookingReference!),
                        ),
                      ),
                  ],
                ),
                if (upNext == null)
                  Padding(
                    padding: const EdgeInsetsDirectional.only(
                      top: ShootSpace.s3,
                    ),
                    child: TopHit(
                      label: l10n.accountStartBrief,
                      chevron: true,
                      onPressed: () => context.go(AppRoutes.home),
                    ),
                  )
                else
                  Padding(
                    padding: const EdgeInsetsDirectional.symmetric(
                      horizontal: 12,
                    ),
                    child: Align(
                      alignment: AlignmentDirectional.centerStart,
                      child: TextLink(
                        label: l10n.accountStartBrief,
                        style: ShootType.chip.copyWith(
                          fontWeight: FontWeight.w500,
                        ),
                        onTap: () => context.go(AppRoutes.home),
                      ),
                    ),
                  ),
                const SizedBox(height: 28),
                const Spacer(),
                Container(
                  decoration: BoxDecoration(
                    border: Border(top: BorderSide(color: c.hair)),
                  ),
                  padding: const EdgeInsetsDirectional.fromSTEB(4, 0, 4, 18),
                  alignment: AlignmentDirectional.centerStart,
                  child: _LogOut(onTap: onLogOut),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  String? _bookingsStatus(BuildContext context, AccountHome home) {
    final l10n = context.l10n;
    if (home.bookingsWaiting > 0) {
      return l10n.accountWaitingForYou(home.bookingsWaiting);
    }
    if (home.bookingsOpen > 0) return l10n.accountOpenCount(home.bookingsOpen);
    return null;
  }
}

/// A group of `.rows` under its label: the label inset 12 (the section's padding), the rows full
/// width (`margin: 0 -12px`) between hairlines.
class _Section extends StatelessWidget {
  const _Section({required this.label, required this.rows, this.empty});

  final String label;
  final List<Widget> rows;
  final Widget? empty;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        GroupLabel(
          label,
          padding: const EdgeInsetsDirectional.fromSTEB(12, 0, 12, 8),
        ),
        ?empty,
        if (rows.isNotEmpty)
          DecoratedBox(
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: c.hair)),
            ),
            child: Padding(
              padding: const EdgeInsetsDirectional.only(top: 1),
              child: Column(children: rows),
            ),
          ),
      ],
    );
  }
}

/// "Log out": a 16 px door and the words in `ink`, 15 px, at least 44 high.
class _LogOut extends StatelessWidget {
  const _LogOut({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      child: InkWell(
        key: const ValueKey('account:logOut'),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 44),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              ShootIcon(
                ShootIcons.logOut,
                size: 16,
                strokeWidth: 2.2,
                color: c.ink,
              ),
              const SizedBox(width: ShootSpace.s2),
              Text(
                context.l10n.accountLogOut,
                style: ShootType.chip.copyWith(color: c.ink),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Person extends StatelessWidget {
  const _Person({required this.name, required this.phone});

  final String? name;
  final String? phone;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    return Padding(
      padding: const EdgeInsetsDirectional.symmetric(horizontal: 4),
      child: Semantics(
        container: true,
        child: Row(
          children: [
            SizedBox.square(
              dimension: 52,
              child: SceneTile(
                radius: ShootRadius.photoLarge,
                child: ShootIcon(
                  ShootIcons.person,
                  size: 24,
                  strokeWidth: 1.8,
                  color: context.scene.sceneInk,
                ),
              ),
            ),
            const SizedBox(width: ShootSpace.s3),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name ?? l10n.accountNameFallback,
                    style: ShootType.title.copyWith(color: c.ink, height: 1.2),
                  ),
                  Padding(
                    padding: const EdgeInsetsDirectional.only(top: 2),
                    child: Text.rich(
                      TextSpan(
                        children: [
                          if (phone != null) ...[
                            TextSpan(text: ltrIsolate(formatPhone(phone!))),
                            const TextSpan(text: ' · '),
                          ],
                          TextSpan(text: l10n.accountClient),
                        ],
                      ),
                      style: ShootType.num(ShootType.meta)
                          .copyWith(color: c.mute),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

String _upNextTitle(
  BuildContext context,
  UpNextKind kind,
  BookingStatus status,
) {
  final l10n = context.l10n;
  return switch (kind) {
    UpNextKind.quote => l10n.upNextQuoteTitle,
    UpNextKind.delivery => l10n.upNextDeliveryTitle,
    UpNextKind.payment => l10n.upNextPaymentTitle,
    UpNextKind.declined => l10n.upNextDeclinedTitle,
    UpNextKind.unknown => bookingStatusLabel(context, status),
  };
}

String _upNextAction(BuildContext context, UpNextKind kind) {
  final l10n = context.l10n;
  return switch (kind) {
    UpNextKind.quote => l10n.upNextQuoteAction,
    UpNextKind.delivery => l10n.upNextDeliveryAction,
    UpNextKind.payment ||
    UpNextKind.declined ||
    UpNextKind.unknown => l10n.upNextOpenAction,
  };
}

class _UpNextCard extends StatelessWidget {
  const _UpNextCard({required this.upNext});

  final UpNext upNext;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final booking = upNext.booking;
    final summary = [
      bookingTitle(context, booking),
      bookingMeta(context, booking),
    ].where((s) => s.isNotEmpty).join(' · ');
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GroupLabel(
          context.l10n.accountUpNext,
          padding: const EdgeInsetsDirectional.fromSTEB(4, 0, 4, 8),
        ),
        ShootPanel.raised(
          padding: const EdgeInsetsDirectional.fromSTEB(8, 14, 8, 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsetsDirectional.symmetric(horizontal: 8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    BookingBadge(booking.status),
                    const SizedBox(height: 6),
                    Text(
                      _upNextTitle(context, upNext.kind, booking.status),
                      style: ShootType.heading.copyWith(color: c.ink),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      summary,
                      style: ShootType.meta.copyWith(color: c.mute),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 10),
              TopHit(
                label: _upNextAction(context, upNext.kind),
                chevron: true,
                onPressed: () => context.go(bookingPath(booking.reference)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

/// A `.rows` place: 60 high (`min-height: 52` plus `padding: 4 16`), a hairline below.
class _PlaceRow extends StatelessWidget {
  const _PlaceRow({
    required this.icon,
    required this.label,
    required this.onTap,
    this.status,
    this.hot = false,
    this.trailing,
  });

  final ShootIcons icon;
  final String label;
  final String? status;
  final bool hot;
  final Widget? trailing;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Container(
      padding: const EdgeInsetsDirectional.only(bottom: 1),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: c.hair)),
      ),
      child: ShootRow(
        label: label,
        onTap: onTap,
        leading: IconTile(icon, iconSize: 15, tone: IconTileTone.tile),
        chevron: false,
        minHeight: 60,
        padding: const EdgeInsetsDirectional.symmetric(
          horizontal: 16,
          vertical: 4,
        ),
        trailing:
            trailing ??
            (status == null
                ? null
                : Text(
                    status!,
                    textAlign: TextAlign.end,
                    style: ShootType.meta.copyWith(
                      color: hot ? c.ink : c.mute,
                      fontWeight: hot ? FontWeight.w500 : FontWeight.w400,
                    ),
                  )),
      ),
    );
  }
}

/// A brief on the account: its sentence, the date sent and its status in words.
class BriefRow extends StatelessWidget {
  const BriefRow({
    super.key,
    required this.brief,
    required this.onTap,
    this.inset = true,
  });

  /// Board 24's full-width row (`padding: 4 16`, 68 high); false for a list already inset.
  final bool inset;

  final BriefSummary brief;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return TwoLineRow(
      title: brief.sentence,
      meta: [
        l10n.accountBriefSent(formatSent(context, brief.sentAt)),
        if (brief.saidYes > 0) l10n.accountSaidYes(brief.saidYes),
      ].join(' · '),
      leading: const IconTile(
        ShootIcons.search,
        iconSize: 15,
        tone: IconTileTone.tile,
      ),
      minHeight: inset ? 68 : 60,
      padding: inset
          ? const EdgeInsetsDirectional.symmetric(horizontal: 16, vertical: 4)
          : const EdgeInsetsDirectional.symmetric(vertical: 8),
      metaMaxLines: inset ? 1 : null,
      onTap: onTap,
      trailing: StatusBadge(
        label: briefStatusLabel(context, brief.status),
        tone: BadgeTone.neutral,
      ),
    );
  }
}
