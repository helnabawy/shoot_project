import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';
import 'package:shoot_mobile/features/notifications/presentation/cubit/notifications_cubit.dart';
import 'package:shoot_mobile/features/notifications/presentation/pages/notifications_page.dart';

/// `/account/notifications` (feature 024), for every signed-in member; the router's guard sends a
/// signed-out person to sign in first. Listed before the account routes so it is matched first.
RouteBase notificationsRoute({required NotificationsCubit Function() create}) =>
    GoRoute(
      path: AppRoutes.accountNotifications,
      builder: (context, state) => NotificationsPage(create: create),
    );
