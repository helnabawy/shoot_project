import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/account/domain/entities/account.dart';
import 'package:shoot_mobile/features/account/presentation/cubit/account_cubit.dart';
import 'package:shoot_mobile/features/account/presentation/cubit/bookings_cubit.dart';

import '../../../helpers/account_harness.dart';

void main() {
  group('the account cubit', () {
    late FakeAccountRepository repository;
    late AccountCubit cubit;

    setUp(() {
      repository = FakeAccountRepository();
      cubit = accountCubit(repository);
    });
    tearDown(() => cubit.close());

    test('MK-US1-S1 loads the account', () async {
      expect(cubit.state.status, AccountStatus.loading);
      await cubit.load();
      expect(cubit.state.status, AccountStatus.ready);
      expect(cubit.state.home?.name, 'Sara');
    });

    test('a failed read is a failed state with its failure', () async {
      repository.home = const Err(NetworkFailure());
      await cubit.load();
      expect(cubit.state.status, AccountStatus.failed);
      expect(cubit.state.failure, isA<NetworkFailure>());
    });

    test('a refresh keeps the account on screen', () async {
      await cubit.load();
      final seen = <AccountStatus>[];
      final sub = cubit.stream.listen((s) => seen.add(s.status));
      await cubit.load(refresh: true);
      await sub.cancel();
      expect(seen, everyElement(AccountStatus.ready));
    });

    test(
      'MK-US3-S1 MK-US3-S5 tells the server once that 25 was shown',
      () async {
        await cubit.load();
        expect(cubit.state.home?.finishAutoOpen, isTrue);
        await cubit.markFinishShown();
        await cubit.markFinishShown();
        expect(repository.calls.where((c) => c == 'shown'), hasLength(1));
        expect(cubit.state.home?.finishAutoOpen, isFalse);
      },
    );

    test('MK-US3-S3 saves a valid email and reloads the account', () async {
      await cubit.load();
      expect(await cubit.saveEmail(' sara@example.ae '), isTrue);
      expect(
        repository.calls,
        contains('update name=null email=sara@example.ae'),
      );
      expect(cubit.state.home?.email, 'sara@example.ae');
      expect(cubit.state.save, SaveStatus.idle);
    });

    test(
      'MK-US3-S4 refuses an invalid email without asking the server',
      () async {
        await cubit.load();
        expect(await cubit.saveEmail('nope'), isFalse);
        expect(cubit.state.fieldError, 'account.errors.emailInvalid');
        expect(repository.calls.where((c) => c.startsWith('update')), isEmpty);
        cubit.clearFieldError();
        expect(cubit.state.fieldError, isNull);
      },
    );

    test(
      'MK-US3-S4 shows the server\'s line when the email is in use',
      () async {
        await cubit.load();
        repository.update = const Err(
          ServerFailure(
            statusCode: 422,
            fields: [(path: 'body.email', code: 'account.errors.emailInUse')],
          ),
        );
        expect(await cubit.saveEmail('taken@example.ae'), isFalse);
        expect(cubit.state.fieldError, 'account.errors.emailInUse');
        expect(cubit.state.save, SaveStatus.failed);
      },
    );

    test(
      'a failed save with no field code says something went wrong',
      () async {
        await cubit.load();
        repository.update = const Err(NetworkFailure());
        expect(await cubit.saveName('Sara Al Mansoori'), isFalse);
        expect(cubit.state.fieldError, 'api.errors.unexpected');
      },
    );

    test('MK-US3-S6 saves a name of 2 to 80 characters only', () async {
      await cubit.load();
      expect(await cubit.saveName('S'), isFalse);
      expect(cubit.state.fieldError, 'account.errors.nameLength');
      expect(await cubit.saveName('x' * 81), isFalse);
      expect(await cubit.saveName('Sara Al Mansoori'), isTrue);
      expect(
        repository.calls,
        contains('update name=Sara Al Mansoori email=null'),
      );
    });
  });

  group('the bookings cubit', () {
    late FakeAccountRepository repository;
    late BookingsCubit cubit;

    setUp(() {
      repository = FakeAccountRepository();
      cubit = bookingsCubit(repository);
    });
    tearDown(() => cubit.close());

    test('MK-US2-S1 loads Upcoming and Past', () async {
      await cubit.load();
      expect(cubit.state.status, ListStatus.ready);
      expect(cubit.state.upcoming.single.reference, 'Q-2026-0142');
      expect(cubit.state.past.single.status, BookingStatus.completed);
      expect(cubit.state.empty, isFalse);
    });

    test('MK-US2-S5 reports an empty list', () async {
      repository.bookings = const Ok(
        BookingList(upcoming: [], past: [], page: 1, hasMore: false),
      );
      await cubit.load();
      expect(cubit.state.empty, isTrue);
    });

    test('a failed read is a failed state', () async {
      repository.bookings = const Err(NetworkFailure());
      await cubit.load();
      expect(cubit.state.status, ListStatus.failed);
    });

    test('pages Past as the person scrolls', () async {
      final first = exampleBookings();
      repository.bookings = Ok(
        BookingList(
          upcoming: first.upcoming,
          past: first.past,
          page: 1,
          hasMore: true,
        ),
      );
      await cubit.load();
      repository.bookings = Ok(
        BookingList(
          upcoming: const [],
          past: first.upcoming,
          page: 2,
          hasMore: false,
        ),
      );
      await cubit.loadMore();
      expect(repository.bookingPages, [1, 2]);
      expect(cubit.state.past, hasLength(2));
      expect(cubit.state.hasMore, isFalse);
      await cubit.loadMore();
      expect(repository.bookingPages, [1, 2]);
    });

    test('a failed next page keeps what is shown', () async {
      repository.bookings = Ok(
        BookingList(
          upcoming: const [],
          past: exampleBookings().past,
          page: 1,
          hasMore: true,
        ),
      );
      await cubit.load();
      repository.bookings = const Err(NetworkFailure());
      await cubit.loadMore();
      expect(cubit.state.past, hasLength(1));
      expect(cubit.state.loadingMore, isFalse);
    });

    test('MK-US2-S6 shows a changed state on the next read', () async {
      await cubit.load();
      final changed = exampleBookings().upcoming.single;
      repository.bookings = Ok(
        BookingList(
          upcoming: [
            BookingSummary(
              reference: changed.reference,
              status: BookingStatus.awaitingPayment,
              date: changed.date,
            ),
          ],
          past: const [],
          page: 1,
          hasMore: false,
        ),
      );
      await cubit.load();
      expect(cubit.state.upcoming.single.status, BookingStatus.awaitingPayment);
    });

    test(
      'MK-US2-S3 loads the briefs when their tab opens, and pages them',
      () async {
        cubit.selectTab(BookingsTab.briefs);
        await Future<void>.delayed(Duration.zero);
        expect(cubit.state.tab, BookingsTab.briefs);
        expect(cubit.state.briefs, hasLength(2));
        repository.briefs = Ok(
          BriefList(items: exampleBriefs().items, page: 1, hasMore: true),
        );
        await cubit.loadBriefs();
        repository.briefs = Ok(
          BriefList(items: exampleBriefs().items, page: 2, hasMore: false),
        );
        await cubit.loadMoreBriefs();
        expect(cubit.state.briefs, hasLength(4));
        await cubit.loadMoreBriefs();
        expect(repository.calls.where((c) => c == 'briefs'), hasLength(3));
      },
    );

    test('a failed briefs read is a failed state', () async {
      repository.briefs = const Err(NetworkFailure());
      await cubit.loadBriefs();
      expect(cubit.state.briefsStatus, ListStatus.failed);
      cubit.selectTab(BookingsTab.settings);
      cubit.selectTab(BookingsTab.settings);
      expect(cubit.state.tab, BookingsTab.settings);
    });
  });
}
