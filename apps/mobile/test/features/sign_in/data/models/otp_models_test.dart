import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/features/sign_in/data/models/otp_models.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/signup_choice.dart';

import '../../../../helpers/api_examples.dart';

void main() {
  test('auth-request.json is the body the app sends', () {
    final json = loadExample('auth-request');
    final model = OtpRequestModel.fromJson(json);
    expect(model.phone, '050 123 4567');
    expect(model.channel, OtpChannel.sms);
    expect(model.toJson(), json);
  });

  test('auth-challenge.json decodes to the challenge', () {
    final challenge = OtpChallengeModel.fromJson(loadExample('auth-challenge'))
        .toEntity(skew: const Duration(seconds: 3));
    expect(challenge.challengeId, '0f6f1f0e-4a3b-4c55-9d0e-1b2c3d4e5f60');
    expect(challenge.channel, OtpChannel.sms);
    expect(challenge.phone, '+971501234567');
    expect(challenge.expiresAt, DateTime.utc(2026, 12, 14, 6, 5));
    expect(challenge.resendAt, DateTime.utc(2026, 12, 14, 6, 1));
    expect(challenge.skew, const Duration(seconds: 3));
  });

  test('a challenge with an unknown channel or a bad date fails to decode', () {
    expect(
      () => OtpChallengeModel.fromJson({
        ...loadExample('auth-challenge'),
        'channel': 'pigeon',
      }),
      throwsFormatException,
    );
    expect(
      () => OtpChallengeModel.fromJson({
        ...loadExample('auth-challenge'),
        'resendAt': 'soon',
      }),
      throwsFormatException,
    );
  });

  test('auth-verify-seeker.json: a client sends no signup', () {
    final json = loadExample('auth-verify-seeker');
    final model = OtpVerifyModel.fromJson(json);
    expect(model.signup, isNull);
    expect(model.toJson(), json);
    expect(
      OtpVerifyModel(
        challengeId: model.challengeId,
        phone: model.phone,
        code: model.code,
        signup: const SignupChoice.seeker(),
      ).toJson(),
      json,
    );
  });

  test(
    'auth-verify-provider.json: a creator sends personas and acceptance',
    () {
      final json = loadExample('auth-verify-provider');
      final model = OtpVerifyModel.fromJson(json);
      expect(
        model.signup,
        const SignupChoice.provider(
          personas: ['photographer', 'videographer'],
          acceptTerms: true,
        ),
      );
      expect(model.toJson(), json);
    },
  );

  test('a seeker with a name (screen 11, feature 012) sends it', () {
    expect(
      const OtpVerifyModel(
        challengeId: 'c',
        phone: '+971501234567',
        code: '482713',
        signup: SignupChoice.seeker(name: 'Sara'),
      ).toJson()['signup'],
      {'accountType': 'seeker', 'name': 'Sara'},
    );
  });

  test('auth-token.json decodes to a new session', () {
    final verified = AuthTokenModel.fromJson(loadExample('auth-token'))
        .toEntity();
    expect(verified.isNew, isTrue);
    expect(verified.session.exp, DateTime.utc(2026, 12, 11, 14, 40));
    expect(verified.session.user.id, '42');
    expect(verified.session.user.accountType, AccountType.provider);
    expect(verified.session.token, startsWith('eyJ'));
  });

  test('me-*.json decode; an unknown accountType reads as unknown', () {
    expect(
      SessionUser.fromMe(loadExample('me-seeker')),
      const SessionUser(
        id: '42',
        name: 'Sara',
        accountType: AccountType.seeker,
      ),
    );
    expect(
      SessionUser.fromMe(loadExample('me-provider')).accountType,
      AccountType.provider,
    );
    expect(
      SessionUser.fromMe({
        ...loadExample('me-seeker'),
        'accountType': 'teacher-in-training',
      }).accountType,
      AccountType.unknown,
    );
    expect(
      () => SessionUser.fromMe({...loadExample('me-seeker'), 'id': 42}),
      throwsFormatException,
    );
  });

  test('auth-refresh.json decodes to a new token and expiry', () {
    final refreshed = refreshedTokenFromJson(loadExample('auth-refresh'));
    expect(refreshed.exp, DateTime.utc(2026, 12, 18, 13, 20));
    expect(refreshed.token, isNotEmpty);
  });
}
