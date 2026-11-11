import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/features/site/data/datasources/site_remote_data_source.dart';

import '../../../../helpers/api_examples.dart';
import '../../../../helpers/scripted_adapter.dart';

void main() {
  group('MR-US1-S1 site datasource', () {
    late ScriptedAdapter adapter;
    late SiteRemoteDataSourceImpl source;

    setUp(() {
      adapter = ScriptedAdapter((options) {
        // The example files are named after the endpoint path.
        return jsonBody(loadExample(options.path.split('/').last));
      });
      source = SiteRemoteDataSourceImpl(
        Dio(BaseOptions(baseUrl: 'http://api.test'))
          ..httpClientAdapter = adapter,
      );
    });

    test('each read calls its v1 path and decodes the answer', () async {
      expect((await source.fetchSite()).toEntity().siteName, 'Shoot');
      expect((await source.fetchNavigation()).toEntity().header, isNotEmpty);
      expect((await source.fetchAudience()).toEntity().personas, isNotEmpty);
      expect((await source.fetchBriefBuilder()).toEntity().enabled, isTrue);

      expect(adapter.requests.map((r) => r.path), [
        '/api/mobile/v1/site',
        '/api/mobile/v1/navigation',
        '/api/mobile/v1/personas',
        '/api/mobile/v1/brief-builder',
      ]);
    });

    test('a problem answer throws ServerException with its code', () async {
      final failing = SiteRemoteDataSourceImpl(
        Dio(BaseOptions(baseUrl: 'http://api.test'))
          ..httpClientAdapter = ScriptedAdapter(
            (_) => jsonBody(
              loadExample('problem-404'),
              status: 404,
              contentType: 'application/problem+json',
            ),
          ),
      );

      expect(
        failing.fetchSite(),
        throwsA(
          isA<ServerException>()
              .having((e) => e.statusCode, 'statusCode', 404)
              .having((e) => e.code, 'code', 'api.errors.notFound'),
        ),
      );
    });
  });
}
