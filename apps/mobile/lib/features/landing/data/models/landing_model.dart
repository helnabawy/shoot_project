import 'package:shoot_mobile/core/content/cta.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/landing/domain/entities/landing.dart';

/// Decodes `heroV1`. Throws [FormatException] on a missing or mistyped
/// field; an unknown layout reads as [HeroLayout.unknown].
final class HeroModel {
  const HeroModel._(this._entity);

  factory HeroModel.fromJson(Json json) {
    return HeroModel._(
      LandingHero(
        eyebrow: readNullableString(json, 'eyebrow'),
        headline: readString(json, 'headline'),
        subheadline: readNullableString(json, 'subheadline'),
        trustChips: List.unmodifiable(readStringList(json, 'trustChips')),
        layout: readEnum(json, 'layout', HeroLayout.values, HeroLayout.unknown),
        primaryCta: CtaModel.readNullable(json, 'primaryCta'),
        secondaryCta: CtaModel.readNullable(json, 'secondaryCta'),
        image: ImageRefModel.readNullable(json, 'image'),
        imageMobile: ImageRefModel.readNullable(json, 'imageMobile'),
        overlay: ImageRefModel.readNullable(json, 'overlay'),
        overlayOpacity: readNullableNum(json, 'overlayOpacity'),
      ),
    );
  }

  final LandingHero _entity;

  LandingHero toEntity() => _entity;
}

/// Decodes `GET /api/mobile/v1/landing` (`landingV1`). Throws
/// [FormatException] on a missing or mistyped field; a section type this
/// build does not know becomes an `UnknownSection`.
final class LandingModel {
  const LandingModel._(this._entity);

  factory LandingModel.fromJson(Json json) {
    return LandingModel._(
      Landing(
        locale: readString(json, 'locale'),
        hero: HeroModel.fromJson(readObject(json, 'hero')).toEntity(),
        navigation: List.unmodifiable(
          readList(json, 'navigation', (item) {
            final anchor = asObject(item);
            return LandingAnchor(
              label: readString(anchor, 'label'),
              target: readString(anchor, 'target'),
            );
          }),
        ),
        sections: SectionModel.readAll(json, 'sections'),
      ),
    );
  }

  final Landing _entity;

  Landing toEntity() => _entity;
}
