import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/config/app_config.dart';
import 'package:shoot_mobile/core/network/install_id_interceptor.dart';

/// Builds the one [Dio] instance the app shares (registered in DI).
///
/// [languageCode] is read on every request so the server answers in the
/// language the app is showing (Payload resolves `Accept-Language`).
/// [installId] is sent as `X-Shoot-Install` (see `InstallIdStore`).
Dio createDio({
  required AppConfig config,
  required String Function() languageCode,
  required String Function() installId,
}) {
  final dio = Dio(
    BaseOptions(
      baseUrl: config.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      sendTimeout: const Duration(seconds: 15),
      headers: const {Headers.acceptHeader: Headers.jsonContentType},
      responseType: ResponseType.json,
    ),
  );
  dio.interceptors
    ..add(LanguageInterceptor(languageCode))
    ..add(InstallIdInterceptor(installId));
  return dio;
}

/// Adds `Accept-Language` to every request.
final class LanguageInterceptor extends Interceptor {
  LanguageInterceptor(this._languageCode);

  final String Function() _languageCode;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.headers['Accept-Language'] = _languageCode();
    handler.next(options);
  }
}

/// True when a [DioException] means "could not reach the server" rather than
/// "the server answered badly".
bool isConnectivityError(DioException error) {
  return switch (error.type) {
    DioExceptionType.connectionTimeout ||
    DioExceptionType.sendTimeout ||
    DioExceptionType.receiveTimeout ||
    DioExceptionType.connectionError => true,
    DioExceptionType.badCertificate ||
    DioExceptionType.badResponse ||
    DioExceptionType.transformTimeout ||
    DioExceptionType.cancel ||
    DioExceptionType.unknown => false,
  };
}
