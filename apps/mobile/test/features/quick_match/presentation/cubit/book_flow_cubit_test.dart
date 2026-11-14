import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/quick_match/domain/entities/quick_match.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/book_flow_cubit.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/signup_choice.dart';
import 'package:shoot_mobile/features/sign_in/domain/repositories/auth_repository.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/request_code.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/verify_code.dart';

import '../../../../helpers/auth_fixtures.dart';
import '../../../../helpers/quick_match_fixtures.dart';
import '../../../../helpers/sign_in_harness.dart';

void main() {
  late MockQuickMatchRepository repository;
  late MockAuthRepository auth;

  const picks = [Pick(persona: 'photographer', code: '0087')];

  SessionCubit session({bool signedIn = false}) => SessionCubit(
    store: MemorySessionStore(),
    api: MockAuthApi(),
    clock: examplesClock,
    restored: signedIn ? exampleSession(exp: DateTime.utc(2027)) : null,
    storeRead: true,
  );

  BookFlowCubit make({bool signedIn = false}) => BookFlowCubit(
    repository: repository,
    requestCode: RequestCode(auth),
    verifyCode: VerifyCode(auth),
    session: session(signedIn: signedIn),
    clock: examplesClock,
    ref: exampleRef,
    key: exampleKey,
  )..begin(picks: picks, date: '2026-12-20', duration: '2h');

  BookFlowCubit filled({bool signedIn = false}) => make(signedIn: signedIn)
    ..startTimeChanged('18:30')
    ..venueChanged('Dubai Marina');

  setUpAll(() {
    registerFallbackValue(exampleChallenge());
    registerFallbackValue(OtpChannel.sms);
    registerFallbackValue(const SignupChoice.seeker());
    registerFallbackValue(
      const BookingDetails(date: '', startTime: '', duration: '', venue: ''),
    );
    registerFallbackValue(<Pick>[]);
  });

  setUp(() {
    repository = MockQuickMatchRepository();
    auth = MockAuthRepository();
    when(() => repository.issueQuotation(any(), any(), any(), any()))
        .thenAnswer((_) async => Ok(exampleIssued()));
  });

  group('MQ-US2 details', () {
    test('MQ-US2-S1 date, duration and creators carry over from the brief', () {
      final cubit = make();
      expect(cubit.state.date, '2026-12-20');
      expect(cubit.state.duration, '2h');
      expect(cubit.state.picks, picks);
    });

    test('MQ-US2-S2 changing the duration keeps the rest', () {
      final cubit = filled()..durationChanged('3h');
      expect(cubit.state.duration, '3h');
      expect(cubit.state.venue, 'Dubai Marina');
    });

    test(
      'MQ-US2-S4 a missing time or venue is marked and nothing is sent',
      () async {
        final cubit = make();
        expect(cubit.validateDetails(), isFalse);
        expect(cubit.state.errors, {
          'startTime': 'booking.errors.startTime',
          'venue': 'booking.errors.venue',
        });
        await cubit.continueSignedIn();
        verifyNever(
          () => repository.issueQuotation(any(), any(), any(), any()),
        );
      },
    );

    test('MQ-US2-S4 a past date is marked', () {
      final cubit = filled()..dateChanged('2026-12-01');
      expect(cubit.validateDetails(), isFalse);
      expect(cubit.state.errors['date'], 'booking.errors.date');
    });

    test('MQ-US2-S4 fixing a field clears only its message', () {
      final cubit = make()..validateDetails();
      cubit.venueChanged('Marina');
      expect(cubit.state.errors.keys, ['startTime']);
    });
  });

  group('MQ-US2 the number at the end', () {
    test(
      'MQ-US2-S6 a valid number sends a code through the chosen channel',
      () async {
        when(
          () => auth.requestCode(
            phone: any(named: 'phone'),
            channel: any(named: 'channel'),
          ),
        ).thenAnswer((_) async => Ok(exampleChallenge()));
        final cubit = filled()
          ..phoneChanged('50 123 4567')
          ..channelChanged(OtpChannel.whatsapp);
        await cubit.sendCode();
        expect(cubit.state.status, BookStatus.awaitingCode);
        verify(
          () => auth.requestCode(
            phone: '50 123 4567',
            channel: OtpChannel.whatsapp,
          ),
        ).called(1);
      },
    );

    test('a number that is not a UAE mobile sends nothing', () async {
      final cubit = filled()..phoneChanged('12');
      await cubit.sendCode();
      verifyNever(
        () => auth.requestCode(
          phone: any(named: 'phone'),
          channel: any(named: 'channel'),
        ),
      );
      expect(cubit.state.status, BookStatus.editing);
    });

    test('MQ-US2-S8 a correct code signs in, saves the quotation and hands back WhatsApp', () async {
      when(
        () => auth.requestCode(
          phone: any(named: 'phone'),
          channel: any(named: 'channel'),
        ),
      ).thenAnswer((_) async => Ok(exampleChallenge()));
      when(
        () => auth.verifyCode(
          challenge: any(named: 'challenge'),
          code: any(named: 'code'),
          signup: any(named: 'signup'),
          askIfNew: any(named: 'askIfNew'),
        ),
      ).thenAnswer(
        (_) async => Ok(Verified(session: exampleSession(), isNew: true)),
      );
      final cubit = filled()
        ..phoneChanged('501234567')
        ..nameChanged('Layla');
      await cubit.sendCode();
      await cubit.submit('123456');
      expect(cubit.signedIn, isTrue);
      expect(cubit.state.status, BookStatus.done);
      expect(cubit.state.issued!.reference, 'Q-4F8Z2');
      expect(cubit.state.issued!.whatsappUrl, startsWith('https://wa.me/'));
      final signup =
          verify(
                () => auth.verifyCode(
                  challenge: any(named: 'challenge'),
                  code: '123456',
                  signup: captureAny(named: 'signup'),
                  askIfNew: any(named: 'askIfNew'),
                ),
              ).captured.single
              as SignupChoice;
      expect(signup.name, 'Layla');
      verify(
        () => repository.issueQuotation(exampleRef, exampleKey, picks, any()),
      ).called(1);
    });

    test('MQ-US2-S9 a wrong code shows the error and saves nothing', () async {
      when(
        () => auth.requestCode(
          phone: any(named: 'phone'),
          channel: any(named: 'channel'),
        ),
      ).thenAnswer((_) async => Ok(exampleChallenge()));
      when(
        () => auth.verifyCode(
          challenge: any(named: 'challenge'),
          code: any(named: 'code'),
          signup: any(named: 'signup'),
          askIfNew: any(named: 'askIfNew'),
        ),
      ).thenAnswer(
        (_) async => const Err(
          ServerFailure(statusCode: 422, code: 'auth.errors.codeInvalid'),
        ),
      );
      final cubit = filled()..phoneChanged('501234567');
      await cubit.sendCode();
      await cubit.submit('000000');
      expect(cubit.state.status, BookStatus.codeInvalid);
      expect(cubit.state.errorCount, 1);
      expect(cubit.signedIn, isFalse);
      verifyNever(() => repository.issueQuotation(any(), any(), any(), any()));
      cubit.tryAgain();
      expect(cubit.state.status, BookStatus.awaitingCode);
    });

    test(
      'changing the number returns to editing with the number kept',
      () async {
        when(
          () => auth.requestCode(
            phone: any(named: 'phone'),
            channel: any(named: 'channel'),
          ),
        ).thenAnswer((_) async => Ok(exampleChallenge()));
        final cubit = filled()..phoneChanged('501234567');
        await cubit.sendCode();
        cubit.changeNumber();
        expect(cubit.state.status, BookStatus.editing);
        expect(cubit.state.phone, '501234567');
        expect(cubit.state.challenge, isNull);
      },
    );

    test('MQ-US2-S10 a signed-in person skips the number and the code: one tap saves', () async {
      final cubit = filled(signedIn: true);
      expect(cubit.signedIn, isTrue);
      expect(await cubit.continueSignedIn(), isTrue);
      expect(cubit.state.status, BookStatus.done);
      verifyNever(
        () => auth.requestCode(
          phone: any(named: 'phone'),
          channel: any(named: 'channel'),
        ),
      );
    });
  });

  group('MQ-US2 edge cases', () {
    test('a creator no longer free sends the person back to step 2', () async {
      when(
        () => repository.issueQuotation(any(), any(), any(), any()),
      ).thenAnswer(
        (_) async => const Err(
          ServerFailure(statusCode: 409, code: 'booking.errors.unavailable'),
        ),
      );
      final cubit = filled(signedIn: true);
      await cubit.continueSignedIn();
      expect(cubit.state.status, BookStatus.unavailable);
    });

    test('a field the server names is shown on that field', () async {
      when(() => repository.issueQuotation(any(), any(), any(), any()))
          .thenAnswer(
            (_) async => const Err(
              ServerFailure(
                statusCode: 422,
                code: 'api.errors.invalidInput',
                fields: [
                  (path: 'body.details.venue', code: 'booking.errors.venue'),
                ],
              ),
            ),
          );
      final cubit = filled(signedIn: true);
      await cubit.continueSignedIn();
      expect(cubit.state.status, BookStatus.editing);
      expect(cubit.state.errors['venue'], 'booking.errors.venue');
    });

    test('issuing failing after sign-in keeps the person signed in and can be retried without a code', () async {
      when(
        () => auth.requestCode(
          phone: any(named: 'phone'),
          channel: any(named: 'channel'),
        ),
      ).thenAnswer((_) async => Ok(exampleChallenge()));
      when(
        () => auth.verifyCode(
          challenge: any(named: 'challenge'),
          code: any(named: 'code'),
          signup: any(named: 'signup'),
          askIfNew: any(named: 'askIfNew'),
        ),
      ).thenAnswer(
        (_) async => Ok(Verified(session: exampleSession(), isNew: false)),
      );
      var calls = 0;
      when(
        () => repository.issueQuotation(any(), any(), any(), any()),
      ).thenAnswer((_) async {
        calls += 1;
        return calls == 1 ? const Err(NetworkFailure()) : Ok(exampleIssued());
      });
      final cubit = filled()..phoneChanged('501234567');
      await cubit.sendCode();
      await cubit.submit('123456');
      expect(cubit.state.status, BookStatus.failed);
      expect(cubit.signedIn, isTrue);
      await cubit.issue();
      expect(cubit.state.status, BookStatus.done);
      verify(
        () => auth.verifyCode(
          challenge: any(named: 'challenge'),
          code: any(named: 'code'),
          signup: any(named: 'signup'),
          askIfNew: any(named: 'askIfNew'),
        ),
      ).called(1);
    });
  });
}
