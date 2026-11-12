import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/usecase/use_case.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/domain/repositories/auth_repository.dart';
import 'package:shoot_mobile/features/sign_in/domain/uae_mobile.dart';

typedef RequestCodeParams = ({String phone, OtpChannel channel});

/// Sends a code to a UAE mobile number. A number that is not one fails here,
/// with the same problem the server would answer, and nothing is sent
/// (OT-US1-S9).
final class RequestCode implements UseCase<OtpChallenge, RequestCodeParams> {
  const RequestCode(this._repository);

  /// The problem for a number that is not a UAE mobile.
  static const phoneInvalid = ServerFailure(
    statusCode: 422,
    code: 'api.errors.invalidInput',
    fields: [(path: 'body.phone', code: 'auth.errors.phoneInvalid')],
  );

  final AuthRepository _repository;

  @override
  Future<Result<OtpChallenge>> call(RequestCodeParams params) async {
    if (normaliseUaeMobile(params.phone) == null) {
      return const Err(phoneInvalid);
    }
    return _repository.requestCode(
      phone: params.phone,
      channel: params.channel,
    );
  }
}
