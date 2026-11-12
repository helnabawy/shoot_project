import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/content/domain/entities/editor_page.dart';

/// Decodes `GET /api/mobile/v1/pages/{slug}` (`pageV1`). Throws
/// [FormatException] on a missing or mistyped field; a section type this
/// build does not know becomes an `UnknownSection`.
final class EditorPageModel {
  const EditorPageModel._(this._entity);

  factory EditorPageModel.fromJson(Json json) {
    return EditorPageModel._(
      EditorPage(
        locale: readString(json, 'locale'),
        path: readString(json, 'path'),
        title: readString(json, 'title'),
        sections: SectionModel.readAll(json, 'sections'),
      ),
    );
  }

  final EditorPage _entity;

  EditorPage toEntity() => _entity;
}
