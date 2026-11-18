import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/creator_home/presentation/cubit/creator_home_cubit.dart';
import 'package:shoot_mobile/features/creator_home/presentation/pages/creator_home_page.dart';

/// What a signed-in creator sees at `/` instead of the landing (feature 023). It is `null` for anyone
/// else, so the router shows the landing; it is also `null` when the client page is asked for
/// (`/?view=client`, the menu's "Book a shoot"), which is how a creator reaches the landing.
///
/// The router re-runs its builders when the session changes, so signing in or out switches between the
/// two without a reload (FR-004).
Widget? Function(BuildContext context, GoRouterState state) creatorHomePage({
  required SessionCubit session,
  required CreatorHomeCubit Function() create,
  Clock clock = const SystemClock(),
}) {
  return (context, state) {
    final s = session.state;
    if (s is! SignedIn || s.session.user.accountType != AccountType.provider) {
      return null;
    }
    if (state.uri.queryParameters['view'] == 'client') return null;
    return CreatorHomePage(create: create, clock: clock);
  };
}
