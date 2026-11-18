import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/push/push_service.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/account/domain/usecases/account_use_cases.dart';
import 'package:shoot_mobile/features/account/presentation/cubit/bookings_cubit.dart'
    as client;
import 'package:shoot_mobile/features/creator_account/presentation/cubit/bookings_cubit.dart'
    as creator;
import 'package:shoot_mobile/features/notifications/data/models/notices_model.dart';
import 'package:shoot_mobile/features/notifications/domain/repositories/notifications_repository.dart';
import 'package:shoot_mobile/features/notifications/presentation/cubit/notifications_cubit.dart';

import '../../features/creator_account/fixtures.dart';
import '../../helpers/account_harness.dart';
import '../../helpers/api_examples.dart';

class _NoticesRepo extends Mock implements NotificationsRepository {}

const _push = PushEvent(event: 'quote', path: '/account/bookings');

/// A push that arrives while the app is open shows no banner, so the open list reloads instead.
void main() {
  late StreamController<PushEvent> pushes;
  setUp(() => pushes = StreamController<PushEvent>.broadcast());
  tearDown(() => pushes.close());

  test('a foreground push reloads the client bookings and briefs', () async {
    final repo = FakeAccountRepository();
    final cubit = client.BookingsCubit(
      getBookings: GetBookings(repo),
      getBriefs: GetBriefs(repo),
      pushEvents: pushes.stream,
    );
    addTearDown(cubit.close);
    await cubit.load();
    await cubit.loadBriefs();
    repo.calls.clear();

    pushes.add(_push);
    await pumpEventQueue();

    expect(repo.calls, ['bookings', 'briefs']);
    expect(cubit.state.status, client.ListStatus.ready);
  });

  test('a foreground push before the first read does nothing', () async {
    final repo = FakeAccountRepository();
    final cubit = client.BookingsCubit(
      getBookings: GetBookings(repo),
      getBriefs: GetBriefs(repo),
      pushEvents: pushes.stream,
    );
    addTearDown(cubit.close);

    pushes.add(_push);
    await pumpEventQueue();

    expect(repo.calls, isEmpty);
  });

  test('a foreground push reloads the creator bookings', () async {
    final repo = MockCreatorAccountRepository();
    when(repo.bookings).thenAnswer((_) async => Ok(bookingsExample()));
    final cubit = creator.BookingsCubit(
      repository: repo,
      clock: FixedClock(DateTime.utc(2026, 11, 12, 10)),
      pushEvents: pushes.stream,
    );
    addTearDown(cubit.close);
    await cubit.load();

    pushes.add(_push);
    await pumpEventQueue();

    verify(repo.bookings).called(2);
    expect(cubit.state, isA<creator.BookingsLoaded>());
  });

  test('a foreground push reloads the notifications', () async {
    final repo = _NoticesRepo();
    when(repo.notices).thenAnswer(
      (_) async => Ok(NoticesModel.fromJson(loadExample('notices')).toEntity()),
    );
    final cubit = NotificationsCubit(repo, pushEvents: pushes.stream);
    addTearDown(cubit.close);
    await cubit.load();

    pushes.add(_push);
    await pumpEventQueue();

    verify(repo.notices).called(2);
    expect(cubit.state, isA<NotificationsLoaded>());
  });
}
