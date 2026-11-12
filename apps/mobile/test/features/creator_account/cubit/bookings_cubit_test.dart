import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/account_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/bookings_cubit.dart';

import '../fixtures.dart';

BookingRequest _req(
  String ref, {
  DateTime? by,
  bool deliver = false,
  RequestAnswer answer = RequestAnswer.pending,
}) => BookingRequest(
  ref: ref,
  quotation: null,
  occasion: 'Wedding',
  emirate: 'Dubai',
  date: DateTime(2026, 12, 14),
  profession: 'Photographer',
  client: 'Layla',
  respondBy: by,
  state: 'accepted',
  answer: answer,
  canDeliver: deliver,
  paid: false,
);

void main() {
  late MockCreatorAccountRepository repo;
  final now = DateTime.utc(2026, 11, 12, 10);

  setUp(() => repo = MockCreatorAccountRepository());

  BookingsCubit make() =>
      BookingsCubit(repository: repo, clock: FixedClock(now));

  Future<BookingsCubit> loaded(CreatorBookings b) async {
    when(() => repo.bookings()).thenAnswer((_) async => Ok(b));
    final c = make();
    await c.load();
    return c;
  }

  CreatorBookings bookings({
    List<BookingRequest> waiting = const [],
    List<BookingRequest> upcoming = const [],
  }) => CreatorBookings(
    updates: bookingsExample().updates,
    waiting: waiting,
    upcoming: upcoming,
    done: const [],
  );

  BookingsLoaded at(BookingsCubit c) => c.state as BookingsLoaded;

  test('MW-US2-S1 the waiting request is the primary action', () async {
    final c = await loaded(bookingsExample());
    expect(at(c).primary!.ref, 'B-2026-0142');
    expect(at(c).primary!.client, 'Layla');
  });

  test(
    'MW-US2-S5 the nearest deadline is primary, the others follow',
    () async {
      final c = await loaded(
        bookings(
          waiting: [
            _req('late', by: now.add(const Duration(hours: 8))),
            _req('soon', by: now.add(const Duration(hours: 2))),
            _req('none'),
          ],
        ),
      );
      expect(at(c).waiting.map((r) => r.ref), ['soon', 'late', 'none']);
      expect(at(c).primary!.ref, 'soon');
    },
  );

  test('MW-US2-S4 a request past its deadline reads as lapsed', () async {
    final c = await loaded(
      bookings(
        waiting: [_req('old', by: now.subtract(const Duration(minutes: 1)))],
      ),
    );
    expect(at(c).waiting, isEmpty);
    expect(at(c).lapsed.single.ref, 'old');
    expect(at(c).primary, isNull);
  });

  test('MW-US2-S2 confirming takes the new lists', () async {
    final after = bookings(
      upcoming: [_req('B-2026-0142', answer: RequestAnswer.confirmed)],
    );
    when(() => repo.answer('B-2026-0142', confirm: true))
        .thenAnswer((_) async => Ok(after));
    final c = await loaded(bookingsExample());
    await c.confirm('B-2026-0142');
    expect(at(c).waiting, isEmpty);
    expect(at(c).bookings.upcoming.single.answer, RequestAnswer.confirmed);
  });

  test('MW-US2-S3 declining sends the optional reason', () async {
    when(
      () => repo.answer(
        'B-2026-0142',
        confirm: false,
        reason: 'Booked elsewhere',
      ),
    ).thenAnswer((_) async => Ok(bookings()));
    final c = await loaded(bookingsExample());
    await c.decline('B-2026-0142', reason: 'Booked elsewhere');
    expect(at(c).waiting, isEmpty);
  });

  test('a refused answer keeps the request and shows the failure', () async {
    when(() => repo.answer(any(), confirm: true)).thenAnswer(
      (_) async => const Err(
        ServerFailure(statusCode: 409, code: 'booking.errors.dateTaken'),
      ),
    );
    final c = await loaded(bookingsExample());
    await c.confirm('B-2026-0142');
    expect(at(c).failure, isA<ServerFailure>());
    expect(at(c).busyRef, isNull);
    expect(at(c).waiting, hasLength(1));
  });

  test('MW-US2-S6 past its shoot day it offers mark as delivered', () async {
    when(() => repo.deliver('d1')).thenAnswer((_) async => Ok(bookings()));
    final c = await loaded(
      bookings(
        upcoming: [_req('d1', deliver: true, answer: RequestAnswer.confirmed)],
      ),
    );
    expect(at(c).deliverable.single.ref, 'd1');
    await c.markDelivered('d1');
    expect(at(c).deliverable, isEmpty);
  });

  test(
    'MW-US2-S7 marking an update read removes it from the new ones',
    () async {
      final readAll = CreatorBookings(
        updates: const [],
        waiting: bookingsExample().waiting,
        upcoming: const [],
        done: const [],
      );
      when(() => repo.markUpdateRead('7')).thenAnswer((_) async => Ok(readAll));
      final c = await loaded(bookingsExample());
      expect(at(c).unread, hasLength(1));
      await c.markRead('7');
      expect(at(c).unread, isEmpty);
    },
  );

  test('a failed first read is a failure state', () async {
    when(() => repo.bookings())
        .thenAnswer((_) async => const Err(NetworkFailure()));
    final c = make();
    await c.load();
    expect(c.state, isA<BookingsFailed>());
  });

  group('MW-US3 My account', () {
    CreatorAccount account({
      BookingRequest? waiting,
      BookingRequest? deliverable,
      bool needs = false,
    }) {
      final a = accountExample();
      return CreatorAccount(
        name: a.name,
        code: a.code,
        professions: a.professions,
        status: ProfileStatus.live,
        strength: 100,
        needs: needs ? a.needs : const [],
        waiting: waiting,
        deliverable: deliverable,
        waitingCount: waiting == null ? 0 : 1,
        upcomingCount: 0,
        blockedDays: 0,
      );
    }

    test('MW-US3-S1 a draft offers "Finish my profile"', () async {
      when(() => repo.account()).thenAnswer((_) async => Ok(accountExample()));
      final c = AccountCubit(repo);
      await c.load();
      expect((c.state as AccountLoaded).upNext, UpNextKind.finishProfile);
    });

    test('MW-US3-S2 a waiting request comes first', () {
      expect(
        AccountLoaded(
          account(waiting: bookingsExample().waiting.first, needs: true),
        ).upNext,
        UpNextKind.answerRequest,
      );
    });

    test('with nothing to do, up next is none; a delivery shows alone', () {
      expect(AccountLoaded(account()).upNext, UpNextKind.none);
      expect(
        AccountLoaded(account(deliverable: _req('x'))).upNext,
        UpNextKind.markDelivered,
      );
    });

    test('a failed read is a failure state', () async {
      when(() => repo.account())
          .thenAnswer((_) async => const Err(NetworkFailure()));
      final c = AccountCubit(repo);
      await c.load();
      expect(c.state, isA<AccountFailed>());
    });
  });
}
