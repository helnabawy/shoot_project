import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/routing/not_found_page.dart';
import 'package:shoot_mobile/features/service_health/presentation/pages/service_health_page.dart';

/// Route paths. Mirror the web paths where a screen exists on both, so a
/// shared link (e.g. `/creators/{code}`) can open the app later.
abstract final class AppRoutes {
  static const home = '/';
  static const creators = '/creators';
  static const accountBookings = '/account/bookings';
}

GoRouter createAppRouter({String initialLocation = AppRoutes.home}) {
  return GoRouter(
    initialLocation: initialLocation,
    routes: [
      GoRoute(
        path: AppRoutes.home,
        name: 'home',
        builder: (context, state) => const ServiceHealthPage(),
      ),
    ],
    errorBuilder: (context, state) => const NotFoundPage(),
  );
}
