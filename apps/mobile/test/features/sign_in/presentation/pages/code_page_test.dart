import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/widgets/choice_row_group.dart';
import 'package:shoot_mobile/core/widgets/inline_error.dart';
import 'package:shoot_mobile/core/widgets/otp_code_input.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/domain/repositories/auth_repository.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';
import 'package:shoot_mobile/features/sign_in/presentation/pages/join_page.dart';

import '../../../../helpers/sign_in_harness.dart';

void main() {
  late MockAuthRepository repository;
  final challenge = exampleChallenge();

  setUpAll(() {
    registerFallbackValue(OtpChannel.sms);
    registerFallbackValue(challenge);
  });

  setUp(() => repository = MockAuthRepository());

  SignInFlowCubit awaiting({AccountType role = AccountType.seeker}) =>
      flowCubit(
        repository: repository,
        initial: SignInFlowState(
          status: SignInStatus.awaitingCode,
          phone: '050 123 4567',
          challenge: challenge,
          personas: examplePersonas(),
          joinPersonas: const ['photographer'],
          role: role,
        ),
      );

  testWidgets(
    'OT-US1-S1 the code screen shows number, channel, countdown and the role rows '
    'with "I need a …" selected, from the GET personas example',
    (tester) async {
      await pumpSignIn(tester, cubit: awaiting(), location: '/login/code');
      await tester.pumpAndSettle();

      expect(find.text('Enter the code'), findsOneWidget);
      expect(
        find.textContaining(
          RegExp(r'^Sent by SMS to \u2066\+971 50 123 4567\u2069\.'),
          findRichText: true,
        ),
        findsOneWidget,
      );
      expect(
        find.textContaining('Change number', findRichText: true),
        findsOneWidget,
      );
      expect(find.text('Resend code in \u20660:42\u2069'), findsOneWidget);

      final rows = tester.widget<ChoiceRowGroup<AccountType>>(
        find.byType(ChoiceRowGroup<AccountType>),
      );
      expect(rows.selected, AccountType.seeker);
      expect(rows.rows.map((r) => r.label), [
        'I need a photographer or videographer',
        "I'm a photographer or videographer",
      ]);
      expect(
        find.text('FIRST TIME HERE? TELL US WHICH YOU ARE'),
        findsOneWidget,
      );
      expect(find.text('Continue'), findsOneWidget);
    },
  );

  testWidgets(
    'OT-US1-S1 the code screen in Arabic names the professions from personas.ar',
    (tester) async {
      await pumpSignIn(
        tester,
        cubit: flowCubit(
          repository: repository,
          personas: examplePersonas(arabic: true),
          initial: SignInFlowState(
            status: SignInStatus.awaitingCode,
            challenge: challenge,
            personas: examplePersonas(arabic: true),
          ),
        ),
        location: '/login/code',
        locale: const Locale('ar'),
      );
      await tester.pumpAndSettle();
      final rows = tester.widget<ChoiceRowGroup<AccountType>>(
        find.byType(ChoiceRowGroup<AccountType>),
      );
      expect(rows.rows.first.label, 'أحتاج مصوّر أو مصوّر فيديو');
    },
  );

  group('OT-US1-S4 a wrong code shows the error state of board 22 and Try again clears the cells', () {
    testWidgets('OT-US1-S4 the codeInvalid state shows the error cells, InlineError announced, '
        'and Try again clears the cells and refocuses', (tester) async {
      when(
        () => repository.verifyCode(
          challenge: any(named: 'challenge'),
          code: any(named: 'code'),
          signup: any(named: 'signup'),
        ),
      ).thenAnswer(
        (_) async => const Err<Verified>(
          ServerFailure(statusCode: 422, code: 'auth.errors.codeInvalid'),
        ),
      );
      final handle = tester.ensureSemantics();
      await pumpSignIn(tester, cubit: awaiting(), location: '/login/code');
      await tester.pumpAndSettle();

      await tester.enterText(find.byType(TextField), '482713');
      await tester.pumpAndSettle();

      const message =
          "That code isn't right. Check the text we sent and type it again.";
      expect(find.byType(InlineError), findsOneWidget);
      expect(
        tester.getSemantics(find.bySemanticsLabel(message)),
        isSemantics(label: message, isLiveRegion: true),
      );
      expect(
        tester.widget<OtpCodeInput>(find.byType(OtpCodeInput)).error,
        isTrue,
      );
      expect(find.byType(ChoiceRowGroup<AccountType>), findsNothing);
      expect(
        find.text('You can ask for a new code in \u20660:42\u2069'),
        findsOneWidget,
      );

      await tester.tap(find.text('Try again'));
      await tester.pumpAndSettle();

      final field = tester.widget<TextField>(find.byType(TextField));
      expect(field.controller!.text, isEmpty);
      expect(field.focusNode!.hasFocus, isTrue);
      expect(find.byType(InlineError), findsNothing);
      expect(
        tester.widget<OtpCodeInput>(find.byType(OtpCodeInput)).error,
        isFalse,
      );
      handle.dispose();
    });
  });

  testWidgets(
    "OT-US4-S2 I'm a … + Continue opens screen 23 in finish mode with the code kept",
    (tester) async {
      final router = await pumpSignIn(
        tester,
        cubit: awaiting(),
        location: '/login/code',
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text("I'm a photographer or videographer"));
      await tester.enterText(find.byType(TextField), '482713');
      await tester.pumpAndSettle();

      expect(locationOf(router), '/register');
      expect(find.byType(JoinPage), findsOneWidget);
      verifyZeroInteractions(repository);
    },
  );

  testWidgets('Change number goes back to screen 20', (tester) async {
    final router = await pumpSignIn(
      tester,
      cubit: awaiting(),
      location: '/login/code',
    );
    await tester.pumpAndSettle();
    final handle = tester.ensureSemantics();
    await tester.pump();
    tester.semantics.tap(find.semantics.byLabel('Change number'));
    handle.dispose();
    await tester.pumpAndSettle();
    expect(locationOf(router), '/login');
  });
}
