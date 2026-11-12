import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/creator_account.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/availability_cubit.dart';

import '../fixtures.dart';

void main() {
  late MockCreatorAccountRepository repo;
  late Availability a;

  setUp(() {
    repo = MockCreatorAccountRepository();
    a = availabilityExample();
    when(() => repo.availability()).thenAnswer((_) async => Ok(a));
  });

  Future<AvailabilityCubit> loaded() async {
    final c = AvailabilityCubit(repo);
    await c.load();
    return c;
  }

  AvailabilityLoaded at(AvailabilityCubit c) => c.state as AvailabilityLoaded;

  test('MW-US4-S1 opens on the current month with the blocked count', () async {
    final c = await loaded();
    expect(at(c).month, DateTime(2026, 11));
    expect(at(c).availability.blockedCount, 1);
    expect(at(c).list, isFalse);
  });

  test('MW-US4-S2 a tap blocks a free day at once and shows Saved', () async {
    final day = DateTime(2026, 11, 25);
    when(() => repo.setDay(day, blocked: true))
        .thenAnswer((_) async => Ok(a.withDay(day, true)));
    final c = await loaded();
    final states = <AvailabilityState>[];
    final sub = c.stream.listen(states.add);
    await c.toggle(day);
    await sub.cancel();
    expect(
      (states.first as AvailabilityLoaded).availability.kindOf(day),
      DayKind.blocked,
    );
    expect(at(c).notice, DayNotice.saved);
    expect(at(c).availability.blockedCount, 2);
  });

  test('MW-US4-S2 tapping a blocked day frees it', () async {
    final day = DateTime(2026, 11, 20);
    when(() => repo.setDay(day, blocked: false))
        .thenAnswer((_) async => Ok(a.withDay(day, false)));
    final c = await loaded();
    await c.toggle(day);
    expect(at(c).availability.kindOf(day), isNull);
    expect(at(c).availability.blockedCount, 0);
  });

  test('MW-US4-S3 a booked day does not change and a line says why', () async {
    final c = await loaded();
    await c.toggle(DateTime(2026, 11, 30));
    expect(at(c).notice, DayNotice.booked);
    verifyNever(() => repo.setDay(any(), blocked: any(named: 'blocked')));
  });

  test('MW-US4-S3 days outside the window do not change', () async {
    final c = await loaded();
    await c.toggle(DateTime(2026, 11, 1));
    expect(at(c).notice, DayNotice.outside);
    await c.toggle(DateTime(2027, 3, 1));
    expect(at(c).notice, DayNotice.outside);
    verifyNever(() => repo.setDay(any(), blocked: any(named: 'blocked')));
  });

  test('MW-US4-S4 months move within the window only', () async {
    final c = await loaded();
    c.previousMonth();
    expect(at(c).month, DateTime(2026, 11));
    for (var i = 0; i < 6; i++) {
      c.nextMonth();
    }
    expect(at(c).month, DateTime(2027, 2));
    expect(at(c).canGoForward, isFalse);
    c.previousMonth();
    expect(at(c).month, DateTime(2027, 1));
  });

  test('MW-US4-S5 a failed save returns the day with a failure', () async {
    final day = DateTime(2026, 11, 25);
    when(() => repo.setDay(day, blocked: true))
        .thenAnswer((_) async => const Err(NetworkFailure()));
    final c = await loaded();
    await c.toggle(day);
    expect(at(c).availability.kindOf(day), isNull);
    expect(at(c).failure, const NetworkFailure());
    expect(at(c).notice, isNull);
  });

  test('MW-US4-S6 the list view shows every day of the window', () async {
    final c = await loaded();
    c.showList(list: true);
    expect(at(c).list, isTrue);
    expect(at(c).window, hasLength(90));
    expect(at(c).window.first, DateTime(2026, 11, 12));
    c.showList(list: false);
    expect(at(c).list, isFalse);
  });

  test('a failed first read is a failure state', () async {
    when(() => repo.availability())
        .thenAnswer((_) async => const Err(NetworkFailure()));
    final c = AvailabilityCubit(repo);
    await c.load();
    expect(c.state, isA<AvailabilityFailed>());
  });
}
