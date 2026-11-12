import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/features/creators/data/models/creator_models.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

import '../../../../helpers/api_examples.dart';

Map<String, dynamic> _without(Map<String, dynamic> json, String key) =>
    Map.of(json)..remove(key);

void main() {
  group('MR-US3-S4 creator models', () {
    test('creators.json decodes the cards, filters and pagination', () {
      final list = CreatorListModel.fromJson(loadExample('creators'))
          .toEntity();
      expect(list.locale, 'en');
      expect(list.items.map((c) => c.name), [
        'Omar K.',
        'Mariam A.',
        'Yusuf R.',
      ]);
      final omar = list.items.first;
      expect(omar.displayCode, 'SH-0087');
      expect(omar.places, ['Sharjah', 'Dubai']);
      expect(omar.photo!.sizes.map((s) => s.width), [400, 800]);
      expect(list.items[1].photo, isNull);
      expect(list.filters.map((f) => f.key), [
        FilterKey.type,
        FilterKey.specialty,
        FilterKey.place,
      ]);
      final specialty = list.filters[1];
      expect(specialty.label, 'Specialty');
      expect(
        specialty.options.first,
        const FilterOption(
          slug: 'weddings',
          name: 'Weddings',
          count: 12,
          selected: true,
        ),
      );
      expect(list.pagination.page, 1);
      expect(list.pagination.pageCount, 4);
      expect(list.pagination.hasNext, isTrue);
    });

    test('creators.ar.json decodes in Arabic', () {
      final list = CreatorListModel.fromJson(loadExample('creators.ar'))
          .toEntity();
      expect(list.locale, 'ar');
      expect(list.items.first.name, 'عمر ك.');
      expect(list.filters.first.label, 'المحترف');
    });

    test('an unknown filter key reads as unknown', () {
      final json = loadExample('creators');
      final filters = [
        ...(json['filters'] as List),
        {'key': 'budget', 'label': 'Budget', 'options': <Object>[]},
      ];
      final list = CreatorListModel.fromJson({...json, 'filters': filters})
          .toEntity();
      expect(list.filters.last.key, FilterKey.unknown);
    });

    test('creator-profile.json and .ar.json decode with samples', () {
      final en = CreatorProfileModel.fromJson(loadExample('creator-profile'))
          .toEntity();
      expect(en.displayCode, 'SH-0087');
      expect(en.canBook, isTrue);
      expect(en.nationality, 'United Arab Emirates');
      expect(en.social.single.label, 'Instagram');
      expect(en.samples.map((s) => s.kind), [
        SampleKind.image,
        SampleKind.image,
        SampleKind.video,
      ]);
      expect(en.samples.first.thumb.sizes.last.width, 800);
      expect(en.samples.first.large.sizes.last.width, 1600);
      expect(en.samples.last.provider, 'YouTube');
      expect(en.samples.first.videoUrl, isNull);

      final ar = CreatorProfileModel.fromJson(loadExample('creator-profile.ar'))
          .toEntity();
      expect(ar.locale, 'ar');
      expect(ar.name, 'عمر ك.');
      expect(ar.samples.first.caption, 'حفل في الحديقة');
    });

    test('specialty.json decodes the counts, creators and samples', () {
      final page = SpecialtyPageModel.fromJson(loadExample('specialty'))
          .toEntity();
      expect(page.slug, 'weddings');
      expect(page.sampleCount, 24);
      expect(page.professionalCount, 12);
      expect(page.creators, hasLength(3));
      expect(page.samples.first.creatorCode, '0087');
      expect(page.samples.first.kind, SampleKind.image);
    });

    test('hire-page.json decodes the builder, preset, creators and FAQ', () {
      final page = HirePageModel.fromJson(loadExample('hire-page')).toEntity();
      expect(page.path, '/hire/wedding-photographer-dubai');
      expect(page.preset, {
        'persona': 'photographer',
        'occasion': 'wedding',
        'location': 'dubai',
      });
      expect(page.builder!.slots.first.kind, SlotKind.persona);
      expect(page.builder!.steps, isNotEmpty);
      expect(page.creators, hasLength(3));
      expect(page.creatorTotal, 12);
      expect(page.sections.single, isA<RichTextSection>());
      expect(page.faq.first.answer.nodes.single, isA<ParagraphBlock>());
    });

    test('a hire page without a builder decodes with builder null', () {
      final page = HirePageModel.fromJson({
        ...loadExample('hire-page'),
        'builder': null,
        'intro': null,
      }).toEntity();
      expect(page.builder, isNull);
      expect(page.intro, isNull);
    });

    test('a missing required field throws FormatException', () {
      expect(
        () => CreatorListModel.fromJson(
          _without(loadExample('creators'), 'pagination'),
        ),
        throwsFormatException,
      );
      expect(
        () => CreatorProfileModel.fromJson(
          _without(loadExample('creator-profile'), 'displayCode'),
        ),
        throwsFormatException,
      );
      expect(
        () => SpecialtyPageModel.fromJson(
          _without(loadExample('specialty'), 'counts'),
        ),
        throwsFormatException,
      );
      expect(
        () =>
            HirePageModel.fromJson(_without(loadExample('hire-page'), 'path')),
        throwsFormatException,
      );
    });
  });
}
