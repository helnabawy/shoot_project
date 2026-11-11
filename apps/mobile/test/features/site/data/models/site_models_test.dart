import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/features/site/data/models/audience_model.dart';
import 'package:shoot_mobile/features/site/data/models/brief_builder_model.dart';
import 'package:shoot_mobile/features/site/data/models/navigation_model.dart';
import 'package:shoot_mobile/features/site/data/models/site_info_model.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

import '../../../../helpers/api_examples.dart';

void main() {
  group('MR-US1-S2 site', () {
    test('English decodes and maps to SiteInfo', () {
      final site = SiteInfoModel.fromJson(loadExample('site')).toEntity();

      expect(site.locale, 'en');
      expect(site.siteName, 'Shoot');
      expect(site.logo?.sizes, isNotEmpty);
      expect(site.logoDark, isNotNull);
      expect(site.whatsapp.number, '+971500000000');
      expect(site.social.first.label, 'instagram');
      expect(site.labels.seeker, isNotNull);
      expect(site.creatorCodePrefix, 'SH');
      expect(site.quickMatchEnabled, isTrue);
    });

    test('Arabic decodes and the Arabic strings come through', () {
      final site = SiteInfoModel.fromJson(loadExample('site.ar')).toEntity();

      expect(site.locale, 'ar');
      expect(site.siteName, 'شوت');
      expect(site.logo?.alt, 'شوت');
    });

    test('a missing field throws FormatException', () {
      expect(
        () =>
            SiteInfoModel.fromJson({...loadExample('site')}..remove('labels')),
        throwsFormatException,
      );
    });
  });

  group('MR-US1-S2 navigation', () {
    test('English decodes', () {
      final nav = NavigationModel.fromJson(loadExample('navigation'))
          .toEntity();

      expect(nav.locale, 'en');
      expect(nav.header.first.path, '/creators');
      expect(nav.header.first.label, 'Creators');
      expect(nav.footerGroups.first.key, 'company');
      expect(nav.footerGroups.first.links, isNotEmpty);
      expect(nav.legal, isNotEmpty);
    });

    test('Arabic keeps paths without a language prefix', () {
      final nav = NavigationModel.fromJson(loadExample('navigation.ar'))
          .toEntity();

      expect(nav.locale, 'ar');
      expect(nav.header.first.label, 'المبدعون');
      expect(nav.header.first.path, '/creators');
      expect(nav.footerGroups.first.label, 'الشركة');
    });
  });

  group('MR-US1-S2 personas', () {
    test('English decodes personas and categories', () {
      final audience = AudienceModel.fromJson(loadExample('personas'))
          .toEntity();

      expect(audience.locale, 'en');
      expect(audience.personas.map((p) => p.slug), contains('photographer'));
      expect(audience.categories, isNotEmpty);
      expect(audience.categories.first.personaIds, isNotEmpty);
    });

    test('Arabic labels come from the API', () {
      final en = AudienceModel.fromJson(loadExample('personas')).toEntity();
      final ar = AudienceModel.fromJson(loadExample('personas.ar')).toEntity();

      expect(ar.locale, 'ar');
      expect(ar.personas.first.singular, 'مصوّر');
      expect(ar.personas.first.slug, en.personas.first.slug);
      expect(ar.categories.first.name, isNot(en.categories.first.name));
    });
  });

  group('MR-US1-S2 brief builder', () {
    test('English decodes the sentence, slots and options', () {
      final brief = BriefBuilderModel.fromJson(loadExample('brief-builder'))
          .toEntity();

      expect(brief.locale, 'en');
      expect(brief.enabled, isTrue);
      final builder = brief.builder!;
      expect(builder.sentence, contains('{persona}'));
      expect(builder.slots.first.token, 'persona');
      expect(builder.slots.first.kind, SlotKind.persona);
      expect(builder.slots.first.options, isNotEmpty);
      expect(
        builder.slots.map((s) => s.kind),
        isNot(contains(SlotKind.unknown)),
      );
    });

    test('Arabic decodes and the sentence is Arabic', () {
      final brief = BriefBuilderModel.fromJson(loadExample('brief-builder.ar'))
          .toEntity();

      expect(brief.locale, 'ar');
      expect(brief.builder!.sentence, startsWith('أحتاج'));
      expect(brief.builder!.slots.first.groupLabel, 'المحترف');
    });

    test('a switched-off builder decodes to null', () {
      final brief = BriefBuilderModel.fromJson({
        'locale': 'en',
        'builder': null,
      }).toEntity();

      expect(brief.enabled, isFalse);
      expect(brief.builder, isNull);
    });
  });
}
