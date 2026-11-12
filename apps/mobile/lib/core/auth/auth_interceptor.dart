import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/auth/auth_api.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/time/clock.dart';

/// Adds `Authorization: Bearer <token>` while signed in, and refreshes the token ahead of expiry
/// (research R14).
///
/// - When fewer than [refreshAhead] remain, `POST auth/refresh` runs first through [AuthApi]
///   (a separate Dio without this interceptor). As a [QueuedInterceptor] requests wait their
///   turn, so one refresh serves every request queued behind it.
/// - A refresh that fails on the network keeps the old token; one answered 401 signs out.
/// - A 401 on a request that carried a token calls [SessionCubit.expire]: since tokens are
///   refreshed ahead of time, a 401 always means "signed out".
/// - It never logs: no headers, no bodies, no tokens.
final class AuthInterceptor extends QueuedInterceptor {
  AuthInterceptor({
    required this._session,
    required this._api,
    required this._clock,
  });

  static const refreshAhead = Duration(days: 2);

  /// Set on requests that carried the token, so [onError] knows a 401 is about it.
  static const _carried = 'auth.carriedToken';

  final SessionCubit _session;
  final AuthApi _api;
  final Clock _clock;

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    await _refreshIfDue();
    final token = _session.token;
    if (token != null && !options.headers.containsKey('Authorization')) {
      options.headers['Authorization'] = 'Bearer $token';
      options.extra[_carried] = true;
    }
    handler.next(options);
  }

  Future<void> _refreshIfDue() async {
    final current = _session.state;
    if (current is! SignedIn) return;
    if (current.session.exp.difference(_clock.now()) >= refreshAhead) return;
    try {
      await _session.updateToken(await _api.refresh(current.session.token));
    } on ServerException catch (e) {
      if (e.statusCode == 401) await _session.expire();
    } on Object {
      // Offline or an unreadable answer: the old token still works for now.
    }
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401 &&
        err.requestOptions.extra[_carried] == true) {
      await _session.expire();
    }
    handler.next(err);
  }
}
