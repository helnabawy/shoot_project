import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/sign_in/data/datasources/auth_remote_datasource.dart';
import 'package:shoot_mobile/features/sign_in/data/models/otp_models.dart';
import 'package:shoot_mobile/features/sign_in/data/repositories/auth_repository_impl.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/signup_choice.dart';
import 'package:shoot_mobile/features/sign_in/domain/repositories/auth_repository.dart';

import '../../../../helpers/api_examples.dart';
import '../../../../helpers/scripted_adapter.dart';

void main() {
  late ScriptedAdapter adapter;
  final challenge = OtpChallengeModel.fromJson(loadExample('auth-challenge'))
      .toEntity();

  AuthRepository repository(
    ResponseBody Function(RequestOptions) respond, {
    DateTime? now,
  }) {
    adapter = ScriptedAdapter(respond);
    final dio = Dio(BaseOptions(baseUrl: 'http://api.test'))
      ..httpClientAdapter = adapter;
    return AuthRepositoryImpl(
      AuthRemoteDataSourceImpl(
        dio,
        FixedClock(now ?? DateTime.utc(2026, 12, 14, 6, 0, 18)),
      ),
    );
  }

  ResponseBody problem(int status, Map<String, Object?> body) => jsonBody(
    {'type': 'about:blank', 'status': status, ...body},
    status: status,
    contentType: 'application/problem+json',
  );

  test('requestCode posts the typed number and channel; the Date header sets the skew', () async {
    final repo = repository(
      (_) => ResponseBody.fromString(
        jsonEncode(loadExample('auth-challenge')),
        202,
        headers: {
          Headers.contentTypeHeader: ['application/json'],
          'date': [HttpDate.format(DateTime.utc(2026, 12, 14, 6, 0, 10))],
        },
      ),
    );
    final result = await repo.requestCode(
      phone: '050 123 4567',
      channel: OtpChannel.whatsapp,
    );
    final request = adapter.lastRequest!;
    expect(request.method, 'POST');
    expect(request.path, '/api/mobile/v1/auth/otp/request');
    expect(request.data, {'phone': '050 123 4567', 'channel': 'whatsapp'});
    expect((result as Ok<OtpChallenge>).value.skew, const Duration(seconds: 8));
  });

  test('verifyCode posts the challenge, the number in E.164, the code and the sign-up', () async {
    final repo = repository((_) => jsonBody(loadExample('auth-token')));
    final result = await repo.verifyCode(
      challenge: challenge,
      code: '482713',
      signup: const SignupChoice.provider(
        personas: ['photographer', 'videographer'],
        acceptTerms: true,
      ),
    );
    expect(adapter.lastRequest!.path, '/api/mobile/v1/auth/otp/verify');
    expect(adapter.lastRequest!.data, loadExample('auth-verify-provider'));
    expect((result as Ok<Verified>).value.isNew, isTrue);
  });

  group('problems become failures with their codes', () {
    test('422 phoneInvalid keeps its field', () async {
      final repo = repository(
        (_) => problem(422, {
          'code': 'api.errors.invalidInput',
          'fields': [
            {'path': 'body.phone', 'code': 'auth.errors.phoneInvalid'},
          ],
        }),
      );
      final result = await repo.requestCode(
        phone: '1',
        channel: OtpChannel.sms,
      );
      final failure = (result as Err).failure as ServerFailure;
      expect(failure.statusCode, 422);
      expect(failure.fieldCode('body.phone'), 'auth.errors.phoneInvalid');
    });

    for (final (status, code) in [
      (422, 'auth.errors.codeInvalid'),
      (422, 'auth.errors.codeExpired'),
      (422, 'auth.errors.codeLocked'),
      (403, 'auth.errors.useEmailSignIn'),
      (503, 'auth.errors.sendFailed'),
    ]) {
      test('$status $code', () async {
        final repo = repository((_) => problem(status, {'code': code}));
        final result = await repo.verifyCode(
          challenge: challenge,
          code: '000000',
        );
        expect(
          result,
          Err<Verified>(ServerFailure(statusCode: status, code: code)),
        );
      });
    }

    test('429 keeps retryAfter', () async {
      final repo = repository(
        (_) => problem(429, {
          'code': 'auth.errors.resendTooSoon',
          'retryAfter': 42,
        }),
      );
      final result = await repo.requestCode(
        phone: '050 123 4567',
        channel: OtpChannel.sms,
      );
      expect(
        result,
        const Err<OtpChallenge>(
          ServerFailure(
            statusCode: 429,
            code: 'auth.errors.resendTooSoon',
            retryAfter: 42,
          ),
        ),
      );
    });
  });

  test('a network error is a NetworkFailure', () async {
    final repo = repository(
      (o) => throw DioException(
        requestOptions: o,
        type: DioExceptionType.connectionError,
      ),
    );
    expect(
      await repo.requestCode(phone: '050 123 4567', channel: OtpChannel.sms),
      const Err<OtpChallenge>(NetworkFailure()),
    );
  });

  test('an unreadable answer is a ServerFailure', () async {
    final repo = repository((_) => jsonBody({'token': 1}));
    expect(
      await repo.verifyCode(challenge: challenge, code: '482713'),
      const Err<Verified>(ServerFailure()),
    );
  });
}
