import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/network/json_read.dart';

/// A link inside the site (`linkV1`): [path] has no language prefix
/// (`/creators`, never `/ar/creators`), so the app routes it as is.
final class SiteLink extends Equatable {
  const SiteLink({required this.label, required this.path});

  final String label;
  final String path;

  @override
  List<Object?> get props => [label, path];
}

/// A link out of the app (`externalLinkV1`): a web, mail or phone address.
final class ExternalLink extends Equatable {
  const ExternalLink({required this.label, required this.url});

  final String label;
  final String url;

  @override
  List<Object?> get props => [label, url];
}

/// Decodes `linkV1`. Throws [FormatException] on a missing or mistyped field.
final class SiteLinkModel {
  const SiteLinkModel._(this._entity);

  factory SiteLinkModel.fromJson(Json json) {
    return SiteLinkModel._(
      SiteLink(
        label: readString(json, 'label'),
        path: readString(json, 'path'),
      ),
    );
  }

  /// A list of `linkV1` at [key].
  static List<SiteLink> readAll(Json json, String key) {
    return List.unmodifiable(
      readList(
        json,
        key,
        (item) => SiteLinkModel.fromJson(asObject(item)).toEntity(),
      ),
    );
  }

  final SiteLink _entity;

  SiteLink toEntity() => _entity;
}

/// Decodes `externalLinkV1`. Throws [FormatException] on a missing or
/// mistyped field.
final class ExternalLinkModel {
  const ExternalLinkModel._(this._entity);

  factory ExternalLinkModel.fromJson(Json json) {
    return ExternalLinkModel._(
      ExternalLink(
        label: readString(json, 'label'),
        url: readString(json, 'url'),
      ),
    );
  }

  /// A list of `externalLinkV1` at [key].
  static List<ExternalLink> readAll(Json json, String key) {
    return List.unmodifiable(
      readList(
        json,
        key,
        (item) => ExternalLinkModel.fromJson(asObject(item)).toEntity(),
      ),
    );
  }

  final ExternalLink _entity;

  ExternalLink toEntity() => _entity;
}
