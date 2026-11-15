import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/features/quick_match/domain/entities/quick_match.dart';
import 'package:shoot_mobile/features/quick_match/presentation/pages/booking_page.dart';

import '../../../../helpers/auth_fixtures.dart';
import '../../../../helpers/quick_match_fixtures.dart';
import '../../../../helpers/quick_match_harness.dart';
import '../../../../helpers/sign_in_harness.dart';

/// 021 amendment (2026-11-15): on the booking screen, Accept asks a signed-out person to sign in and
/// brings them back to the quotation.
void main() {
  late MockQuickMatchRepository repository;
  const quote = '/q/Q-4F8Z2/$exampleKey';

  setUpAll(() {
    registerFallbackValue(
      const BookingDetails(date: '', startTime: '', duration: '', venue: ''),
    );
    registerFallbackValue(<Pick>[]);
  });

  setUp(() {
    repository = MockQuickMatchRepository();
    when(() => repository.getBooking(any(), any()))
        .thenAnswer((_) async => Ok(exampleView('quoted')));
  });

  testWidgets(
    'BS-US8-S2 signed out, Accept opens the sign-in screens for this quotation',
    (tester) async {
      when(() => repository.accept(any(), any())).thenAnswer(
        (_) async => const Err(
          ServerFailure(statusCode: 401, code: 'booking.errors.signInRequired'),
        ),
      );
      final router = await pumpQuickMatch(
        tester,
        repository: repository,
        location: quote,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Accept quotation'));
      await tester.pumpAndSettle();
      expect(
        locationOf(router),
        '/login?next=${Uri.encodeComponent(quote)}&for=accept',
      );
    },
  );

  testWidgets(
    'BS-US8-S3 signed in, the sign-in screens go back to the quotation, where one tap accepts',
    (tester) async {
      final signIn = Uri.parse(acceptSignInPath('Q-4F8Z2', exampleKey));
      expect(
        authRedirect(signIn, SignedIn(exampleSession(exp: DateTime.utc(2027)))),
        quote,
      );
      when(() => repository.accept(any(), any()))
          .thenAnswer((_) async => Ok(exampleView('accepted')));
      await pumpQuickMatch(
        tester,
        repository: repository,
        signedIn: true,
        location: quote,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Accept quotation'));
      await tester.pumpAndSettle();
      verify(() => repository.accept(any(), any())).called(1);
      expect(find.text('Accept quotation'), findsNothing);
    },
  );

  testWidgets(
    'BS-US8-S4 another member’s booking shows one line and stays on the quotation',
    (tester) async {
      when(() => repository.accept(any(), any())).thenAnswer(
        (_) async => const Err(
          ServerFailure(statusCode: 409, code: 'booking.errors.otherAccount'),
        ),
      );
      final router = await pumpQuickMatch(
        tester,
        repository: repository,
        signedIn: true,
        location: quote,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Accept quotation'));
      await tester.pumpAndSettle();
      expect(locationOf(router), quote);
      expect(
        find.text(
          'This quotation belongs to another account. Sign in with the number it was made with.',
        ),
        findsOneWidget,
      );
    },
  );
}
