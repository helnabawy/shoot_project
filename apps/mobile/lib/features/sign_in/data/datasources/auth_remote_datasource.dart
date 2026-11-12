import 'package:dio/dio.dart';
import 'package:shoot_mobile/core/error/exceptions.dart';
import 'package:shoot_mobile/core/network/api_post.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/sign_in/data/models/otp_models.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';

/// `auth/otp/request` and `auth/otp/verify`. Each call throws
/// [NetworkException] or [ServerException] (via `apiPost`), or
/// [FormatException] when the answer does not decode; never a Dio type.
/// Nothing here logs: the bodies carry the number and the code.
abstract interface class AuthRemoteDataSource {
  Future<OtpChallenge> requestCode(OtpRequestModel body);

  Future<AuthTokenModel> verifyCode(OtpVerifyModel body);
}

final class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  const AuthRemoteDataSourceImpl(this._dio, this._clock);

  final Dio _dio;
  final Clock _clock;

  @override
  Future<OtpChallenge> requestCode(OtpRequestModel body) async {
    final answer = await apiPost(_dio, 'auth/otp/request', body: body.toJson());
    final receivedAt = _clock.now();
    final serverDate = answer.date;
    final skew = serverDate == null
        ? Duration.zero
        : receivedAt.difference(serverDate);
    return OtpChallengeModel.fromJson(answer.body ?? const {})
        .toEntity(skew: skew);
  }

  @override
  Future<AuthTokenModel> verifyCode(OtpVerifyModel body) async {
    final answer = await apiPost(_dio, 'auth/otp/verify', body: body.toJson());
    return AuthTokenModel.fromJson(answer.body ?? const {});
  }
}
