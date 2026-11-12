import 'package:shoot_mobile/core/routing/app_routes.dart';

/// Where to go after sign-in, or `null` to use the default (OT-US3-S7). A Dart port of the web's
/// `apps/web/src/modules/auth/safe-next.ts`, checked against the app's route table: only a
/// same-app path (one leading `/`, no scheme, no `//` or backslash) that matches a route in
/// [table] (built or not) is kept. An `/ar` prefix is kept; the router reads it.
String? safeNext(String? value, {List<AppRoute> table = AppRoutes.table}) {
  if (value == null || !value.startsWith('/')) return null;
  if (value.startsWith('//') || value.contains(r'\')) return null;
  final Uri uri;
  try {
    uri = Uri.parse(value);
  } on FormatException {
    return null;
  }
  if (uri.hasScheme || uri.hasAuthority) return null;

  var path = uri.path;
  if (path == '/ar' || path.startsWith('/ar/')) {
    path = path == '/ar' ? '/' : path.substring(3);
  }
  final segments = _segments(path);
  final known = table.any((route) => _matches(_segments(route.path), segments));
  return known ? value : null;
}

List<String> _segments(String path) =>
    path.split('/').where((s) => s.isNotEmpty).toList();

bool _matches(List<String> pattern, List<String> path) {
  if (pattern.length != path.length) return false;
  for (var i = 0; i < pattern.length; i++) {
    if (pattern[i].startsWith(':')) continue;
    if (pattern[i] != path[i]) return false;
  }
  return true;
}
