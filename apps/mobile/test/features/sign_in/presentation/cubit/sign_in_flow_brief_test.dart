import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/content/audience.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/sign_in/data/models/otp_models.dart';
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

  setUpAll(() => registerFallbackValue(challenge));

  setUp(() {
    repository = _MockRepository();
    session = SessionCubit(
      store: MemorySessionStore(),
      api: MockAuthApi(),
      clock: examplesClock,
      storeRead: true,
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

  SignInFlowCubit build() => SignInFlowCubit(
    requestCode: RequestCode(repository),
    verifyCode: VerifyCode(repository),
    session: session,
    clock: examplesClock,
    loadPersonas: () async => Ok<List<Persona>>(personas),
    initial: SignInFlowState(
      status: SignInStatus.awaitingCode,
      phone: '050 123 4567',
      challenge: challenge,
      personas: personas,
    ),
  );

  group('021 sign-in that sends a brief', () {
    blocTest<SignInFlowCubit, SignInFlowState>(
      'BS-US4-S3 from a brief, the code signs up a client with no role question',
      build: build,
      act: (c) async {
        c.startSignIn(forBrief: true);
        expect(c.state.forBrief, isTrue);
        expect(c.state.asksRole, isFalse);
        await c.submitCode('482713');
      },
      verify: (c) {
        expect(c.state.status, SignInStatus.signedIn);
        expect(c.state.roleNeeded, isFalse);
        expect(session.state, isA<SignedIn>());
        verify(
          () => repository.verifyCode(
            challenge: challenge,
            code: '482713',
            signup: const SignupChoice.seeker(),
            askIfNew: false,
          ),
        ).called(1);
      },
    );

    blocTest<SignInFlowCubit, SignInFlowState>(
      'BS-US4-S3 a sign-in not from a brief still asks the server whether the number is new',
      build: build,
      act: (c) async {
        c.startSignIn();
        expect(c.state.forBrief, isFalse);
        await c.submitCode('482713');
      },
      verify: (_) => verify(
        () => repository.verifyCode(
          challenge: challenge,
          code: '482713',
          signup: null,
          askIfNew: true,
        ),
      ).called(1),
    );
  });
}
