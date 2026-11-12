import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/auth/safe_next.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/gallery/gallery_page.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/core/routing/error_page.dart';
import 'package:shoot_mobile/core/routing/not_found_page.dart';

export 'package:shoot_mobile/core/routing/app_routes.dart';

/// The app's router (contracts/routes.md):
/// - `/ar` and `/ar/<path>` switch to Arabic through [onArabicLink] and drop the prefix; other paths
///   keep the current language;
/// - only built routes are registered, so unbuilt and unknown paths show screen 37;
/// - a router failure shows screen 39;
/// - `/_gallery` exists only when [isDebug] (debug builds);
/// - a plain launch goes to the welcome steps once, when [welcomeSeen] says so and the welcome
///   route is built (feature 010); a deep link never does;
/// - with a [session] (feature 009), `auth: true` routes send a signed-out person to
///   `/login?next=<path>`, and signing in leaves the sign-in screens for `next` when `safeNext`
///   accepts it, else [afterSignIn]. The router re-checks on every session change;
/// - [routes] are the features' own routes (the sign-in shell), registered beside home.
GoRouter createAppRouter({
  String initialLocation = AppRoutes.home,
  VoidCallback? onArabicLink,
  bool isDebug = kDebugMode,
  bool Function()? welcomeSeen,
  SessionCubit? session,
  List<RouteBase> routes = const [],
  required WidgetBuilder home,
}) {
  final plainLaunch = initialLocation == AppRoutes.home;
  var firstNavigation = true;
  return GoRouter(
    initialLocation: initialLocation,
    refreshListenable: session == null
        ? null
        : _StreamListenable(session.stream),
    redirect: (context, state) {
      final path = state.uri.path;
      final first = firstNavigation;
      firstNavigation = false;
      final welcome = firstRunRedirect(
        isFirstNavigation: first && plainLaunch,
        welcomeSeen: welcomeSeen?.call() ?? true,
      );
      if (welcome != null) return welcome;
      if (path == '/ar' || path.startsWith('/ar/')) {
        onArabicLink?.call();
        final rest = path == '/ar' ? '/' : path.substring(3);
        return state.uri.replace(path: rest).toString();
      }
      if (session != null) return authRedirect(state.uri, session.state);
      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.home,
        name: 'home',
        builder: (context, state) => home(context),
      ),
      ...routes,
      if (isDebug)
        GoRoute(
          path: AppRoutes.gallery,
          builder: (context, state) => GalleryPage(session: session),
        ),
    ],
    errorBuilder: (context, state) {
      // go_router reports an unmatched location as an error too; that is a not-found, not a failure.
      final unmatched = '${state.error}'.contains('no routes for location');
      if (state.error == null || unmatched) return const NotFoundPage();
      return ErrorPage(
        onRetry: () => GoRouter.of(context).go(state.uri.toString()),
      );
    },
  );
}

/// Where a plain first launch goes: the splash (`/welcome/0`, then the steps), once per install, only when feature
/// 010 has built it ([AppRoute.built]). Until then it never redirects.
String? firstRunRedirect({
  required bool isFirstNavigation,
  required bool welcomeSeen,
  List<AppRoute> table = AppRoutes.table,
}) {
  final built = table.any((r) => r.path == AppRoutes.welcome && r.built);
  if (!built || welcomeSeen || !isFirstNavigation) return null;
  return '/welcome/0';
}

/// The sign-in screens, which a signed-in person leaves.
const signInPaths = {AppRoutes.login, AppRoutes.loginCode, AppRoutes.register};

/// The account guard (research R15, OT-US3-S4, OT-US3-S6):
/// - signed out on an `auth: true` route (built or not): `/login?next=<that location>`;
/// - signed in on a sign-in screen: `next` when [safeNext] accepts it, else [afterSignIn].
String? authRedirect(
  Uri uri,
  SessionState session, {
  List<AppRoute> table = AppRoutes.table,
}) {
  final path = uri.path;
  if (session is SignedIn) {
    if (!signInPaths.contains(path)) return null;
    return safeNext(uri.queryParameters['next'], table: table) ??
        afterSignIn(session.user, table: table);
  }
  if (session is SignedOut && _needsAccount(path, table)) {
    return '${AppRoutes.login}?next=${Uri.encodeComponent(uri.toString())}';
  }
  return null;
}

/// Where sign-in goes with no `next` (research R15): a creator's profile (014), else the
/// account (013); until those are built, home.
String afterSignIn(SessionUser user, {List<AppRoute> table = AppRoutes.table}) {
  bool built(String path) => table.any((r) => r.path == path && r.built);
  if (user.accountType == AccountType.provider &&
      built(AppRoutes.accountProfile)) {
    return AppRoutes.accountProfile;
  }
  return built(AppRoutes.account) ? AppRoutes.account : AppRoutes.home;
}

bool _needsAccount(String path, List<AppRoute> table) {
  final segments = path.split('/').where((s) => s.isNotEmpty).toList();
  return table.any((route) {
    if (!route.auth) return false;
    final pattern = route.path.split('/').where((s) => s.isNotEmpty).toList();
    if (pattern.length != segments.length) return false;
    for (var i = 0; i < pattern.length; i++) {
      if (!pattern[i].startsWith(':') && pattern[i] != segments[i]) {
        return false;
      }
    }
    return true;
  });
}

/// Re-runs the redirect when the session changes.
final class _StreamListenable extends ChangeNotifier {
  _StreamListenable(Stream<Object?> stream) {
    _subscription = stream.listen((_) => notifyListeners());
  }

  late final StreamSubscription<Object?> _subscription;

  @override
  void dispose() {
    unawaited(_subscription.cancel());
    super.dispose();
  }
}
