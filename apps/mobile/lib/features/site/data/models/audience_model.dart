import 'package:shoot_mobile/core/content/audience.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/site/domain/entities/audience.dart';

/// Decodes `GET /api/mobile/v1/personas` (`personasV1`). Throws
/// [FormatException] on a missing or mistyped field.
final class AudienceModel {
  const AudienceModel._(this._entity);

  factory AudienceModel.fromJson(Json json) {
    return AudienceModel._(
      Audience(
        locale: readString(json, 'locale'),
        personas: PersonaModel.readAll(json, 'personas'),
        categories: CategoryModel.readAll(json, 'categories'),
      ),
    );
  }

  final Audience _entity;

  Audience toEntity() => _entity;
}
