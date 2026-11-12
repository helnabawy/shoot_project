import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/usecase/use_case.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/signup_choice.dart';
import 'package:shoot_mobile/features/sign_in/domain/repositories/auth_repository.dart';

typedef VerifyCodeParams = ({
  OtpChallenge challenge,
  String code,
  SignupChoice? signup,
});

/// Checks a code. A code that is not six digits fails here, as the server
/// would, without spending an attempt.
final class VerifyCode implements UseCase<Verified, VerifyCodeParams> {
  const VerifyCode(this._repository);

  static const codeInvalid = ServerFailure(
    statusCode: 422,
    code: 'auth.errors.codeInvalid',
    fields: [(path: 'body.code', code: 'auth.errors.codeInvalid')],
  );

  final AuthRepository _repository;

  @override
  Future<Result<Verified>> call(VerifyCodeParams params) async {
    if (!RegExp(r'^\d{6}$').hasMatch(params.code)) {
      return const Err(codeInvalid);
    }
    return _repository.verifyCode(
      challenge: params.challenge,
      code: params.code,
      signup: params.signup,
    );
  }
}
