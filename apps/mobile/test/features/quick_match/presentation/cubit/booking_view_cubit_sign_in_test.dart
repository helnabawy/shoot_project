import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/l10n/failure_message.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/booking_view_cubit.dart';

import '../../../../helpers/quick_match_fixtures.dart';

/// 021 amendment (2026-11-15): accepting a quotation needs a signed-in member.
void main() {
  late MockQuickMatchRepository repository;

  BookingViewCubit make() => BookingViewCubit(
    repository: repository,
    ref: 'Q-4F8Z2',
    key: exampleKey,
    pollEvery: Duration.zero,
    pollTimes: 3,
  );

  setUp(() {
    repository = MockQuickMatchRepository();
    when(() => repository.getBooking(any(), any()))
        .thenAnswer((_) async => Ok(exampleView('quoted')));
  });

  group('021 amendment: sign in to accept', () {
    test('BS-US8-S2 a signed-out Accept answered 401 asks for sign-in, not an error', () async {
      when(() => repository.accept(any(), any())).thenAnswer(
        (_) async => const Err(
          ServerFailure(statusCode: 401, code: 'booking.errors.signInRequired'),
        ),
      );
      final cubit = make();
      await cubit.load();
      await cubit.accept();
      expect(cubit.state.signInNeeded, isTrue);
      expect(cubit.state.commandFailure, isNull);
      expect(cubit.state.busy, isFalse);
      expect(cubit.state.view!.canAccept, isTrue);
      cubit.signInOpened();
      expect(cubit.state.signInNeeded, isFalse);
    });

    test('BS-US8-S4 another member’s booking shows its message and asks for nothing', () async {
      when(() => repository.accept(any(), any())).thenAnswer(
        (_) async => const Err(
          ServerFailure(statusCode: 409, code: 'booking.errors.otherAccount'),
        ),
      );
      final cubit = make();
      await cubit.load();
      await cubit.accept();
      expect(cubit.state.signInNeeded, isFalse);
      final failure = cubit.state.commandFailure! as ServerFailure;
      expect(failure.code, 'booking.errors.otherAccount');
      expect(
        ProblemCode.fromWire('booking.errors.otherAccount'),
        ProblemCode.bookingOtherAccount,
      );
      expect(
        ProblemCode.fromWire('booking.errors.signInRequired'),
        ProblemCode.bookingSignInRequired,
      );
    });
  });
}
