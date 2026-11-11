import 'package:dio/dio.dart';

/// Adds `X-Shoot-Install` (the anonymous install id) to every request.
///
/// The id is read per request through [_installId] (normally
/// `InstallIdStore.id`), so the interceptor holds no state of its own.
final class InstallIdInterceptor extends Interceptor {
  InstallIdInterceptor(this._installId);

  static const header = 'X-Shoot-Install';

  final String Function() _installId;

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    options.headers[header] = _installId();
    handler.next(options);
  }
}
