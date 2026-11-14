import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/push/push_cubit.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/menu/presentation/menu_page.dart';

/// `/menu` (screen 06). Pushed over the screen it was opened from, so closing it returns there.
RouteBase menuRoute({
  required SiteLoader loadSite,
  required WebsiteLinks links,
  PushCubit Function()? createPush,
}) => GoRoute(
  path: '/menu',
  builder: (context, state) =>
      MenuPage(loadSite: loadSite, links: links, createPush: createPush),
);
