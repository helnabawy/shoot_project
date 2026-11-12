import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/routing/app_routes.dart';

/// Where a link in CMS text goes (research R4).
sealed class LinkTarget extends Equatable {
  const LinkTarget();
}

/// A screen the app has: [path] has no language prefix, and keeps its query.
final class InApp extends LinkTarget {
  const InApp(this.path);

  final String path;

  @override
  List<Object?> get props => [path];
}

/// Outside the app: the browser, the mail app or the dialler.
final class External extends LinkTarget {
  const External(this.uri);

  final Uri uri;

  @override
  List<Object?> get props => [uri];
}

/// Not a link: shown as text, never tappable (an unsafe or unreadable address).
final class Inert extends LinkTarget {
  const Inert();

  @override
  List<Object?> get props => [];
}

/// The one rule for links in guides, pages and legal text (FR-013, FR-014):
/// - a site path (`/guides/x`, `/ar/guides/x`, or `https://` on [siteBase]'s host) opens in the app
///   when [hasAppRoute] says the app has it, else the same address on the website;
/// - other `http`, `https`, `mailto:` and `tel:` addresses are external;
/// - everything else (`javascript:`, `data:`, `//host`, relative text, empty) is [Inert].
LinkTarget resolveLink(
  String href, {
  required bool Function(String path) hasAppRoute,
  required Uri siteBase,
}) {
  final text = href.trim();
  if (text.isEmpty || text.startsWith('//')) return const Inert();
  final uri = Uri.tryParse(text);
  if (uri == null) return const Inert();

  final scheme = uri.scheme.toLowerCase();
  if (scheme == 'mailto' || scheme == 'tel') return External(uri);
  final isWeb = scheme == 'http' || scheme == 'https';
  if (isWeb && uri.host.isEmpty) return const Inert();
  final onSite = isWeb
      ? uri.host.toLowerCase() == siteBase.host.toLowerCase()
      : scheme.isEmpty && text.startsWith('/');
  if (!onSite) return isWeb ? External(uri) : const Inert();

  final path = uri.path.isEmpty ? '/' : uri.path;
  final bare = path == '/ar'
      ? '/'
      : path.startsWith('/ar/')
      ? path.substring(3)
      : path;
  if (hasAppRoute(bare)) {
    return InApp(uri.hasQuery ? '$bare?${uri.query}' : bare);
  }
  return External(
    siteBase.replace(path: path, query: uri.hasQuery ? uri.query : null),
  );
}

/// Whether the app has a built screen for [path] (language prefix removed), by the route table.
/// A path another feature owns follows that route's `built`; a single segment no route names is a
/// page slug (`/{slug}`), which the app opens; the website-only feed is never in the app.
bool appHasRoute(String path, {List<AppRoute> table = AppRoutes.table}) {
  final segments = _segments(path);
  if (segments.length == 2 &&
      segments[0] == 'guides' &&
      segments[1] == 'feed') {
    return false;
  }
  AppRoute? catchAll;
  for (final route in table) {
    final pattern = _segments(route.path);
    if (pattern.length == 1 && pattern[0].startsWith(':')) {
      catchAll = route;
      continue;
    }
    if (_matches(pattern, segments)) return route.built;
  }
  return segments.length == 1 && (catchAll?.built ?? false);
}

List<String> _segments(String path) =>
    path.split('/').where((s) => s.isNotEmpty).toList();

bool _matches(List<String> pattern, List<String> segments) {
  if (pattern.length != segments.length) return false;
  for (var i = 0; i < pattern.length; i++) {
    if (!pattern[i].startsWith(':') && pattern[i] != segments[i]) return false;
  }
  return true;
}
