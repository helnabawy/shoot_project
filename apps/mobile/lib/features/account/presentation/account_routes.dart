import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/features/account/presentation/cubit/account_cubit.dart';
import 'package:shoot_mobile/features/account/presentation/cubit/bookings_cubit.dart';
import 'package:shoot_mobile/features/account/presentation/pages/account_home_page.dart';
import 'package:shoot_mobile/features/account/presentation/pages/booking_stand_in_page.dart';
import 'package:shoot_mobile/features/account/presentation/pages/bookings_page.dart';
import 'package:shoot_mobile/features/account/presentation/pages/finish_page.dart';

/// `/account` (24), `/account/finish` (25), `/account/bookings` (26) and `/account/bookings/:ref`
/// under one [ShellRoute] that provides the [AccountCubit], so the three screens share one read of
/// the account. The cubit is made when an account screen opens and closed when the person leaves
/// them, so nothing personal outlives the screens (FR-030). All four are `auth: true` in the route
/// table; the router's guard sends a signed-out person to sign in first.
///
/// [booking] builds the page a booking row opens (feature 012's quotation and booking screens);
/// it defaults to a stand-in.
List<RouteBase> accountRoutes({
  required AccountCubit Function() createAccount,
  required BookingsCubit Function() createBookings,
  Widget Function(BuildContext context, String reference)? booking,
}) {
  final holder = _AccountHolder(createAccount);
  return [
    ShellRoute(
      builder: (context, state, child) =>
          _AccountScope(holder: holder, child: child),
      routes: [
        GoRoute(
          path: AppRoutes.account,
          builder: (context, state) => const AccountHomePage(),
        ),
        GoRoute(
          path: AppRoutes.accountFinish,
          builder: (context, state) => const FinishPage(),
        ),
        GoRoute(
          path: AppRoutes.accountBookings,
          builder: (context, state) => BlocProvider<BookingsCubit>(
            create: (_) => createBookings(),
            child: const BookingsPage(),
          ),
        ),
        GoRoute(
          path: '${AppRoutes.accountBookings}/:ref',
          builder: (context, state) {
            final ref = state.pathParameters['ref']!;
            return booking?.call(context, ref) ??
                BookingStandInPage(reference: ref);
          },
        ),
      ],
    ),
  ];
}

final class _AccountHolder {
  _AccountHolder(this._create);

  final AccountCubit Function() _create;
  AccountCubit? current;

  AccountCubit open() {
    final existing = current;
    if (existing != null && !existing.isClosed) return existing;
    return current = _create();
  }

  void close(AccountCubit cubit) {
    if (identical(current, cubit)) current = null;
    unawaited(cubit.close());
  }
}

class _AccountScope extends StatefulWidget {
  const _AccountScope({required this.holder, required this.child});

  final _AccountHolder holder;
  final Widget child;

  @override
  State<_AccountScope> createState() => _AccountScopeState();
}

class _AccountScopeState extends State<_AccountScope> {
  late final AccountCubit _cubit = widget.holder.open();

  @override
  void dispose() {
    widget.holder.close(_cubit);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) =>
      BlocProvider<AccountCubit>.value(value: _cubit, child: widget.child);
}
