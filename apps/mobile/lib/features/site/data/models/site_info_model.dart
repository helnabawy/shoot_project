import 'package:shoot_mobile/core/content/links.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/site/domain/entities/site_info.dart';

/// Decodes `GET /api/mobile/v1/site` (`siteV1`). Throws [FormatException] on
/// a missing or mistyped field; unknown keys are ignored.
final class SiteInfoModel {
  const SiteInfoModel._(this._entity);

  factory SiteInfoModel.fromJson(Json json) {
    final whatsapp = readObject(json, 'whatsapp');
    final labels = readObject(json, 'labels');
    return SiteInfoModel._(
      SiteInfo(
        locale: readString(json, 'locale'),
        siteName: readString(json, 'siteName'),
        logo: ImageRefModel.readNullable(json, 'logo'),
        logoDark: ImageRefModel.readNullable(json, 'logoDark'),
        whatsapp: WhatsAppContact(
          number: readNullableString(whatsapp, 'number'),
          defaultMessage: readNullableString(whatsapp, 'defaultMessage'),
          expectedReplyTime: readNullableString(whatsapp, 'expectedReplyTime'),
        ),
        phone: readNullableString(json, 'phone'),
        contactEmail: readNullableString(json, 'contactEmail'),
        social: ExternalLinkModel.readAll(json, 'social'),
        labels: AccountLabels(
          seeker: readNullableString(labels, 'seeker'),
          provider: readNullableString(labels, 'provider'),
        ),
        creatorCodePrefix: readString(json, 'creatorCodePrefix'),
        quickMatchEnabled: readBool(json, 'quickMatchEnabled'),
      ),
    );
  }

  final SiteInfo _entity;

  SiteInfo toEntity() => _entity;
}
