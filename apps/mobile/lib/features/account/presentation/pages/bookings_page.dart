import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/routing/error_page.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/appearance_sheet.dart';
import 'package:shoot_mobile/core/widgets/empty_state.dart';
import 'package:shoot_mobile/core/widgets/group_label.dart';
import 'package:shoot_mobile/core/widgets/icon_tile.dart';
import 'package:shoot_mobile/core/widgets/photo_tile.dart';
import 'package:shoot_mobile/core/widgets/segmented_control.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';
import 'package:shoot_mobile/core/widgets/shoot_scaffold.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/account/domain/entities/account.dart';
import 'package:shoot_mobile/features/account/presentation/account_paths.dart';
import 'package:shoot_mobile/features/account/presentation/cubit/account_cubit.dart';
import 'package:shoot_mobile/features/account/presentation/cubit/bookings_cubit.dart';
import 'package:shoot_mobile/features/account/presentation/pages/account_home_page.dart';
import 'package:shoot_mobile/features/account/presentation/widgets/account_parts.dart';
import 'package:shoot_mobile/features/account/presentation/widgets/prefs.dart';

/// Screen 26, built to board `S07-bookings`: "Signed in as {number}", the tabs Bookings, Briefs
/// and Settings, and under Bookings the client's bookings as Upcoming and Past, each with its
/// status as a badge in words. The one primary action starts a new brief.
class BookingsPage extends StatefulWidget {
  const BookingsPage({super.key});

  @override
  State<BookingsPage> createState() => _BookingsPageState();
}

class _BookingsPageState extends State<BookingsPage> {
  @override
  void initState() {
    super.initState();
    unawaited(context.read<BookingsCubit>().load());
    final account = context.read<AccountCubit>();
    if (account.state.home == null) unawaited(account.load());
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final phone = context.select<AccountCubit, String?>(
      (a) => a.state.home?.phone,
    );
    return BlocBuilder<BookingsCubit, BookingsState>(
      builder: (context, state) {
        if (state.status == ListStatus.failed &&
            state.upcoming.isEmpty &&
            state.past.isEmpty) {
          return ErrorPage(
            onRetry: () => unawaited(context.read<BookingsCubit>().load()),
          );
        }
        return ShootScaffold(
          child: Column(
            children: [
              const AccountHeader(),
              Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(20, 12, 20, 0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Align(
                      alignment: AlignmentDirectional.centerStart,
                      child: Text(
                        l10n.bookingsTitle,
                        style: ShootType.title.copyWith(color: c.ink),
                      ),
                    ),
                    const SizedBox(height: 4),
                    if (phone != null)
                      Text.rich(
                        TextSpan(
                          text: l10n.bookingsSignedInAs(
                            ltrIsolate(formatPhone(phone)),
                          ),
                        ),
                        style: ShootType.meta.copyWith(color: c.mute),
                      ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(20, 16, 20, 0),
                child: Semantics(
                  container: true,
                  label: l10n.bookingsTabsLabel,
                  child: SegmentedControl<BookingsTab>(
                    segments: [
                      (BookingsTab.bookings, l10n.bookingsTabBookings),
                      (BookingsTab.briefs, l10n.bookingsTabBriefs),
                      (BookingsTab.settings, l10n.bookingsTabSettings),
                    ],
                    selected: state.tab,
                    onChanged: context.read<BookingsCubit>().selectTab,
                  ),
                ),
              ),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: () async {
                    final bookings = context.read<BookingsCubit>();
                    await bookings.load();
                    if (state.tab == BookingsTab.briefs) {
                      await bookings.loadBriefs();
                    }
                  },
                  child: switch (state.tab) {
                    BookingsTab.bookings => _BookingsTab(state: state),
                    BookingsTab.briefs => _BriefsTab(state: state),
                    BookingsTab.settings => const _SettingsTab(),
                  },
                ),
              ),
              Padding(
                padding: const EdgeInsetsDirectional.fromSTEB(12, 8, 12, 18),
                child: TopHit(
                  label: l10n.bookingsStartNew,
                  chevron: true,
                  onPressed: () => context.go(AppRoutes.home),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _BookingRow extends StatelessWidget {
  const _BookingRow({required this.booking, required this.index});

  final BookingSummary booking;
  final int index;

  @override
  Widget build(BuildContext context) {
    final title = bookingTitle(context, booking);
    final meta = bookingMeta(context, booking);
    final status = bookingStatusLabel(context, booking.status);
    return TwoLineRow(
      title: title,
      meta: meta,
      semanticLabel: [
        title,
        meta,
        status,
      ].where((s) => s.isNotEmpty).join(', '),
      leading: PhotoTile(variant: index),
      trailing: BookingBadge(booking.status),
      onTap: () => context.go(bookingPath(booking.reference)),
    );
  }
}

class _BookingsTab extends StatelessWidget {
  const _BookingsTab({required this.state});

  final BookingsState state;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    if (state.status == ListStatus.loading && state.empty) {
      return const Center(child: CircularProgressIndicator.adaptive());
    }
    if (state.empty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 48, 20, 0),
        children: [
          EmptyState(
            mark: const IconTile.big(ShootIcons.calendar),
            title: l10n.bookingsEmpty,
          ),
        ],
      );
    }
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsetsDirectional.fromSTEB(20, 20, 20, 12),
      children: [
        if (state.upcoming.isNotEmpty) ...[
          GroupLabel(
            l10n.bookingsUpcoming,
            padding: const EdgeInsetsDirectional.only(bottom: 8),
          ),
          for (final (i, b) in state.upcoming.indexed)
            _BookingRow(booking: b, index: i),
        ],
        if (state.past.isNotEmpty) ...[
          Padding(
            padding: EdgeInsetsDirectional.only(
              top: state.upcoming.isEmpty ? 0 : 28,
            ),
            child: GroupLabel(
              l10n.bookingsPast,
              padding: const EdgeInsetsDirectional.only(bottom: 8),
            ),
          ),
          for (final (i, b) in state.past.indexed)
            _BookingRow(booking: b, index: i + 2),
        ],
        if (state.hasMore)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextLink(
              label: l10n.bookingsShowMore,
              onTap: () => unawaited(context.read<BookingsCubit>().loadMore()),
            ),
          ),
      ],
    );
  }
}

class _BriefsTab extends StatelessWidget {
  const _BriefsTab({required this.state});

  final BookingsState state;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    if (state.briefsStatus == ListStatus.loading && state.briefs.isEmpty) {
      return const Center(child: CircularProgressIndicator.adaptive());
    }
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsetsDirectional.fromSTEB(20, 20, 20, 12),
      children: [
        if (state.briefs.isEmpty)
          Text(
            l10n.accountBriefsEmpty,
            style: ShootType.meta.copyWith(color: c.mute),
          ),
        for (final b in state.briefs)
          BriefRow(
            brief: b,
            onTap: b.bookingReference == null
                ? null
                : () => context.go(bookingPath(b.bookingReference!)),
          ),
        if (state.briefsHasMore)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextLink(
              label: l10n.bookingsShowMore,
              onTap: () =>
                  unawaited(context.read<BookingsCubit>().loadMoreBriefs()),
            ),
          ),
      ],
    );
  }
}

/// The Settings tab: the same details as screen 25 (name, number, email, language and theme),
/// each changeable there, and "Log out".
class _SettingsTab extends StatelessWidget {
  const _SettingsTab();

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final c = context.colors;
    final home = context.watch<AccountCubit>().state.home;
    Widget line(String label, String? value, VoidCallback? onTap) =>
        TwoLineRow(title: label, meta: value, onTap: onTap);
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsetsDirectional.fromSTEB(20, 20, 20, 12),
      children: [
        line(
          l10n.settingsNumber,
          home?.phone == null ? null : ltrIsolate(formatPhone(home!.phone!)),
          null,
        ),
        line(
          l10n.settingsName,
          home?.name,
          () => context.go(AppRoutes.accountFinish),
        ),
        line(
          l10n.settingsEmail,
          home?.email,
          () => context.go(AppRoutes.accountFinish),
        ),
        line(
          l10n.accountRowPreferences,
          prefsStatus(context),
          () => unawaited(showAppearanceSheet(context)),
        ),
        Padding(
          padding: const EdgeInsetsDirectional.only(top: ShootSpace.s4),
          child: Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextLink(
              key: const ValueKey('settings:logOut'),
              label: l10n.accountLogOut,
              style: ShootType.row.copyWith(color: c.ink),
              onTap: () {
                final router = GoRouter.of(context);
                unawaited(
                  context.read<SessionCubit>().signOut().then(
                    (_) => router.go(AppRoutes.home),
                  ),
                );
              },
            ),
          ),
        ),
      ],
    );
  }
}
