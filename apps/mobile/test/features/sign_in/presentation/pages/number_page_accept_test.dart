import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';
import 'package:shoot_mobile/features/sign_in/presentation/cubit/sign_in_flow_cubit.dart';

import '../../../../helpers/sign_in_harness.dart';

/// 021 amendment: screen 20 opened from a quotation's Accept says what signing in does and keeps
/// `for=accept` and the quotation as `next`.
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
    String location = '/login?next=%2Fq%2FQ-4F8Z2%2Fk3y&for=accept',
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
    'BS-US8-S2 from Accept, screen 20 says signing in accepts the quotation, and the code screen keeps it',
    (tester) async {
      final (router, cubit) = await open(tester);
      expect(find.text('Sign in to accept your quotation'), findsOneWidget);
      expect(find.textContaining('back on your quotation'), findsOneWidget);
      expect(cubit.state.forAccept, isTrue);
      expect(cubit.state.forBrief, isFalse);
      await tester.enterText(
        find.descendant(
          of: find.byKey(const ValueKey('signIn:phone')),
          matching: find.byType(TextField),
        ),
        '50 123 4567',
      );
      await tester.tap(find.text('Send code'));
      await tester.pumpAndSettle();
      expect(
        locationOf(router),
        '/login/code?next=%2Fq%2FQ-4F8Z2%2Fk3y&for=accept',
      );
    },
  );

  testWidgets('BS-US8-S2 in Arabic the wording is the Arabic one', (
    tester,
  ) async {
    await open(tester, locale: const Locale('ar'));
    expect(find.text('سجّل الدخول لقبول عرض السعر'), findsOneWidget);
  });
}
