import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/sign_in/data/models/otp_models.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/domain/repositories/auth_repository.dart';
import 'package:shoot_mobile/features/sign_in/domain/uae_mobile.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/request_code.dart';

import '../../../helpers/api_examples.dart';

class _MockRepository extends Mock implements AuthRepository {}

void main() {
  late _MockRepository repository;
  final challenge = OtpChallengeModel.fromJson(loadExample('auth-challenge'))
      .toEntity();

  setUpAll(() => registerFallbackValue(OtpChannel.sms));
  setUp(() => repository = _MockRepository());

  test('a UAE mobile number goes to the repository as typed', () async {
    when(
      () => repository.requestCode(
        phone: any(named: 'phone'),
        channel: any(named: 'channel'),
      ),
    ).thenAnswer((_) async => Ok(challenge));
    final request = loadExample('auth-request');

    final result = await RequestCode(repository)((
      phone: request['phone']! as String,
      channel: OtpChannel.sms,
    ));

    expect(result, Ok(challenge));
    verify(
      () => repository.requestCode(
        phone: '050 123 4567',
        channel: OtpChannel.sms,
      ),
    ).called(1);
  });

  for (final number in [
    '44 123 4567',
    '04 123 4567',
    '+44 7700 900123',
    '50 123',
    '',
  ]) {
    test('OT-US1-S9 "$number" is refused and nothing is sent', () async {
      final result = await RequestCode(repository)((
        phone: number,
        channel: OtpChannel.whatsapp,
      ));
      expect(result, const Err<OtpChallenge>(RequestCode.phoneInvalid));
      expect(
        (result as Err).failure,
        isA<ServerFailure>().having(
          (f) => f.fieldCode('body.phone'),
          'field',
          'auth.errors.phoneInvalid',
        ),
      );
      verifyZeroInteractions(repository);
    });
  }

  group('normaliseUaeMobile, the twin of the domain package rule', () {
    for (final (typed, e164) in [
      ('050 123 4567', '+971501234567'),
      ('50 123 4567', '+971501234567'),
      ('971501234567', '+971501234567'),
      ('00971501234567', '+971501234567'),
      ('+971 (50) 123-4567', '+971501234567'),
      ('+971 4 123 4567', null),
      ('0412345678', null),
      ('+447700900123', null),
    ]) {
      test('"$typed" → $e164', () => expect(normaliseUaeMobile(typed), e164));
    }

    test('displays as on the boards', () {
      expect(displayUaeMobile('+971501234567'), '+971 50 123 4567');
      expect(displayUaeMobile('+447700900123'), '+447700900123');
    });
  });
}
