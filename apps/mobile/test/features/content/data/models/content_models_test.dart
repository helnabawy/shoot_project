import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/content/data/models/editor_page_model.dart';
import 'package:shoot_mobile/features/content/data/models/guide_models.dart';
import 'package:shoot_mobile/features/content/data/models/legal_models.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';

import '../../../../helpers/api_examples.dart';

Json _without(Json json, String key) => Map.of(json)..remove(key);

void main() {
  group('MR-US4-S1 GuideListModel', () {
    test('decodes the guides example', () {
      final list = GuideListModel.fromJson(loadExample('guides')).toEntity();

      expect(list.locale, 'en');
      expect(list.items.first.title, 'How to brief a wedding photographer');
      expect(list.items.first.publishedAt, DateTime.utc(2026, 10, 1, 8));
      expect(list.items.first.publishedAt.isUtc, isTrue);
      expect(list.items.first.author?.slug, 'sara');
      expect(list.items.first.cover?.sizes, isNotEmpty);
      expect(list.items.last.cover, isNull);
      expect(list.pagination.pageCount, 1);
      expect(list.pagination.hasNext, isFalse);
      expect(list.pagination.hasPrevious, isFalse);
      expect(list.categories, hasLength(3));
      expect(list.category, isNull);
      expect(list.author, isNull);
    });

    test(
      'fills the narrowed category, counted from the list, and the author',
      () {
        final json = loadExample('guides')
          ..['category'] = {
            'slug': 'weddings',
            'name': 'Weddings',
            'description': null,
          }
          ..['author'] = {
            'slug': 'sara',
            'name': 'Sara Khan',
            'bio': null,
            'photo': null,
          };
        final list = GuideListModel.fromJson(json).toEntity();

        expect(list.category?.count, 1);
        expect(list.author?.name, 'Sara Khan');

        json['category'] = {
          'slug': 'gone',
          'name': 'Gone',
          'description': null,
        };
        expect(GuideListModel.fromJson(json).toEntity().category?.count, 0);
      },
    );

    test('a missing field or a bad date throws FormatException', () {
      final json = loadExample('guides');
      expect(
        () => GuideListModel.fromJson(_without(json, 'pagination')),
        throwsFormatException,
      );
      final items = json['items']! as List<Object?>;
      final bad = Map<String, Object?>.of(items.first! as Json)
        ..['publishedAt'] = 'yesterday';
      expect(() => ArticleSummaryModel.fromJson(bad), throwsFormatException);
    });
  });

  group('MR-US4-S2 ArticleModel', () {
    test('decodes the guide example with its body and related guides', () {
      final article = ArticleModel.fromJson(loadExample('guide')).toEntity();

      expect(article.summary.slug, 'brief-a-wedding-photographer');
      expect(article.summary.inRequestedLanguage, isTrue);
      expect(article.body.nodes, isNotEmpty);
      expect(article.related.single.slug, 'plan-a-shoot-day');
    });

    test('MR-US4-S3 reads inRequestedLanguage false', () {
      final json = loadExample('guide')..['inRequestedLanguage'] = false;
      expect(
        ArticleModel.fromJson(json).toEntity().summary.inRequestedLanguage,
        isFalse,
      );
    });
  });

  group('MR-US4-S4 EditorPageModel', () {
    test('decodes the page example; an unknown section is skipped', () {
      final json = loadExample('page');
      final page = EditorPageModel.fromJson(json).toEntity();

      expect(page.title, 'How it works');
      expect(page.path, '/how-it-works');
      expect(page.sections.first, isA<HowItWorksSection>());

      final sections = [
        ...json['sections']! as List<Object?>,
        {'type': 'carousel', 'anchor': null},
      ];
      final withUnknown = EditorPageModel.fromJson({
        ...json,
        'sections': sections,
      }).toEntity();
      expect(withUnknown.sections.last, isA<UnknownSection>());
    });
  });

  group('MR-US4-S5 legal models', () {
    test('decodes the document in force with its upcoming version', () {
      final doc = LegalDocumentModel.fromJson(loadExample('legal')).toEntity();

      expect(doc.kind, LegalKind.terms);
      expect(doc.version, 2);
      expect(doc.until, isNull);
      expect(doc.upcoming?.version, 3);
      expect(doc.upcoming?.effectiveFrom, DateTime.utc(2026, 12));
    });

    test('decodes one version without upcoming', () {
      final doc = LegalDocumentModel.fromJson(loadExample('legal-version'))
          .toEntity();

      expect(doc.version, 1);
      expect(doc.until, DateTime.utc(2026, 6));
      expect(doc.upcoming, isNull);
    });

    test('decodes the version list newest first', () {
      final list = LegalVersionsModel.fromJson(loadExample('legal-versions'))
          .toEntity();

      expect(list.versions.map((v) => v.version), [2, 1]);
      expect(list.versions.first.changeSummary, isNotNull);
      expect(list.versions.last.changeSummary, isNull);
    });

    test('an unknown kind reads as unknown; wire names round-trip', () {
      final json = loadExample('legal')..['kind'] = 'cookies';
      expect(
        LegalDocumentModel.fromJson(json).toEntity().kind,
        LegalKind.unknown,
      );
      expect(
        LegalKind.fromWire('professional-terms'),
        LegalKind.professionalTerms,
      );
      expect(LegalKind.professionalTerms.wire, 'professional-terms');
    });

    test('a missing field throws FormatException', () {
      expect(
        () => LegalVersionsModel.fromJson(
          _without(loadExample('legal-versions'), 'versions'),
        ),
        throwsFormatException,
      );
    });
  });
}
