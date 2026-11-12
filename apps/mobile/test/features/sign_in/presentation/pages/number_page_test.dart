import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/widgets/inline_error.dart';
import 'package:shoot_mobile/core/widgets/phone_field.dart';
import 'package:shoot_mobile/core/widgets/segmented_control.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/presentation/pages/code_page.dart';
import 'package:shoot_mobile/features/sign_in/presentation/pages/number_page.dart';

import '../../../../helpers/sign_in_harness.dart';

void main() {
  late MockAuthRepository repository;

  setUpAll(() => registerFallbackValue(OtpChannel.sms));

  setUp(() {
    repository = MockAuthRepository();
    when(
      () => repository.requestCode(
        phone: any(named: 'phone'),
        channel: any(named: 'channel'),
      ),
    ).thenAnswer((_) async => Ok(exampleChallenge()));
  });

  Finder phone() => find.descendant(
    of: find.byKey(const ValueKey('signIn:phone')),
    matching: find.byType(TextField),
  );

  group(
    'OT-US1-S9 a non-UAE or non-mobile number is refused and nothing is sent',
    () {
      for (final number in ['04 123 4567', '+44 7700 900123']) {
        testWidgets(
          'OT-US1-S9 "$number" shows the field error and calls nothing',
          (tester) async {
            await pumpSignIn(tester, cubit: flowCubit(repository: repository));
            await tester.enterText(phone(), number);
            await tester.tap(find.text('Send code'));
            await tester.pumpAndSettle();

            expect(
              find.text('Enter a UAE mobile number, like 50 123 4567.'),
              findsOneWidget,
            );
            expect(find.byType(InlineError), findsOneWidget);
            expect(
              tester.widget<PhoneField>(find.byType(PhoneField)).error,
              isTrue,
            );
            expect(find.byType(NumberPage), findsOneWidget);
            verifyZeroInteractions(repository);
          },
        );
      }
    },
  );

  testWidgets(
    'the channel defaults to SMS; a valid number sends and opens screen 21',
    (tester) async {
      final router = await pumpSignIn(
        tester,
        cubit: flowCubit(repository: repository),
      );
      final seg = tester.widget<SegmentedControl<OtpChannel>>(
        find.byType(SegmentedControl<OtpChannel>),
      );
      expect(seg.selected, OtpChannel.sms);
      expect(
        find.text('Same number as your WhatsApp works best.'),
        findsOneWidget,
      );

      await tester.tap(find.text('WhatsApp'));
      await tester.enterText(phone(), '50 123 4567');
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();

      verify(
        () => repository.requestCode(
          phone: '50 123 4567',
          channel: OtpChannel.whatsapp,
        ),
      ).called(1);
      expect(locationOf(router), '/login/code');
      expect(find.byType(CodePage), findsOneWidget);
    },
  );

  testWidgets('the language button switches to Arabic', (tester) async {
    await pumpSignIn(tester, cubit: flowCubit(repository: repository));
    expect(find.text('Your number is your account'), findsOneWidget);
    await tester.tap(find.text('عربي'));
    await tester.pumpAndSettle();
    expect(find.text('رقمك هو حسابك'), findsOneWidget);
    expect(
      Directionality.of(tester.element(find.byType(NumberPage))),
      TextDirection.rtl,
    );
  });

  testWidgets(
    'FR-055 "Editor? Sign in with email" opens the website\'s email sign-in',
    (tester) async {
      final opener = RecordingOpener();
      await pumpSignIn(
        tester,
        cubit: flowCubit(repository: repository),
        opener: opener,
      );
      final handle = tester.ensureSemantics();
      await tester.pump();
      tester.semantics.tap(find.semantics.byLabel('Sign in with email'));
      expect(opener.opened.map((u) => u.toString()), [
        'https://shoot.example/login/email',
      ]);
      handle.dispose();
    },
  );

  for (final (label, path) in [
    ('terms', '/terms'),
    ('privacy notice', '/privacy'),
  ]) {
    testWidgets('MG-FR-007 the "$label" link opens the document in the app', (
      tester,
    ) async {
      final router = await pumpSignIn(
        tester,
        cubit: flowCubit(repository: repository),
      );
      final handle = tester.ensureSemantics();
      await tester.pump();
      tester.semantics.tap(find.semantics.byLabel(label));
      await tester.pumpAndSettle();
      final top = router.routerDelegate.currentConfiguration.last;
      expect(top is ImperativeRouteMatch ? top.matches.uri.path : '', path);
      handle.dispose();
    });
  }

  testWidgets(
    'a signed-out /login/code without a code on its way goes to /login',
    (tester) async {
      final router = await pumpSignIn(
        tester,
        cubit: flowCubit(repository: repository),
        location: '/login/code',
      );
      await tester.pumpAndSettle();
      expect(locationOf(router), '/login');
    },
  );
}
