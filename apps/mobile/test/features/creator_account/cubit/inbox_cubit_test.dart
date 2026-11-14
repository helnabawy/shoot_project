import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creator_account/domain/entities/inbox.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/account_cubit.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/inbox_cubit.dart';

import '../fixtures.dart';

void main() {
  late MockInboxRepository repo;
  final open = inboxExample();
  final answered = inboxExample('creator-briefs-answered');
  final item = open.open.first;

  setUpAll(() => registerFallbackValue(item));
  setUp(() => repo = MockInboxRepository());

  InboxCubit loaded() => InboxCubit(repo)..emit(InboxLoaded(open));

  group('BI-US1-S7 the inbox in the app', () {
    blocTest<InboxCubit, InboxState>(
      'loads the same briefs the website shows',
      setUp: () => when(() => repo.inbox()).thenAnswer((_) async => Ok(open)),
      build: () => InboxCubit(repo),
      act: (c) => c.load(),
      expect: () => [const InboxLoading(), InboxLoaded(open)],
    );

    blocTest<InboxCubit, InboxState>(
      'a failed read is a failure state',
      setUp: () =>
          when(() => repo.inbox())
              .thenAnswer((_) async => const Err(NetworkFailure())),
      build: () => InboxCubit(repo),
      act: (c) => c.load(),
      expect: () => [const InboxLoading(), const InboxFailed(NetworkFailure())],
    );
  });

  group('BI-US2 accepting', () {
    blocTest<InboxCubit, InboxState>(
      'BI-US2-S1 accepting waits on that brief, then shows the new inbox',
      setUp: () =>
          when(() => repo.accept(item)).thenAnswer((_) async => Ok(answered)),
      build: loaded,
      act: (c) => c.accept(item),
      expect: () => [
        InboxLoaded(open, busyKey: item.key),
        InboxLoaded(answered),
      ],
    );

    blocTest<InboxCubit, InboxState>(
      'BI-US2-S7 a closed brief keeps the list and says why',
      setUp: () => when(() => repo.accept(item)).thenAnswer(
        (_) async => const Err(
          ServerFailure(statusCode: 409, code: 'inbox.errors.briefClosed'),
        ),
      ),
      build: loaded,
      act: (c) => c.accept(item),
      expect: () => [
        InboxLoaded(open, busyKey: item.key),
        InboxLoaded(
          open,
          failure: const ServerFailure(
            statusCode: 409,
            code: 'inbox.errors.briefClosed',
          ),
        ),
      ],
    );

    blocTest<InboxCubit, InboxState>(
      'a second tap while sending does nothing',
      build: () => InboxCubit(repo)..emit(InboxLoaded(open, busyKey: item.key)),
      act: (c) => c.accept(item),
      expect: () => const <InboxState>[],
      verify: (_) => verifyNever(() => repo.accept(any())),
    );

    blocTest<InboxCubit, InboxState>(
      'BI-US2-S9 taking back a yes',
      setUp: () =>
          when(() => repo.withdraw(item)).thenAnswer((_) async => Ok(open)),
      build: () => InboxCubit(repo)..emit(InboxLoaded(answered)),
      act: (c) => c.withdraw(item),
      expect: () => [
        InboxLoaded(answered, busyKey: item.key),
        InboxLoaded(open),
      ],
    );
  });

  group('BI-US3 rejecting', () {
    blocTest<InboxCubit, InboxState>(
      'BI-US3-S2 the optional reason and note are sent',
      setUp: () =>
          when(() => repo.reject(item, reason: 'too-far', note: 'Only Marina'))
              .thenAnswer((_) async => Ok(answered)),
      build: loaded,
      act: (c) => c.reject(item, reason: 'too-far', note: 'Only Marina'),
      expect: () => [
        InboxLoaded(open, busyKey: item.key),
        InboxLoaded(answered),
      ],
    );

    blocTest<InboxCubit, InboxState>(
      'BI-US3-S4 undo brings the brief back',
      setUp: () =>
          when(() => repo.withdraw(any())).thenAnswer((_) async => Ok(open)),
      build: () => InboxCubit(repo)..emit(InboxLoaded(answered)),
      act: (c) => c.withdraw(answered.rejected.single),
      expect: () => [
        InboxLoaded(answered, busyKey: answered.rejected.single.key),
        InboxLoaded(open),
      ],
    );
  });

  group('BI-US1 Up next', () {
    test('BI-US1-S1 a live creator with matching briefs sees them', () {
      expect(
        AccountLoaded(accountWithBriefsExample()).upNext,
        UpNextKind.briefs,
      );
    });

    test('BI-US1-S5 a booking waiting for an answer comes first', () {
      final a = accountWithBriefsExample();
      final waiting = bookingsExample().waiting.first;
      expect(
        AccountLoaded(withWaiting(a, waiting)).upNext,
        UpNextKind.answerRequest,
      );
    });

    test('BI-US1-S6 no matching briefs: nothing waits', () {
      final a = accountWithBriefsExample();
      expect(
        AccountLoaded(
          withBriefs(a, const BriefsSummary(count: 0, soonest: null)),
        ).upNext,
        UpNextKind.none,
      );
    });
  });
}
