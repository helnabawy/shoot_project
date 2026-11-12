import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:shoot_mobile/core/config/app_config.dart';
import 'package:shoot_mobile/core/network/install_id_interceptor.dart';

/// Builds the one [Dio] instance the app shares (registered in DI).
///
/// [languageCode] is read on every request so the server answers in the
/// language the app is showing (Payload resolves `Accept-Language`).
/// [installId] is sent as `X-Shoot-Install` (see `InstallIdStore`).
/// [auth] (feature 009's `AuthInterceptor`) runs after the install id; the
/// session's own calls use a Dio built without it. [log] adds the debug-only
/// [RequestLogInterceptor]; release builds never log from Dio.
Dio createDio({
  required AppConfig config,
  required String Function() languageCode,
  required String Function() installId,
  Interceptor? auth,
  bool log = !kReleaseMode,
}) {
  final dio = Dio(
    BaseOptions(
      baseUrl: config.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      // Debug builds wait longer: a dev server on a remote database answers a save in ~15 s.
      receiveTimeout: const Duration(seconds: kReleaseMode ? 15 : 60),
      sendTimeout: const Duration(seconds: 15),
      headers: const {Headers.acceptHeader: Headers.jsonContentType},
      responseType: ResponseType.json,
    ),
  );
  dio.interceptors
    ..add(LanguageInterceptor(languageCode))
    ..add(InstallIdInterceptor(installId));
  if (auth != null) dio.interceptors.add(auth);
  if (log) dio.interceptors.add(RequestLogInterceptor());
  return dio;
}

/// Debug builds only: one line per answer, `GET /api/mobile/v1/site → 200`. Never a header, a
/// body, a query or a token, and nothing at all for the sign-in and account calls (`auth/*`,
/// `me`), whose bodies carry phone numbers and codes (feature 009, FR-034).
final class RequestLogInterceptor extends Interceptor {
  RequestLogInterceptor([DebugPrintCallback? print]) : _print = print;

  final DebugPrintCallback? _print;

  static final _private = RegExp(r'/api/mobile/v1/(auth/|me$)');

  void _log(RequestOptions options, int? status) {
    final path = options.uri.path;
    if (_private.hasMatch(path)) return;
    (_print ?? debugPrint)(
      '${options.method} $path → ${status ?? 'no answer'}',
    );
  }

  @override
  void onResponse(
    Response<dynamic> response,
    ResponseInterceptorHandler handler,
  ) {
    _log(response.requestOptions, response.statusCode);
    handler.next(response);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    _log(err.requestOptions, err.response?.statusCode);
    handler.next(err);
  }
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
