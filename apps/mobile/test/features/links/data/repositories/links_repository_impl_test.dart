import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/links/data/datasources/links_remote_data_source.dart';
import 'package:shoot_mobile/features/links/data/models/resolution_model.dart';
import 'package:shoot_mobile/features/links/data/repositories/links_repository_impl.dart';
import 'package:shoot_mobile/features/links/domain/entities/resolution.dart';

import '../../../../helpers/api_examples.dart';

Matcher _fails(Failure failure) =>
    isA<Err<Object?>>().having((e) => e.failure, 'failure', failure);

class _MockRemote extends Mock implements LinksRemoteDataSource {}

void main() {
  late _MockRemote remote;
  late LinksRepositoryImpl repository;

  setUp(() {
    remote = _MockRemote();
    repository = LinksRepositoryImpl(remote);
  });

  Future<Result<Resolution>> resolveExample(String name) {
    final model = ResolutionModel.fromJson(loadExample(name));
    when(() => remote.resolve(any())).thenAnswer((_) async => model);
    return repository.resolve('/asked');
  }

  group('MR-US5-S3 links repository', () {
    test(
      'resolve-page gives a ResolvedPage with its kind and params',
      () async {
        expect(
          await resolveExample('resolve-page'),
          const Ok<Resolution>(
            ResolvedPage(
              path: '/creators/0087',
              locale: 'en',
              kind: PlaceKind.creator,
              params: {'code': '0087'},
            ),
          ),
        );
      },
    );

    test('resolve-page.ar gives an Arabic ResolvedPage', () async {
      expect(
        await resolveExample('resolve-page.ar'),
        const Ok<Resolution>(
          ResolvedPage(
            path: '/guides/how-to-brief-a-photographer',
            locale: 'ar',
            kind: PlaceKind.guide,
            params: {'slug': 'how-to-brief-a-photographer'},
          ),
        ),
      );
    });

    test('resolve-removed gives a RemovedPage', () async {
      expect(
        await resolveExample('resolve-removed'),
        const Ok<Resolution>(RemovedPage(path: '/summer-offer', locale: 'en')),
      );
    });

    test('resolve-not-found gives a NoPage', () async {
      expect(
        await resolveExample('resolve-not-found'),
        const Ok<Resolution>(NoPage(path: '/never-was', locale: 'en')),
      );
    });

    test('the path asked is passed to the datasource as is', () async {
      final model = ResolutionModel.fromJson(loadExample('resolve-not-found'));
      when(() => remote.resolve(any())).thenAnswer((_) async => model);

      await repository.resolve('/ar/creators/0087');

      verify(() => remote.resolve('/ar/creators/0087')).called(1);
    });

    test('an unknown kind gives PlaceKind.unknown', () {
      final json = {...loadExample('resolve-page'), 'kind': 'workshop'};

      final entity = ResolutionModel.fromJson(json).toEntity();

      expect(
        entity,
        isA<ResolvedPage>().having((p) => p.kind, 'kind', PlaceKind.unknown),
      );
    });

    test('an unknown status gives NoPage', () {
      final json = {...loadExample('resolve-removed'), 'status': 'moved'};

      expect(
        ResolutionModel.fromJson(json).toEntity(),
        const NoPage(path: '/summer-offer', locale: 'en'),
      );
    });

    test('a page without params does not decode', () {
      final json = {...loadExample('resolve-page')}..remove('params');

      expect(() => ResolutionModel.fromJson(json), throwsFormatException);
    });

    test('NetworkException gives NetworkFailure', () async {
      when(() => remote.resolve(any())).thenThrow(const NetworkException());

      expect(await repository.resolve('/'), _fails(const NetworkFailure()));
    });

    test('ServerException(404) gives NotFoundFailure', () async {
      when(() => remote.resolve(any())).thenThrow(
        const ServerException(statusCode: 404, code: 'api.errors.notFound'),
      );

      expect(await repository.resolve('/'), _fails(const NotFoundFailure()));
    });

    test('ServerException(422, code) gives ServerFailure(code)', () async {
      when(() => remote.resolve(any())).thenThrow(
        const ServerException(statusCode: 422, code: 'api.errors.invalidField'),
      );

      expect(
        await repository.resolve('//x'),
        _fails(
          const ServerFailure(statusCode: 422, code: 'api.errors.invalidField'),
        ),
      );
    });

    test('an answer that does not decode gives ServerFailure', () async {
      when(() => remote.resolve(any())).thenThrow(const FormatException('bad'));

      expect(await repository.resolve('/'), _fails(const ServerFailure()));
    });

    test('any other exception gives UnexpectedFailure', () async {
      when(() => remote.resolve(any())).thenThrow(Exception('boom'));

      expect(await repository.resolve('/'), _fails(const UnexpectedFailure()));
    });
  });
}
