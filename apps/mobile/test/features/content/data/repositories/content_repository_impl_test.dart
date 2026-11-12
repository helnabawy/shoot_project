import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/content/data/datasources/content_remote_data_source.dart';
import 'package:shoot_mobile/features/content/data/models/editor_page_model.dart';
import 'package:shoot_mobile/features/content/data/models/guide_models.dart';
import 'package:shoot_mobile/features/content/data/models/legal_models.dart';
import 'package:shoot_mobile/features/content/data/repositories/content_repository_impl.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';

import '../../../../helpers/api_examples.dart';

Matcher _fails(Failure failure) =>
    isA<Err<Object?>>().having((e) => e.failure, 'failure', failure);

class _MockRemote extends Mock implements ContentRemoteDataSource {}

void main() {
  late _MockRemote remote;
  late ContentRepositoryImpl repository;

  setUpAll(() => registerFallbackValue(LegalKind.terms));

  setUp(() {
    remote = _MockRemote();
    repository = ContentRepositoryImpl(remote);
  });

  group('MR-US4-S5 content repository', () {
    test('each read passes its params and gives Ok with the entity', () async {
      final guides = GuideListModel.fromJson(loadExample('guides'));
      final guide = ArticleModel.fromJson(loadExample('guide'));
      final page = EditorPageModel.fromJson(loadExample('page'));
      final legal = LegalDocumentModel.fromJson(loadExample('legal'));
      final versions = LegalVersionsModel.fromJson(
        loadExample('legal-versions'),
      );
      final version = LegalDocumentModel.fromJson(loadExample('legal-version'));
      when(
        () => remote.fetchGuides(
          page: any(named: 'page'),
          category: any(named: 'category'),
          author: any(named: 'author'),
        ),
      ).thenAnswer((_) async => guides);
      when(() => remote.fetchGuide(any())).thenAnswer((_) async => guide);
      when(() => remote.fetchPage(any())).thenAnswer((_) async => page);
      when(() => remote.fetchLegal(any())).thenAnswer((_) async => legal);
      when(() => remote.fetchLegalVersions(any()))
          .thenAnswer((_) async => versions);
      when(() => remote.fetchLegalVersion(any(), any()))
          .thenAnswer((_) async => version);

      expect(
        await repository.getGuides(
          page: 2,
          category: 'weddings',
          author: 'sara',
        ),
        Ok(guides.toEntity()),
      );
      expect(await repository.getGuide('a-guide'), Ok(guide.toEntity()));
      expect(await repository.getPage('how-it-works'), Ok(page.toEntity()));
      expect(await repository.getLegal(LegalKind.terms), Ok(legal.toEntity()));
      expect(
        await repository.getLegalVersions(LegalKind.privacy),
        Ok(versions.toEntity()),
      );
      expect(
        await repository.getLegalVersion(LegalKind.terms, 1),
        Ok(version.toEntity()),
      );

      verify(
        () => remote.fetchGuides(page: 2, category: 'weddings', author: 'sara'),
      ).called(1);
      verify(() => remote.fetchGuide('a-guide')).called(1);
      verify(() => remote.fetchPage('how-it-works')).called(1);
      verify(() => remote.fetchLegal(LegalKind.terms)).called(1);
      verify(() => remote.fetchLegalVersions(LegalKind.privacy)).called(1);
      verify(() => remote.fetchLegalVersion(LegalKind.terms, 1)).called(1);
    });

    test('NetworkException gives NetworkFailure', () async {
      when(
        () => remote.fetchGuides(
          page: any(named: 'page'),
          category: any(named: 'category'),
          author: any(named: 'author'),
        ),
      ).thenThrow(const NetworkException());

      expect(await repository.getGuides(), _fails(const NetworkFailure()));
    });

    test('ServerException(404) gives NotFoundFailure', () async {
      when(() => remote.fetchLegalVersion(any(), any())).thenThrow(
        const ServerException(statusCode: 404, code: 'api.errors.notFound'),
      );

      expect(
        await repository.getLegalVersion(LegalKind.terms, 3),
        _fails(const NotFoundFailure()),
      );
    });

    test('ServerException(500, code) gives ServerFailure(code)', () async {
      when(() => remote.fetchPage(any())).thenThrow(
        const ServerException(statusCode: 500, code: 'api.errors.unexpected'),
      );

      expect(
        await repository.getPage('x'),
        _fails(
          const ServerFailure(statusCode: 500, code: 'api.errors.unexpected'),
        ),
      );
    });

    test('an answer that does not decode gives ServerFailure', () async {
      when(() => remote.fetchGuide(any()))
          .thenThrow(const FormatException('bad'));
      when(() => remote.fetchLegal(any()))
          .thenThrow(const FormatException('bad'));
      when(() => remote.fetchLegalVersions(any()))
          .thenThrow(const FormatException('bad'));

      expect(await repository.getGuide('x'), _fails(const ServerFailure()));
      expect(
        await repository.getLegal(LegalKind.terms),
        _fails(const ServerFailure()),
      );
      expect(
        await repository.getLegalVersions(LegalKind.terms),
        _fails(const ServerFailure()),
      );
    });
  });
}
