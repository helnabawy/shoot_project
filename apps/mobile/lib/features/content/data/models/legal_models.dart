import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/content/data/models/content_json.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';

LegalKind _kind(Json json) => LegalKind.fromWire(readString(json, 'kind'));

/// Decodes `legalDocumentV1` (`GET legal/{kind}`) and `legalVersionV1`
/// (`GET legal/{kind}/versions/{version}`, which has no `upcoming`). Throws
/// [FormatException] on a missing or mistyped field; an unknown kind reads
/// as [LegalKind.unknown].
final class LegalDocumentModel {
  const LegalDocumentModel._(this._entity);

  factory LegalDocumentModel.fromJson(Json json) {
    final upcoming = readNullableObject(json, 'upcoming');
    return LegalDocumentModel._(
      LegalDocument(
        locale: readString(json, 'locale'),
        kind: _kind(json),
        title: readString(json, 'title'),
        version: readInt(json, 'version'),
        effectiveFrom: readDate(json, 'effectiveFrom'),
        until: readNullableDate(json, 'until'),
        body: RichTextModel.read(json, 'body'),
        inRequestedLanguage: readBool(json, 'inRequestedLanguage'),
        upcoming: upcoming == null
            ? null
            : UpcomingLegalVersion(
                version: readInt(upcoming, 'version'),
                effectiveFrom: readDate(upcoming, 'effectiveFrom'),
              ),
      ),
    );
  }

  final LegalDocument _entity;

  LegalDocument toEntity() => _entity;
}

/// Decodes `GET /api/mobile/v1/legal/{kind}/versions` (`legalVersionsV1`).
/// Throws [FormatException] on a missing or mistyped field.
final class LegalVersionsModel {
  const LegalVersionsModel._(this._entity);

  factory LegalVersionsModel.fromJson(Json json) {
    return LegalVersionsModel._(
      LegalVersions(
        locale: readString(json, 'locale'),
        kind: _kind(json),
        title: readString(json, 'title'),
        versions: List.unmodifiable(
          readList(json, 'versions', (item) {
            final row = asObject(item);
            return LegalVersionEntry(
              version: readInt(row, 'version'),
              from: readDate(row, 'from'),
              until: readNullableDate(row, 'until'),
              changeSummary: readNullableString(row, 'changeSummary'),
            );
          }),
        ),
      ),
    );
  }

  final LegalVersions _entity;

  LegalVersions toEntity() => _entity;
}
