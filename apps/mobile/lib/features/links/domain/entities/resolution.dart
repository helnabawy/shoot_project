import 'package:equatable/equatable.dart';

/// The kind of app place a site path names (`placeKindV1`, research R12). A kind this build does
/// not know reads as [unknown], so a new server kind never breaks decoding.
enum PlaceKind {
  route,
  page,
  hire,
  creator,
  book,
  specialty,
  guide,
  guideCategory,
  guideAuthor,
  legal,
  private,
  unknown,
}

/// What `GET /api/mobile/v1/resolve?path=` says about a site path (`resolveV1`): a place the app
/// can show ([ResolvedPage]), a page that was taken down ([RemovedPage], screen 38) or nothing at
/// that address ([NoPage], screen 37). [locale] is `en` or `ar`.
sealed class Resolution extends Equatable {
  const Resolution({required this.path, required this.locale});

  /// The address without a language prefix. For a [ResolvedPage] it is the current address,
  /// which differs from the one asked for when a page was renamed.
  final String path;
  final String locale;
}

final class ResolvedPage extends Resolution {
  const ResolvedPage({
    required super.path,
    required super.locale,
    required this.kind,
    required this.params,
  });

  final PlaceKind kind;

  /// The path's parameters by name (`code`, `slug`, `ref`, …).
  final Map<String, String> params;

  @override
  List<Object?> get props => [path, locale, kind, params];
}

final class RemovedPage extends Resolution {
  const RemovedPage({required super.path, required super.locale});

  @override
  List<Object?> get props => [path, locale];
}

final class NoPage extends Resolution {
  const NoPage({required super.path, required super.locale});

  @override
  List<Object?> get props => [path, locale];
}
