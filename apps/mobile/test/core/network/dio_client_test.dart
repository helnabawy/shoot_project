import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/config/app_config.dart';
import 'package:shoot_mobile/core/network/dio_client.dart';

class _RecordingAdapter implements HttpClientAdapter {
  RequestOptions? lastRequest;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    lastRequest = options;
    return ResponseBody.fromString('{}', 200);
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  test('uses the configured base URL and sends the current language', () async {
    var language = 'en';
    final adapter = _RecordingAdapter();
    final dio = createDio(
      config: const AppConfig(
        apiBaseUrl: 'http://api.test',
        environment: 'test',
      ),
      languageCode: () => language,
    )..httpClientAdapter = adapter;

    await dio.get<dynamic>('/api/health');
    expect(adapter.lastRequest?.uri.toString(), 'http://api.test/api/health');
    expect(adapter.lastRequest?.headers['Accept-Language'], 'en');

    language = 'ar';
    await dio.get<dynamic>('/api/health');
    expect(adapter.lastRequest?.headers['Accept-Language'], 'ar');
  });

  test('tells "cannot reach the server" from "the server answered badly"', () {
    DioException error(DioExceptionType type) =>
        DioException(requestOptions: RequestOptions(), type: type);

    expect(
      isConnectivityError(error(DioExceptionType.connectionError)),
      isTrue,
    );
    expect(isConnectivityError(error(DioExceptionType.receiveTimeout)), isTrue);
    expect(isConnectivityError(error(DioExceptionType.badResponse)), isFalse);
  });
}
