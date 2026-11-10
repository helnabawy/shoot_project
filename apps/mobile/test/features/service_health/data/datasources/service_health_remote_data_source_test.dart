import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/features/service_health/data/datasources/service_health_remote_data_source.dart';
import 'package:shoot_mobile/features/service_health/data/models/service_health_model.dart';

/// Answers every request with a fixed status and body, or fails with
/// [error]. Real Dio, no network: exercises the datasource's status and
/// error handling as it runs in the app.
class _StubAdapter implements HttpClientAdapter {
  _StubAdapter({this.statusCode = 200, this.body = const {}, this.error});

  final int statusCode;
  final Object body;
  final DioExceptionType? error;
  RequestOptions? lastRequest;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastRequest = options;
    final type = error;
    if (type != null) throw DioException(requestOptions: options, type: type);
    return ResponseBody.fromString(
      jsonEncode(body),
      statusCode,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

ServiceHealthRemoteDataSourceImpl _dataSource(_StubAdapter adapter) {
  final dio = Dio(BaseOptions(baseUrl: 'http://api.test'))
    ..httpClientAdapter = adapter;
  return ServiceHealthRemoteDataSourceImpl(dio);
}

void main() {
  test('GETs /api/health and parses a 200 body', () async {
    final adapter = _StubAdapter(body: const {'status': 'ok', 'db': 'ok'});

    final model = await _dataSource(adapter).fetchHealth();

    expect(model, const ServiceHealthModel(status: 'ok', db: 'ok'));
    expect(adapter.lastRequest?.method, 'GET');
    expect(adapter.lastRequest?.path, '/api/health');
  });

  test('parses the 503 body (API up, database down)', () async {
    final adapter = _StubAdapter(
      statusCode: 503,
      body: const {'status': 'error', 'db': 'unreachable'},
    );

    final model = await _dataSource(adapter).fetchHealth();

    expect(model, const ServiceHealthModel(status: 'error', db: 'unreachable'));
  });

  test('throws ServerException on another error status', () async {
    final adapter = _StubAdapter(statusCode: 500);

    await expectLater(
      _dataSource(adapter).fetchHealth(),
      throwsA(
        isA<ServerException>().having((e) => e.statusCode, 'statusCode', 500),
      ),
    );
  });

  test('throws ServerException on an unreadable body', () async {
    final adapter = _StubAdapter(body: const {'unexpected': true});

    await expectLater(
      _dataSource(adapter).fetchHealth(),
      throwsA(isA<ServerException>()),
    );
  });

  test('throws NetworkException when the server cannot be reached', () async {
    final adapter = _StubAdapter(error: DioExceptionType.connectionError);

    await expectLater(
      _dataSource(adapter).fetchHealth(),
      throwsA(isA<NetworkException>()),
    );
  });
}
