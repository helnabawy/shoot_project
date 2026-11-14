import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/links/domain/entities/resolution.dart';

/// Decodes `GET /api/mobile/v1/resolve` (`resolveV1`). Throws [FormatException] on a missing or
/// mistyped field. An unknown `kind` reads as [PlaceKind.unknown]; an unknown `status` reads as
/// [NoPage], since this build has no screen for it.
final class ResolutionModel {
  const ResolutionModel._(this._entity);

  factory ResolutionModel.fromJson(Json json) {
    final status = readString(json, 'status');
    final path = readString(json, 'path');
    final locale = readString(json, 'locale');
    return ResolutionModel._(switch (status) {
      'page' => ResolvedPage(
        path: path,
        locale: locale,
        kind: readEnum(json, 'kind', PlaceKind.values, PlaceKind.unknown),
        params: _params(readObject(json, 'params')),
      ),
      'removed' => RemovedPage(path: path, locale: locale),
      _ => NoPage(path: path, locale: locale),
    });
  }

  final Resolution _entity;

  Resolution toEntity() => _entity;
}

// A param that is not a string is a later addition this build does not read
// (the same rule as the hire page's `preset`).
Map<String, String> _params(Json json) => Map.unmodifiable({
  for (final MapEntry(:key, :value) in json.entries)
    if (value is String) key: value,
});
