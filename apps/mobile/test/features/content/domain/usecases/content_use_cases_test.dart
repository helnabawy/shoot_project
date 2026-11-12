import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/usecase/use_case.dart';
import 'package:shoot_mobile/features/content/domain/entities/editor_page.dart';
import 'package:shoot_mobile/features/content/domain/entities/guides.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';
import 'package:shoot_mobile/features/content/domain/entities/path_status.dart';
import 'package:shoot_mobile/features/content/domain/repositories/content_repository.dart';
import 'package:shoot_mobile/features/content/domain/repositories/path_status_repository.dart';
import 'package:shoot_mobile/features/content/domain/usecases/check_path.dart';
import 'package:shoot_mobile/features/content/domain/usecases/get_guides.dart';
import 'package:shoot_mobile/features/content/domain/usecases/get_legal.dart';
import 'package:shoot_mobile/features/content/domain/usecases/open_whatsapp.dart';
import 'package:shoot_mobile/features/site/domain/entities/site_info.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';

import '../../../../helpers/api_examples.dart';
import '../../../../helpers/content_fixtures.dart';

class _MockContent extends Mock implements ContentRepository {}

class _MockStatus extends Mock implements PathStatusRepository {}

class _MockSite extends Mock implements SiteRepository {}

void main() {
  late _MockContent content;

  setUpAll(() => registerFallbackValue(LegalKind.terms));

  setUp(() => content = _MockContent());

  group('MG-US2-S1 reads forward to the repository', () {
    test('MG-US2-S1 GetGuides passes page, category and author', () async {
      when(
        () => content.getGuides(
          page: any(named: 'page'),
          category: any(named: 'category'),
          author: any(named: 'author'),
        ),
      ).thenAnswer((_) async => Ok(exampleGuideList()));
      final result = await GetGuides(content)((
        page: 2,
        category: 'weddings',
        author: null,
      ));
      expect(result, isA<Ok<GuideList>>());
      verify(
        () => content.getGuides(page: 2, category: 'weddings', author: null),
      ).called(1);
    });

    test('MG-US2-S3 GetArticle and GetPage pass the slug', () async {
      when(() => content.getGuide('a'))
          .thenAnswer((_) async => const Err<Article>(NotFoundFailure()));
      when(() => content.getPage('b'))
          .thenAnswer((_) async => const Err<EditorPage>(NotFoundFailure()));
      expect(
        await GetArticle(content)('a'),
        const Err<Article>(NotFoundFailure()),
      );
      expect(
        await GetPage(content)('b'),
        const Err<EditorPage>(NotFoundFailure()),
      );
    });
  });

  group('MG-US1-S5 legal reads forward to the repository', () {
    test('MG-US1-S5 the three legal reads pass kind and version', () async {
      when(() => content.getLegal(any()))
          .thenAnswer((_) async => const Err<LegalDocument>(NotFoundFailure()));
      when(() => content.getLegalVersions(any()))
          .thenAnswer((_) async => const Err<LegalVersions>(NotFoundFailure()));
      when(() => content.getLegalVersion(any(), any()))
          .thenAnswer((_) async => const Err<LegalDocument>(NotFoundFailure()));
      await GetLegal(content)(LegalKind.privacy);
      await GetLegalVersions(content)(LegalKind.terms);
      await GetLegalVersion(content)((
        kind: LegalKind.professionalTerms,
        version: 3,
      ));
      verify(() => content.getLegal(LegalKind.privacy)).called(1);
      verify(() => content.getLegalVersions(LegalKind.terms)).called(1);
      verify(() => content.getLegalVersion(LegalKind.professionalTerms, 3))
          .called(1);
    });
  });

  group('MG-US4-S2 IsRemovedPath', () {
    late _MockStatus status;
    setUp(() => status = _MockStatus());

    test('MG-US4-S2 removed is true; page and notFound are false', () async {
      for (final (answer, expected) in [
        (PathStatus.removed, true),
        (PathStatus.notFound, false),
        (PathStatus.page, false),
      ]) {
        when(() => status.getStatus('/x')).thenAnswer((_) async => Ok(answer));
        expect(await IsRemovedPath(status)('/x'), Ok(expected));
      }
    });

    test('MG-US4-S2 a failed check is "not removed"', () async {
      when(() => status.getStatus('/x'))
          .thenAnswer((_) async => const Err<PathStatus>(NetworkFailure()));
      expect(await IsRemovedPath(status)('/x'), const Ok(false));
    });
  });

  group('MG-US2-S8 OpenWhatsApp', () {
    late _MockSite site;
    final opened = <Uri>[];
    OpenWhatsApp useCase() => OpenWhatsApp(site, (uri) async {
      opened.add(uri);
      return true;
    });

    SiteInfo info({String? number, String? message}) {
      final base = loadExample('site');
      final json = Map<String, Object?>.of(base);
      return siteInfoWith(json, number: number, message: message);
    }

    setUp(() {
      site = _MockSite();
      opened.clear();
    });

    test(
      'MG-US2-S8 opens wa.me with the digits and the default message',
      () async {
        when(() => site.getSite()).thenAnswer(
          (_) async => Ok(info(number: '+971501234567', message: 'Hi Shoot')),
        );
        expect(await useCase()(const NoParams()), const Ok(true));
        expect(
          opened.single.toString(),
          'https://wa.me/971501234567?text=Hi%20Shoot',
        );
      },
    );

    test('MG-US2-S8 no number, no chat', () async {
      when(() => site.getSite()).thenAnswer((_) async => Ok(info()));
      expect(await useCase()(const NoParams()), const Ok(false));
      expect(opened, isEmpty);
    });

    test('MG-US2-S8 site settings failing means no chat', () async {
      when(() => site.getSite())
          .thenAnswer((_) async => const Err<SiteInfo>(NetworkFailure()));
      expect(await useCase()(const NoParams()), const Ok(false));
    });
  });
}
