import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creators/data/datasources/creators_remote_data_source.dart';
import 'package:shoot_mobile/features/creators/data/repositories/creators_repository_impl.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';

import '../../../../helpers/api_examples.dart';
import '../../../../helpers/scripted_adapter.dart';

Matcher _fails(Failure failure) =>
    isA<Err<Object?>>().having((e) => e.failure, 'failure', failure);

/// The example named after the endpoint a request went to.
ResponseBody _examples(RequestOptions options) {
  final path = options.path.replaceFirst('/api/mobile/v1/', '');
  final name = switch (path.split('/')) {
    ['creators'] => 'creators',
    ['creators', _] => 'creator-profile',
    ['work', _] => 'specialty',
    ['hire', _] => 'hire-page',
    _ => throw StateError('no example for $path'),
  };
  return jsonBody(loadExample(name));
}

void main() {
  late ScriptedAdapter adapter;

  CreatorsRepositoryImpl repositoryAnswering(
    ResponseBody Function(RequestOptions options) respond,
  ) {
    adapter = ScriptedAdapter(respond);
    return CreatorsRepositoryImpl(
      CreatorsRemoteDataSourceImpl(
        Dio(BaseOptions(baseUrl: 'http://api.test'))
          ..httpClientAdapter = adapter,
      ),
    );
  }

  group('MR-US3-S1 the directory', () {
    test('filters and page are passed as query values', () async {
      final repository = repositoryAnswering(_examples);

      final result = await repository.getCreators(
        const CreatorQuery(
          type: 'photographer',
          specialty: 'weddings',
          place: 'dubai',
          page: 2,
        ),
      );

      expect(result, isA<Ok<CreatorList>>());
      expect(adapter.lastRequest!.path, '/api/mobile/v1/creators');
      expect(adapter.lastRequest!.queryParameters, {
        'type': 'photographer',
        'specialty': 'weddings',
        'place': 'dubai',
        'page': '2',
      });
    });

    test('no filter sends no query value, and page 1 is not sent', () async {
      final repository = repositoryAnswering(_examples);

      await repository.getCreators();
      expect(adapter.lastRequest!.queryParameters, isEmpty);
      await repository.getCreators(const CreatorQuery(page: 1));
      expect(adapter.lastRequest!.queryParameters, isEmpty);
    });
  });

  group('MR-US3-S2 profile, specialty and hire page', () {
    test('each read calls its path, encoded, and maps to the entity', () async {
      final repository = repositoryAnswering(_examples);

      final profile = await repository.getProfile('sh-0087');
      expect(
        profile,
        isA<Ok<CreatorProfile>>().having(
          (r) => r.value.displayCode,
          'displayCode',
          'SH-0087',
        ),
      );
      expect(
        await repository.getSpecialty('weddings'),
        isA<Ok<SpecialtyPage>>(),
      );
      expect(await repository.getHirePage('مصور-اعراس'), isA<Ok<HirePage>>());

      expect(adapter.requests.map((r) => r.path), [
        '/api/mobile/v1/creators/sh-0087',
        '/api/mobile/v1/work/weddings',
        '/api/mobile/v1/hire/${Uri.encodeComponent('مصور-اعراس')}',
      ]);
    });

    test('a 404 problem gives NotFoundFailure', () async {
      final repository = repositoryAnswering(
        (_) => jsonBody(
          loadExample('problem-404'),
          status: 404,
          contentType: 'application/problem+json',
        ),
      );

      expect(
        await repository.getProfile('ZZZZZ'),
        _fails(const NotFoundFailure()),
      );
      expect(
        await repository.getSpecialty('nope'),
        _fails(const NotFoundFailure()),
      );
      expect(
        await repository.getHirePage('nope'),
        _fails(const NotFoundFailure()),
      );
    });

    test('a dropped connection gives NetworkFailure', () async {
      final repository = repositoryAnswering(
        (options) => throw DioException.connectionError(
          requestOptions: options,
          reason: 'offline',
        ),
      );

      expect(await repository.getCreators(), _fails(const NetworkFailure()));
    });

    test('a 500 problem gives ServerFailure with its code', () async {
      final repository = repositoryAnswering(
        (_) => jsonBody(
          {
            'type': 'about:blank',
            'status': 500,
            'code': 'api.errors.unexpected',
          },
          status: 500,
          contentType: 'application/problem+json',
        ),
      );

      expect(
        await repository.getProfile('0087'),
        _fails(
          const ServerFailure(statusCode: 500, code: 'api.errors.unexpected'),
        ),
      );
    });

    test('an answer that does not decode gives ServerFailure', () async {
      final repository = repositoryAnswering((_) => jsonBody({'locale': 'en'}));

      expect(await repository.getHirePage('x'), _fails(const ServerFailure()));
    });
  });
}
