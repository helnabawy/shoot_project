import 'package:shoot_mobile/core/content/links.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/site/domain/entities/navigation.dart';

/// Decodes `GET /api/mobile/v1/navigation` (`navigationV1`). Throws
/// [FormatException] on a missing or mistyped field.
final class NavigationModel {
  const NavigationModel._(this._entity);

  factory NavigationModel.fromJson(Json json) {
    return NavigationModel._(
      Navigation(
        locale: readString(json, 'locale'),
        header: SiteLinkModel.readAll(json, 'header'),
        footerGroups: List.unmodifiable(
          readList(json, 'footerGroups', (item) {
            final group = asObject(item);
            return FooterGroup(
              key: readString(group, 'key'),
              label: readString(group, 'label'),
              links: SiteLinkModel.readAll(group, 'links'),
            );
          }),
        ),
        legal: SiteLinkModel.readAll(json, 'legal'),
      ),
    );
  }

  final Navigation _entity;

  Navigation toEntity() => _entity;
}
