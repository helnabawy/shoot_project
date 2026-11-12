import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/network/api_post.dart';

/// The session's own calls (`auth/refresh`, `auth/logout`, `me`; contracts/auth-api.md). They run
/// on a [Dio] without the auth interceptor, each with the token passed in, so a refresh never
/// recurses through the interceptor that asked for it (research R14).
///
/// Each throws [NetworkException] or [ServerException] (401 `api.errors.unauthorized` /
/// `api.errors.tokenInvalid`), or [FormatException] for an answer it cannot read.
class AuthApi {
  const AuthApi(this._dio);

  final Dio _dio;

  Future<RefreshedToken> refresh(String token) async {
    final answer = await apiPost(_dio, 'auth/refresh', bearer: token);
    return refreshedTokenFromJson(answer.body ?? const {});
  }

  Future<void> logout(String token) async {
    await apiPost(_dio, 'auth/logout', bearer: token);
  }

  Future<SessionUser> me(String token) async {
    final answer = await apiGetWithToken(_dio, 'me', bearer: token);
    return SessionUser.fromMe(answer.body ?? const {});
  }
}
