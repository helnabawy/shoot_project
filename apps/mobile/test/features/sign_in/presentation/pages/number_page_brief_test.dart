import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';

import '../../../../helpers/sign_in_harness.dart';

/// Feature 021: screen 20 opened from the brief says what signing in does and keeps `for=brief`.
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

  Future<(GoRouter, SignInFlowCubit)> open(
    WidgetTester tester, {
    String location = '/login?next=%2Fbrief%2Fsend&for=brief',
    Locale locale = const Locale('en'),
  }) async {
    final cubit = flowCubit(repository: repository);
    final router = await pumpSignIn(
      tester,
      cubit: cubit,
      location: location,
      locale: locale,
    );
    return (router, cubit);
  }

  testWidgets(
    'BS-US4-S1 from the brief, screen 20 says signing in sends the brief, and the code screen keeps it',
    (tester) async {
      final (router, cubit) = await open(tester);
      expect(find.text('Sign in to send your brief'), findsOneWidget);
      expect(find.textContaining('Your brief is kept.'), findsOneWidget);
      expect(cubit.state.forBrief, isTrue);
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('signIn:phone')),
          matching: find.byType(TextField),
        ),
        '50 123 4567',
      );
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();
      expect(locationOf(router), '/login/code?next=%2Fbrief%2Fsend&for=brief');
    },
  );

  testWidgets('BS-US4-S1 in Arabic the wording is the Arabic one', (
    tester,
  ) async {
    await open(tester, locale: const Locale('ar'));
    expect(find.text('سجّل الدخول لإرسال طلبك'), findsOneWidget);
  });

  testWidgets('BS-US4-S3 a sign-in from the menu keeps screen 20 as it was', (
    tester,
  ) async {
    final (_, cubit) = await open(tester, location: '/login');
    expect(find.text('Your number is your account'), findsOneWidget);
    expect(cubit.state.forBrief, isFalse);
  });
}
