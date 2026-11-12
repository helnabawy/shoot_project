import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/network/json_read.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/signup_choice.dart';
import 'package:shoot_mobile/features/sign_in/domain/repositories/auth_repository.dart';

/// The sign-in bodies and answers (`packages/domain/src/api/v1/auth.ts`).
/// Each `fromJson` throws [FormatException] on a missing or mistyped field.

OtpChannel _channel(Json json) {
  final name = readString(json, 'channel');
  for (final channel in OtpChannel.values) {
    if (channel.name == name) return channel;
  }
  throw FormatException('Unknown channel "$name"');
}

DateTime _date(Json json, String key) {
  final value = readString(json, key);
  final parsed = DateTime.tryParse(value);
  if (parsed == null) throw FormatException('Expected a date at "$key"');
  return parsed.toUtc();
}

/// `otpRequestV1`: `{ phone, channel }`, the number as typed.
final class OtpRequestModel {
  const OtpRequestModel({required this.phone, required this.channel});

  factory OtpRequestModel.fromJson(Json json) => OtpRequestModel(
    phone: readString(json, 'phone'),
    channel: _channel(json),
  );

  final String phone;
  final OtpChannel channel;

  Json toJson() => {'phone': phone, 'channel': channel.name};
}

/// `otpChallengeV1`, the 202 of `auth/otp/request`.
final class OtpChallengeModel {
  const OtpChallengeModel(this._json);

  factory OtpChallengeModel.fromJson(Json json) {
    // Read once so a malformed answer fails here.
    final model = OtpChallengeModel(json)..toEntity();
    return model;
  }

  final Json _json;

  /// [skew]: device time at receipt minus the answer's `Date` header.
  OtpChallenge toEntity({Duration skew = Duration.zero}) => OtpChallenge(
    challengeId: readString(_json, 'challengeId'),
    channel: _channel(_json),
    phone: readString(_json, 'phone'),
    expiresAt: _date(_json, 'expiresAt'),
    resendAt: _date(_json, 'resendAt'),
    skew: skew,
  );
}

/// `otpVerifyV1`. A seeker with no name sends no `signup` (the server's
/// default), as in `auth-verify-seeker.json`.
final class OtpVerifyModel {
  const OtpVerifyModel({
    required this.challengeId,
    required this.phone,
    required this.code,
    this.signup,
  });

  factory OtpVerifyModel.fromJson(Json json) {
    final signup = readNullableObject(json, 'signup');
    return OtpVerifyModel(
      challengeId: readString(json, 'challengeId'),
      phone: readString(json, 'phone'),
      code: readString(json, 'code'),
      signup: signup == null
          ? null
          : readString(signup, 'accountType') == 'provider'
          ? SignupChoice.provider(
              personas: readStringList(signup, 'personas'),
              acceptTerms: signup['acceptTerms'] == true,
              name: readNullableString(signup, 'name'),
            )
          : SignupChoice.seeker(name: readNullableString(signup, 'name')),
    );
  }

  final String challengeId;
  final String phone;
  final String code;
  final SignupChoice? signup;

  Json toJson() {
    final s = signup;
    final sendSignup =
        s != null && (s.accountType == AccountType.provider || s.name != null);
    return {
      'challengeId': challengeId,
      'phone': phone,
      'code': code,
      if (sendSignup)
        'signup': {
          'accountType': s.accountType.name,
          if (s.accountType == AccountType.provider) 'personas': s.personas,
          if (s.name != null) 'name': s.name,
          if (s.accountType == AccountType.provider && s.acceptTerms)
            'acceptTerms': true,
        },
    };
  }
}

/// `authTokenV1`, the 200 of `auth/otp/verify`.
final class AuthTokenModel {
  const AuthTokenModel._(this._entity);

  factory AuthTokenModel.fromJson(Json json) => AuthTokenModel._(
    Verified(
      session: Session.fromAuthToken(json),
      isNew: readBool(json, 'isNew'),
    ),
  );

  final Verified _entity;

  Verified toEntity() => _entity;
}
