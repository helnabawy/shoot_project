import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/sign_in/data/models/otp_models.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/signup_choice.dart';
import 'package:shoot_mobile/features/sign_in/domain/repositories/auth_repository.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/verify_code.dart';

import '../../../helpers/api_examples.dart';

class _MockRepository extends Mock implements AuthRepository {}

void main() {
  late _MockRepository repository;
  final challenge = OtpChallengeModel.fromJson(loadExample('auth-challenge'))
      .toEntity();
  final verified = AuthTokenModel.fromJson(loadExample('auth-token'))
      .toEntity();
  const signup = SignupChoice.provider(
    personas: ['photographer', 'videographer'],
    acceptTerms: true,
  );

  setUp(() {
    repository = _MockRepository();
    registerFallbackValue(challenge);
  });

  test('six digits go to the repository with the sign-up choice', () async {
    when(
      () => repository.verifyCode(
        challenge: any(named: 'challenge'),
        code: any(named: 'code'),
        signup: any(named: 'signup'),
      ),
    ).thenAnswer((_) async => Ok(verified));

    final result = await VerifyCode(repository)((
      challenge: challenge,
      code: '482713',
      signup: signup,
    ));

    expect(result, Ok(verified));
    verify(
      () => repository.verifyCode(
        challenge: challenge,
        code: '482713',
        signup: signup,
      ),
    ).called(1);
  });

  for (final code in ['4827', '48271a', '4827133', '']) {
    test('"$code" is refused without spending an attempt', () async {
      final result = await VerifyCode(repository)((
        challenge: challenge,
        code: code,
        signup: null,
      ));
      expect(result, const Err<Verified>(VerifyCode.codeInvalid));
      verifyZeroInteractions(repository);
    });
  }
}
