import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';
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
///   route is built (feature 010); a deep link never does.
GoRouter createAppRouter({
  String initialLocation = AppRoutes.home,
  VoidCallback? onArabicLink,
  bool isDebug = kDebugMode,
  bool Function()? welcomeSeen,
  required WidgetBuilder home,
}) {
  final plainLaunch = initialLocation == AppRoutes.home;
  var firstNavigation = true;
  return GoRouter(
    initialLocation: initialLocation,
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
      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.home,
        name: 'home',
        builder: (context, state) => home(context),
      ),
      if (isDebug)
        GoRoute(
          path: AppRoutes.gallery,
          builder: (context, state) => const GalleryPage(),
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

/// Where a plain first launch goes: the first welcome step, once per install, only when feature
/// 010 has built it ([AppRoute.built]). Until then it never redirects.
String? firstRunRedirect({
  required bool isFirstNavigation,
  required bool welcomeSeen,
  List<AppRoute> table = AppRoutes.table,
}) {
  final built = table.any((r) => r.path == AppRoutes.welcome && r.built);
  if (!built || welcomeSeen || !isFirstNavigation) return null;
  return '/welcome/1';
}
