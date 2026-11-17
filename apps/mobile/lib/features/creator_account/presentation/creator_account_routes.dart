import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/account_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/availability_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/bookings_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/inbox_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/profile_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/pages/account_page.dart';
import 'package:shoot_mobile/features/creator_account/presentation/pages/availability_page.dart';
import 'package:shoot_mobile/features/creator_account/presentation/pages/bookings_page.dart';
import 'package:shoot_mobile/features/creator_account/presentation/pages/inbox_page.dart';
import 'package:shoot_mobile/features/creator_account/presentation/pages/profile_page.dart';

/// The creator's page at a path the client's account also uses: `/account`, `/account/bookings`
/// and `/account/bookings/:ref`. The client's routes (feature 013) come first in the route list and
/// go_router builds the first match, so they call this and show its page instead of theirs when it
/// is not `null`; it is `null` for anyone who is not a signed-in creator.
Widget? Function(BuildContext context, GoRouterState state)
creatorAccountPages({
  required SessionCubit session,
  required AccountCubit Function() createAccount,
  required BookingsCubit Function() createBookings,
  void Function(BuildContext context)? onAccountShown,
}) {
  return (context, state) {
    final s = session.state;
    if (s is! SignedIn || s.session.user.accountType != AccountType.provider) {
      return null;
    }
    return switch (state.fullPath) {
      AppRoutes.account => AccountPage(
        create: createAccount,
        onShown: onAccountShown,
      ),
      AppRoutes.accountBookings => BookingsPage(create: createBookings),
      final path? when path == '${AppRoutes.accountBookings}/:ref' =>
        BookingsPage(create: createBookings, ref: state.pathParameters['ref']),
      _ => null,
    };
  };
}

/// A signed-in creator's `/account`, `/account/profile`, `/account/availability`,
/// `/account/bookings` and `/account/bookings/:ref` (feature 014). A client who opens one of
/// them goes home (the client's account is feature 013); a signed-out person never gets here,
/// because the router's guard sends them to sign in first.
List<RouteBase> creatorAccountRoutes({
  required SessionCubit session,
  required AccountCubit Function() createAccount,
  required ProfileCubit Function() createProfile,
  required BookingsCubit Function() createBookings,
  required AvailabilityCubit Function() createAvailability,
  required InboxCubit Function() createInbox,
  void Function(BuildContext context)? onInboxShown,
  void Function(BuildContext context)? onAccountShown,
}) {
  String? creatorOnly(BuildContext context, GoRouterState state) {
    final s = session.state;
    return s is SignedIn && s.session.user.accountType == AccountType.provider
        ? null
        : AppRoutes.home;
  }

  return [
    GoRoute(
      path: AppRoutes.account,
      redirect: creatorOnly,
      builder: (context, state) =>
          AccountPage(create: createAccount, onShown: onAccountShown),
      routes: [
        GoRoute(
          path: 'profile',
          redirect: creatorOnly,
          builder: (context, state) => ProfilePage(create: createProfile),
        ),
        GoRoute(
          path: 'availability',
          redirect: creatorOnly,
          builder: (context, state) =>
              AvailabilityPage(create: createAvailability),
        ),
        GoRoute(
          path: 'inbox',
          redirect: creatorOnly,
          builder: (context, state) => InboxPage(
            create: createInbox,
            onShown: onInboxShown,
            focusRef: state.uri.queryParameters['brief'],
          ),
        ),
        GoRoute(
          path: 'bookings',
          redirect: creatorOnly,
          builder: (context, state) => BookingsPage(create: createBookings),
          routes: [
            GoRoute(
              path: ':ref',
              redirect: creatorOnly,
              builder: (context, state) => BookingsPage(
                create: createBookings,
                ref: state.pathParameters['ref'],
              ),
            ),
          ],
        ),
      ],
    ),
  ];
}
