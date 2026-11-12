import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/content/data/datasources/path_status_remote_data_source.dart';
import 'package:shoot_mobile/features/content/data/repositories/path_status_repository_impl.dart';
import 'package:shoot_mobile/features/content/domain/entities/path_status.dart';

import '../../../helpers/scripted_adapter.dart';

void main() {
  PathStatusRepositoryImpl repositoryAnswering(
    ResponseBody Function(RequestOptions) respond, [
    ScriptedAdapter? adapter,
  ]) {
    final scripted = adapter ?? ScriptedAdapter(respond);
    return PathStatusRepositoryImpl(
      PathStatusRemoteDataSourceImpl(
        Dio(BaseOptions(baseUrl: 'http://api.test'))
          ..httpClientAdapter = scripted,
      ),
    );
  }

  group('MG-US4-S2 resolve tells removed from not found', () {
    for (final (wire, status) in [
      ('page', PathStatus.page),
      ('removed', PathStatus.removed),
      ('notFound', PathStatus.notFound),
      ('something-new', PathStatus.notFound),
    ]) {
      test('MG-US4-S2 status "$wire" reads as $status', () async {
        final repository = repositoryAnswering(
          (_) => jsonBody({'status': wire, 'path': '/x', 'locale': 'en'}),
        );
        expect(await repository.getStatus('/x'), Ok(status));
      });
    }

    test('MG-US4-S2 the request is GET resolve?path=<path>', () async {
      final adapter = ScriptedAdapter(
        (_) => jsonBody({'status': 'removed', 'path': '/a'}),
      );
      await repositoryAnswering(
        (_) => throw StateError('unused'),
        adapter,
      ).getStatus('/guides/old one');
      final request = adapter.lastRequest!;
      expect(request.method, 'GET');
      expect(request.path, '/api/mobile/v1/resolve');
      expect(request.queryParameters, {'path': '/guides/old one'});
    });

    test('MG-US4-S2 an answer with no status is a server failure', () async {
      final repository = repositoryAnswering((_) => jsonBody({'path': '/x'}));
      expect(
        await repository.getStatus('/x'),
        const Err<PathStatus>(ServerFailure()),
      );
    });

    test('MG-US4-S2 a dropped connection is a network failure', () async {
      final repository = repositoryAnswering(
        (options) => throw DioException.connectionError(
          requestOptions: options,
          reason: 'offline',
        ),
      );
      expect(
        await repository.getStatus('/x'),
        const Err<PathStatus>(NetworkFailure()),
      );
    });
  });
}
