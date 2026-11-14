import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/content/audience.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/sign_in/data/models/otp_models.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/signup_choice.dart';
import 'package:shoot_mobile/features/sign_in/domain/repositories/auth_repository.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/request_code.dart';
import 'package:shoot_mobile/features/sign_in/domain/usecases/verify_code.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';
import 'package:shoot_mobile/features/site/data/models/audience_model.dart';

import '../../../../helpers/api_examples.dart';
import '../../../../helpers/auth_fixtures.dart';

class _MockRepository extends Mock implements AuthRepository {}

void main() {
  late _MockRepository repository;
  late SessionCubit session;
  final challenge = OtpChallengeModel.fromJson(loadExample('auth-challenge'))
      .toEntity();
  final verified = AuthTokenModel.fromJson(loadExample('auth-token'))
      .toEntity();
  final personas = AudienceModel.fromJson(loadExample('personas'))
      .toEntity()
      .personas;
  final afterCountdown = FixedClock(DateTime.utc(2026, 12, 14, 6, 1, 5));

  setUpAll(() {
    registerFallbackValue(challenge);
    registerFallbackValue(OtpChannel.sms);
  });

  setUp(() {
    repository = _MockRepository();
    session = SessionCubit(
      store: MemorySessionStore(),
      api: MockAuthApi(),
      clock: examplesClock,
      storeRead: true,
    );
    when(
      () => repository.requestCode(
        phone: any(named: 'phone'),
        channel: any(named: 'channel'),
      ),
    ).thenAnswer(
      (i) async => Ok(
        OtpChallenge(
          challengeId: challenge.challengeId,
          channel: i.namedArguments[#channel] as OtpChannel,
          phone: challenge.phone,
          expiresAt: challenge.expiresAt,
          resendAt: challenge.resendAt,
        ),
      ),
    );
    when(
      () => repository.verifyCode(
        challenge: any(named: 'challenge'),
        code: any(named: 'code'),
        signup: any(named: 'signup'),
        askIfNew: any(named: 'askIfNew'),
      ),
    ).thenAnswer((_) async => Ok(verified));
  });

  SignInFlowCubit build({SignInFlowState? initial, Clock? clock}) =>
      SignInFlowCubit(
        requestCode: RequestCode(repository),
        verifyCode: VerifyCode(repository),
        session: session,
        clock: clock ?? examplesClock,
        loadPersonas: () async => Ok<List<Persona>>(personas),
        initial: initial ?? const SignInFlowState(),
      );

  SignInFlowState awaiting({
    SignInMode mode = SignInMode.signIn,
    AccountType role = AccountType.seeker,
    List<String> joinPersonas = const [],
    bool accepted = false,
  }) => SignInFlowState(
    status: SignInStatus.awaitingCode,
    mode: mode,
    phone: '050 123 4567',
    challenge: challenge,
    personas: personas,
    role: role,
    joinPersonas: joinPersonas,
    accepted: accepted,
  );

  void stubVerifyFails(ServerFailure failure) => when(
    () => repository.verifyCode(
      challenge: any(named: 'challenge'),
      code: any(named: 'code'),
      signup: any(named: 'signup'),
      askIfNew: any(named: 'askIfNew'),
    ),
  ).thenAnswer((_) async => Err(failure));

  blocTest<SignInFlowCubit, SignInFlowState>(
    'sendCode: editingNumber → sending → awaitingCode with the challenge',
    build: build,
    act: (c) {
      c.phoneChanged('050 123 4567');
      return c.sendCode();
    },
    skip: 1,
    expect: () => [
      isA<SignInFlowState>().having(
        (s) => s.status,
        'status',
        SignInStatus.sending,
      ),
      isA<SignInFlowState>()
          .having((s) => s.status, 'status', SignInStatus.awaitingCode)
          .having(
            (s) => s.challenge?.challengeId,
            'challenge',
            challenge.challengeId,
          ),
    ],
  );

  blocTest<SignInFlowCubit, SignInFlowState>(
    'OT-US1-S9 a landline is refused with the field error and nothing is sent',
    build: build,
    act: (c) {
      c.phoneChanged('04 123 4567');
      return c.sendCode();
    },
    skip: 2,
    expect: () => [
      isA<SignInFlowState>()
          .having((s) => s.status, 'status', SignInStatus.editingNumber)
          .having((s) => s.fieldError, 'field', 'auth.errors.phoneInvalid'),
    ],
    verify: (_) => verifyZeroInteractions(repository),
  );

  blocTest<SignInFlowCubit, SignInFlowState>(
    'OT-US1-S2 the right code: awaitingCode → verifying → '
    'signedIn(isNew: true), SessionCubit.signIn called with the token',
    build: () => build(initial: awaiting()),
    act: (c) => c.submitCode('482713'),
    expect: () => [
      isA<SignInFlowState>().having((s) => s.code, 'code', '482713'),
      isA<SignInFlowState>().having(
        (s) => s.status,
        'status',
        SignInStatus.verifying,
      ),
      isA<SignInFlowState>()
          .having((s) => s.status, 'status', SignInStatus.signedIn)
          .having((s) => s.isNew, 'isNew', isTrue),
    ],
    verify: (_) {
      expect(session.state, SignedIn(verified.session));
      expect(session.token, verified.session.token);
      verify(
        () => repository.verifyCode(
          challenge: challenge,
          code: '482713',
          signup: null,
          askIfNew: true,
        ),
      ).called(1);
    },
  );

  group('OT-US1-S11 a known number signs straight in; a new number then gets the role question', () {
    blocTest<SignInFlowCubit, SignInFlowState>(
      'OT-US1-S11 a known number: one verify with askIfNew, signed in, no role question',
      build: () => build(initial: awaiting()),
      act: (c) async {
        expect(c.state.asksRole, isFalse);
        await c.submitCode('482713');
      },
      verify: (c) {
        expect(c.state.status, SignInStatus.signedIn);
        expect(c.state.roleNeeded, isFalse);
        verify(
          () => repository.verifyCode(
            challenge: challenge,
            code: '482713',
            signup: null,
            askIfNew: true,
          ),
        ).called(1);
      },
    );

    blocTest<SignInFlowCubit, SignInFlowState>(
      'OT-US1-S11 a new number: signupRequired keeps the code and shows the role rows',
      setUp: () => stubVerifyFails(
        const ServerFailure(
          statusCode: 409,
          code: 'auth.errors.signupRequired',
        ),
      ),
      build: () => build(initial: awaiting()),
      act: (c) => c.submitCode('482713'),
      verify: (c) {
        expect(c.state.status, SignInStatus.awaitingCode);
        expect(c.state.roleNeeded, isTrue);
        expect(c.state.asksRole, isTrue);
        expect(c.state.code, '482713');
        expect(c.state.failure, isNull);
      },
    );

    blocTest<SignInFlowCubit, SignInFlowState>(
      'OT-US1-S11 after the role question, I need a … verifies as a client without askIfNew',
      build: () =>
          build(initial: awaiting().copyWith(roleNeeded: true, code: '482713')),
      act: (c) => c.submitCode(),
      verify: (c) {
        expect(c.state.status, SignInStatus.signedIn);
        verify(
          () => repository.verifyCode(
            challenge: challenge,
            code: '482713',
            signup: null,
            askIfNew: false,
          ),
        ).called(1);
      },
    );

    blocTest<SignInFlowCubit, SignInFlowState>(
      "OT-US1-S11 after the role question, I'm a … opens screen 23 without verifying",
      build: () => build(
        initial: awaiting(role: AccountType.provider)
            .copyWith(roleNeeded: true, code: '482713'),
      ),
      act: (c) => c.submitCode(),
      verify: (c) {
        expect(c.state.status, SignInStatus.finishing);
        verifyZeroInteractions(repository);
      },
    );

    blocTest<SignInFlowCubit, SignInFlowState>(
      'OT-US1-S11 changing the number forgets that it was new',
      build: () => build(initial: awaiting().copyWith(roleNeeded: true)),
      act: (c) => c.changeNumber(),
      verify: (c) => expect(c.state.roleNeeded, isFalse),
    );
  });

  group(
    'OT-US1-S8 send it on WhatsApp sends a new code by the other channel',
    () {
      blocTest<SignInFlowCubit, SignInFlowState>(
        'OT-US1-S8 after the countdown it requests by WhatsApp and the channel changes',
        build: () => build(initial: awaiting(), clock: afterCountdown),
        act: (c) => c.switchChannelAndResend(),
        expect: () => [
          isA<SignInFlowState>().having(
            (s) => s.status,
            'status',
            SignInStatus.sending,
          ),
          isA<SignInFlowState>()
              .having((s) => s.status, 'status', SignInStatus.awaitingCode)
              .having((s) => s.channel, 'channel', OtpChannel.whatsapp)
              .having(
                (s) => s.challenge?.channel,
                'sent by',
                OtpChannel.whatsapp,
              ),
        ],
        verify: (_) => verify(
          () => repository.requestCode(
            phone: '050 123 4567',
            channel: OtpChannel.whatsapp,
          ),
        ).called(1),
      );

      blocTest<SignInFlowCubit, SignInFlowState>(
        'OT-US1-S8 before the countdown ends the call is ignored',
        build: () => build(initial: awaiting()),
        act: (c) => c.switchChannelAndResend(),
        expect: () => <SignInFlowState>[],
        verify: (_) => verifyZeroInteractions(repository),
      );
    },
  );

  group('problems map to their states', () {
    for (final (code, status) in [
      ('auth.errors.codeInvalid', SignInStatus.codeInvalid),
      ('auth.errors.codeExpired', SignInStatus.codeExpired),
      ('auth.errors.codeLocked', SignInStatus.codeLocked),
      ('auth.errors.tooManyRequests', SignInStatus.rateLimited),
      ('auth.errors.useEmailSignIn', SignInStatus.failed),
    ]) {
      blocTest<SignInFlowCubit, SignInFlowState>(
        '$code → ${status.name}',
        setUp: () =>
            stubVerifyFails(ServerFailure(statusCode: 422, code: code)),
        build: () => build(initial: awaiting()),
        act: (c) => c.submitCode('482713'),
        skip: 2,
        expect: () => [
          isA<SignInFlowState>().having((s) => s.status, 'status', status),
        ],
      );
    }

    blocTest<SignInFlowCubit, SignInFlowState>(
      'a wrong code counts up, so the cells shake once per mistake',
      setUp: () => stubVerifyFails(
        const ServerFailure(statusCode: 422, code: 'auth.errors.codeInvalid'),
      ),
      build: () => build(initial: awaiting()),
      act: (c) => c.submitCode('482713'),
      verify: (c) => expect(c.state.errorCount, 1),
    );

    blocTest<SignInFlowCubit, SignInFlowState>(
      'rateLimited keeps retryAfter',
      setUp: () =>
          when(
            () => repository.requestCode(
              phone: any(named: 'phone'),
              channel: any(named: 'channel'),
            ),
          ).thenAnswer(
            (_) async => const Err(
              ServerFailure(
                statusCode: 429,
                code: 'auth.errors.resendTooSoon',
                retryAfter: 42,
              ),
            ),
          ),
      build: () => build(initial: const SignInFlowState(phone: '050 123 4567')),
      act: (c) => c.sendCode(),
      skip: 1,
      expect: () => [
        isA<SignInFlowState>()
            .having((s) => s.status, 'status', SignInStatus.rateLimited)
            .having((s) => s.retryAfter, 'retryAfter', 42),
      ],
    );

    blocTest<SignInFlowCubit, SignInFlowState>(
      'sendFailed',
      setUp: () =>
          when(
            () => repository.requestCode(
              phone: any(named: 'phone'),
              channel: any(named: 'channel'),
            ),
          ).thenAnswer(
            (_) async => const Err(
              ServerFailure(statusCode: 503, code: 'auth.errors.sendFailed'),
            ),
          ),
      build: () => build(initial: const SignInFlowState(phone: '050 123 4567')),
      act: (c) => c.sendCode(),
      skip: 1,
      expect: () => [
        isA<SignInFlowState>().having(
          (s) => s.status,
          'status',
          SignInStatus.sendFailed,
        ),
      ],
    );
  });

  blocTest<SignInFlowCubit, SignInFlowState>(
    'tryAgain clears the code and returns to awaitingCode',
    build: () => build(
      initial: awaiting().copyWith(
        status: SignInStatus.codeInvalid,
        code: '482713',
      ),
    ),
    act: (c) => c.tryAgain(),
    expect: () => [
      isA<SignInFlowState>()
          .having((s) => s.status, 'status', SignInStatus.awaitingCode)
          .having((s) => s.code, 'code', ''),
    ],
  );

  blocTest<SignInFlowCubit, SignInFlowState>(
    'loadPersonas fills the role rows and preselects the first profession',
    build: build,
    act: (c) => c.loadPersonas(),
    expect: () => [
      isA<SignInFlowState>()
          .having((s) => s.personas, 'personas', personas)
          .having((s) => s.joinPersonas, 'join', ['photographer']),
    ],
  );

  group('OT-US4-S1 joining from the menu creates a creator account with three acceptances', () {
    blocTest<SignInFlowCubit, SignInFlowState>(
      'OT-US4-S1 menu path: request → code screen without the role question → '
      'verify with the provider signup',
      build: () => build(
        initial: SignInFlowState(
          personas: personas,
          joinPersonas: const ['photographer', 'videographer'],
          phone: '050 123 4567',
          accepted: true,
        ),
      ),
      act: (c) async {
        c.startJoin();
        await c.sendCode();
        expect(c.state.status, SignInStatus.awaitingCode);
        expect(c.state.asksRole, isFalse);
        await c.submitCode('482713');
      },
      verify: (c) {
        expect(c.state.status, SignInStatus.signedIn);
        verify(
          () => repository.verifyCode(
            challenge: any(named: 'challenge'),
            code: '482713',
            signup: const SignupChoice.provider(
              personas: ['photographer', 'videographer'],
              acceptTerms: true,
            ),
            askIfNew: false,
          ),
        ).called(1);
      },
    );

    blocTest<SignInFlowCubit, SignInFlowState>(
      'OT-US4-S1 sending without accepting the terms calls nothing',
      build: () => build(
        initial: SignInFlowState(
          mode: SignInMode.join,
          personas: personas,
          joinPersonas: const ['photographer'],
          phone: '050 123 4567',
        ),
      ),
      act: (c) => c.sendCode(),
      expect: () => [
        isA<SignInFlowState>().having(
          (s) => s.fieldError,
          'field',
          'auth.errors.acceptTerms',
        ),
      ],
      verify: (_) => verifyZeroInteractions(repository),
    );
  });

  group('OT-US4-S2 I\'m a … on the code screen opens screen 23 with the code kept, no new code', () {
    blocTest<SignInFlowCubit, SignInFlowState>(
      "OT-US4-S2 I'm a … + Continue does not call verify; it finishes on /register",
      build: () => build(
        initial: awaiting(role: AccountType.provider)
            .copyWith(roleNeeded: true),
      ),
      act: (c) => c.submitCode('482713'),
      expect: () => [
        isA<SignInFlowState>().having((s) => s.code, 'code', '482713'),
        isA<SignInFlowState>()
            .having((s) => s.status, 'status', SignInStatus.finishing)
            .having((s) => s.finishMode, 'finish mode', isTrue),
      ],
      verify: (_) => verifyZeroInteractions(repository),
    );

    blocTest<SignInFlowCubit, SignInFlowState>(
      'OT-US4-S2 its Continue verifies once with the provider signup and no new code',
      build: () => build(
        initial: awaiting(
          role: AccountType.provider,
          joinPersonas: const ['videographer'],
          accepted: true,
        ).copyWith(status: SignInStatus.finishing, code: '482713'),
      ),
      act: (c) => c.finishJoin(),
      verify: (c) {
        expect(c.state.status, SignInStatus.signedIn);
        verify(
          () => repository.verifyCode(
            challenge: challenge,
            code: '482713',
            signup: const SignupChoice.provider(
              personas: ['videographer'],
              acceptTerms: true,
            ),
            askIfNew: false,
          ),
        ).called(1);
        verifyNever(
          () => repository.requestCode(
            phone: any(named: 'phone'),
            channel: any(named: 'channel'),
          ),
        );
      },
    );

    blocTest<SignInFlowCubit, SignInFlowState>(
      'OT-US4-S2 a profession switched off before verify shows its field error',
      setUp: () => stubVerifyFails(
        const ServerFailure(
          statusCode: 422,
          code: 'auth.errors.personaInactive',
        ),
      ),
      build: () => build(
        initial: awaiting(
          role: AccountType.provider,
          joinPersonas: const ['videographer'],
          accepted: true,
        ).copyWith(status: SignInStatus.finishing, code: '482713'),
      ),
      act: (c) => c.finishJoin(),
      verify: (c) {
        expect(c.state.fieldError, 'auth.errors.personaInactive');
        expect(c.state.finishMode, isTrue);
      },
    );
  });

  blocTest<SignInFlowCubit, SignInFlowState>(
    'changeNumber drops the challenge and the code',
    build: () => build(initial: awaiting().copyWith(code: '48')),
    act: (c) => c.changeNumber(),
    expect: () => [
      isA<SignInFlowState>()
          .having((s) => s.status, 'status', SignInStatus.editingNumber)
          .having((s) => s.challenge, 'challenge', isNull)
          .having((s) => s.code, 'code', ''),
    ],
  );

  test('the state never prints the number or the code', () {
    expect(
      awaiting().copyWith(code: '482713').toString(),
      isNot(contains('4827')),
    );
    expect(awaiting().toString(), isNot(contains('050')));
  });
}
