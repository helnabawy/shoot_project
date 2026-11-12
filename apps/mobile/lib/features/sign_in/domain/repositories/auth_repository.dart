import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/signup_choice.dart';

/// A correct code's outcome: the new session and whether the account was
/// created just now.
final class Verified extends Equatable {
  const Verified({required this.session, required this.isNew});

  final Session session;
  final bool isNew;

  @override
  List<Object?> get props => [session, isNew];
}

/// Sign-in by one-time code (`auth/otp/request`, `auth/otp/verify`).
/// Problems come back as `ServerFailure` with their codes, fields and
/// `retryAfter`.
abstract interface class AuthRepository {
  /// [phone] as typed; the server normalises it.
  Future<Result<OtpChallenge>> requestCode({
    required String phone,
    required OtpChannel channel,
  });

  Future<Result<Verified>> verifyCode({
    required OtpChallenge challenge,
    required String code,
    SignupChoice? signup,
  });
}
