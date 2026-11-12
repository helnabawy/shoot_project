import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/features/content/data/datasources/content_remote_data_source.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';

import '../../../../helpers/api_examples.dart';
import '../../../../helpers/scripted_adapter.dart';

/// The example a path answers with.
String _exampleFor(String path) {
  final rest = path.replaceFirst('/api/mobile/v1/', '');
  if (rest == 'guides') return 'guides';
  if (rest.startsWith('guides/')) return 'guide';
  if (rest.startsWith('pages/')) return 'page';
  if (rest.endsWith('/versions')) return 'legal-versions';
  if (rest.contains('/versions/')) return 'legal-version';
  return 'legal';
}

void main() {
  group('MR-US4-S5 content datasource', () {
    late ScriptedAdapter adapter;
    late ContentRemoteDataSourceImpl source;

    setUp(() {
      adapter = ScriptedAdapter(
        (options) => jsonBody(loadExample(_exampleFor(options.path))),
      );
      source = ContentRemoteDataSourceImpl(
        Dio(BaseOptions(baseUrl: 'http://api.test'))
          ..httpClientAdapter = adapter,
      );
    });

    test('each read calls its v1 path with its params and decodes', () async {
      expect((await source.fetchGuides()).toEntity().items, isNotEmpty);
      await source.fetchGuides(page: 2, category: 'weddings', author: 'sara');
      expect(
        (await source.fetchGuide('brief a/b')).toEntity().summary.slug,
        'brief-a-wedding-photographer',
      );
      expect(
        (await source.fetchPage('how-it-works')).toEntity().title,
        'How it works',
      );
      expect(
        (await source.fetchLegal(LegalKind.professionalTerms))
            .toEntity()
            .version,
        2,
      );
      expect(
        (await source.fetchLegalVersions(LegalKind.terms)).toEntity().versions,
        hasLength(2),
      );
      expect(
        (await source.fetchLegalVersion(
          LegalKind.privacy,
          1,
        )).toEntity().version,
        1,
      );

      expect(adapter.requests.map((r) => r.path), [
        '/api/mobile/v1/guides',
        '/api/mobile/v1/guides',
        '/api/mobile/v1/guides/brief%20a%2Fb',
        '/api/mobile/v1/pages/how-it-works',
        '/api/mobile/v1/legal/professional-terms',
        '/api/mobile/v1/legal/terms/versions',
        '/api/mobile/v1/legal/privacy/versions/1',
      ]);
      expect(adapter.requests.first.queryParameters, isEmpty);
      expect(adapter.requests[1].queryParameters, {
        'page': '2',
        'category': 'weddings',
        'author': 'sara',
      });
    });

    test('a 404 problem throws ServerException with its code', () {
      final failing = ContentRemoteDataSourceImpl(
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
        failing.fetchLegalVersion(LegalKind.terms, 3),
        throwsA(
          isA<ServerException>()
              .having((e) => e.statusCode, 'statusCode', 404)
              .having((e) => e.code, 'code', 'api.errors.notFound'),
        ),
      );
    });
  });
}
