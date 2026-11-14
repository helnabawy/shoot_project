import 'package:shoot_mobile/core/error/api_result.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/sign_in/data/datasources/auth_remote_datasource.dart';
import 'package:shoot_mobile/features/sign_in/data/models/otp_models.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/signup_choice.dart';
import 'package:shoot_mobile/features/sign_in/domain/repositories/auth_repository.dart';

/// Turns datasource exceptions into failures (see [apiResult]): problems keep
/// their code, fields and `retryAfter`; no connection is a `NetworkFailure`.
final class AuthRepositoryImpl implements AuthRepository {
  const AuthRepositoryImpl(this._remote);

  final AuthRemoteDataSource _remote;

  @override
  Future<Result<OtpChallenge>> requestCode({
    required String phone,
    required OtpChannel channel,
  }) => apiResult(
    () => _remote.requestCode(OtpRequestModel(phone: phone, channel: channel)),
  );

  @override
  Future<Result<Verified>> verifyCode({
    required OtpChallenge challenge,
    required String code,
    SignupChoice? signup,
    bool askIfNew = false,
  }) => apiResult(
    () async => (await _remote.verifyCode(
      OtpVerifyModel(
        challengeId: challenge.challengeId,
        phone: challenge.phone,
        code: code,
        signup: signup,
        askIfNew: askIfNew,
      ),
    )).toEntity(),
  );
}
