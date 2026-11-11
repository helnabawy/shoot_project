import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/network/api_get.dart';
import 'package:shoot_mobile/core/network/api_paths.dart';

import '../../helpers/api_fixture.dart';
import '../../helpers/scripted_adapter.dart';

Dio _dio(ResponseBody Function(RequestOptions options) respond) {
  return Dio(BaseOptions(baseUrl: 'http://api.test'))
    ..httpClientAdapter = ScriptedAdapter(respond);
}

Matcher _server({int? status, String? code, List<FieldProblem>? fields}) {
  var matcher = isA<ServerException>()
      .having((e) => e.statusCode, 'statusCode', status)
      .having((e) => e.code, 'code', code);
  if (fields != null) {
    matcher = matcher.having((e) => e.fields, 'fields', fields);
  }
  return throwsA(matcher);
}

void main() {
  test('the v1 prefix', () {
    expect(apiV1, '/api/mobile/v1');
  });

  group('apiGet', () {
    test(
      'returns the object body and calls the v1 address with the query',
      () async {
        final adapter = ScriptedAdapter((_) => jsonBody({'name': 'Shoot'}));
        final dio = Dio(BaseOptions(baseUrl: 'http://api.test'))
          ..httpClientAdapter = adapter;

        final body = await apiGet(dio, 'creators', query: {'page': 2});

        expect(body, {'name': 'Shoot'});
        expect(
          adapter.lastRequest?.uri.toString(),
          'http://api.test/api/mobile/v1/creators?page=2',
        );
      },
    );

    test('accepts a path with a leading slash', () async {
      final adapter = ScriptedAdapter((_) => jsonBody(<String, Object?>{}));
      final dio = Dio(BaseOptions(baseUrl: 'http://api.test'))
        ..httpClientAdapter = adapter;

      await apiGet(dio, '/site');

      expect(adapter.lastRequest?.uri.path, '/api/mobile/v1/site');
    });

    test('decodes an object sent as text', () async {
      final dio = _dio(
        (_) => jsonBody('{"ok":true}', contentType: 'text/plain'),
      );

      expect(await apiGet(dio, 'site'), {'ok': true});
    });

    group('MR-US2-S6 failures', () {
      test(
        'a problem body becomes ServerException(statusCode, code, fields)',
        () {
          final dio = _dio(
            (_) => jsonBody(
              apiFixture('problem-422'),
              status: 422,
              contentType: 'application/problem+json',
            ),
          );

          expect(
            apiGet(dio, 'site'),
            _server(
              status: 422,
              code: 'api.errors.invalidInput',
              fields: const [
                (path: 'query.locale', code: 'api.errors.localeUnsupported'),
              ],
            ),
          );
        },
      );

      test('a 404 problem keeps its code and has no fields', () {
        final dio = _dio(
          (_) => jsonBody(
            apiFixture('problem-404'),
            status: 404,
            contentType: 'application/problem+json',
          ),
        );

        expect(
          apiGet(dio, 'creators/zz'),
          _server(status: 404, code: 'api.errors.notFound', fields: const []),
        );
      });

      test('malformed field entries are skipped', () {
        final dio = _dio(
          (_) => jsonBody(
            {
              'type': 'about:blank',
              'status': 422,
              'code': 'api.errors.invalidInput',
              'fields': [
                {'path': 'body.phone', 'code': 'contact.errors.whatsappFormat'},
                {'path': 3},
                'nope',
              ],
            },
            status: 422,
            contentType: 'application/problem+json',
          ),
        );

        expect(
          apiGet(dio, 'site'),
          _server(
            status: 422,
            code: 'api.errors.invalidInput',
            fields: const [
              (path: 'body.phone', code: 'contact.errors.whatsappFormat'),
            ],
          ),
        );
      });

      test('a non-problem error body gives code: null', () {
        final dio = _dio(
          (_) => jsonBody({
            'errors': [
              {'message': 'Not Found'},
            ],
          }, status: 404),
        );

        expect(
          apiGet(dio, 'site'),
          _server(status: 404, code: null, fields: const []),
        );
      });

      test('an HTML error page gives code: null', () {
        final dio = _dio(
          (_) => jsonBody(
            '<html>Bad gateway</html>',
            status: 502,
            contentType: 'text/html',
          ),
        );

        expect(apiGet(dio, 'site'), _server(status: 502, code: null));
      });

      test('a timeout gives NetworkException', () {
        final dio = _dio(
          (options) => throw DioException(
            requestOptions: options,
            type: DioExceptionType.receiveTimeout,
          ),
        );

        expect(apiGet(dio, 'site'), throwsA(isA<NetworkException>()));
      });

      test('a dropped connection gives NetworkException', () {
        final dio = _dio(
          (options) => throw DioException.connectionError(
            requestOptions: options,
            reason: 'offline',
          ),
        );

        expect(apiGet(dio, 'site'), throwsA(isA<NetworkException>()));
      });

      test('any other Dio failure is a server error without a status', () {
        final dio = _dio(
          (options) => throw DioException(
            requestOptions: options,
            type: DioExceptionType.unknown,
          ),
        );

        expect(apiGet(dio, 'site'), _server(status: null, code: null));
      });

      test('a 200 with a non-object body gives ServerException', () {
        final dio = _dio((_) => jsonBody([1, 2, 3]));

        expect(apiGet(dio, 'site'), _server(status: 200, code: null));
      });

      test('a 200 with unreadable text gives ServerException', () {
        final dio = _dio(
          (_) => jsonBody('not json', contentType: 'text/plain'),
        );

        expect(apiGet(dio, 'site'), _server(status: 200, code: null));
      });

      test(
        'a 200 with JSON text that is not an object gives ServerException',
        () {
          final dio = _dio(
            (_) => jsonBody('"hello"', contentType: 'text/plain'),
          );

          expect(apiGet(dio, 'site'), _server(status: 200, code: null));
        },
      );

      test('a 200 with an empty body gives ServerException', () {
        final dio = _dio((_) => ResponseBody.fromString('', 200));

        expect(apiGet(dio, 'site'), _server(status: 200, code: null));
      });
    });
  });
}
