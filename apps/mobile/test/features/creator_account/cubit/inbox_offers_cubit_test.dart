import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/push/push_service.dart';
import 'package:shoot_mobile/features/creator_account/presentation/cubit/inbox_cubit.dart';

import '../fixtures.dart';

void main() {
  late MockInboxRepository repo;
  late StreamController<PushEvent> pushes;
  final offers = inboxExample('creator-briefs-offers');
  final item = offers.open.first;

  setUpAll(() => registerFallbackValue(item));
  setUp(() {
    repo = MockInboxRepository();
    pushes = StreamController<PushEvent>.broadcast();
    when(() => repo.inbox()).thenAnswer((_) async => Ok(offers));
  });
  tearDown(() => pushes.close());

  group('OF-US2 the creator sees the client price', () {
    test('OF-US2-S1 an offers brief carries the price, range, place and changes left', () {
      final offer = item.offer!;
      expect(offer.budgetFils, 80000);
      expect(offer.minFils, 56000);
      expect(offer.maxFils, 160000);
      expect(offer.revisionsLeft, 3);
      expect(offer.declined, isFalse);
      expect(offer.place!.area, 'Yas Island');
      expect(
        offers.open[1].offer,
        isNull,
        reason: 'a fixed-price brief has no offer',
      );
    });

    test('OF-US2-S4 a new-brief push refreshes the inbox at once; other events do not', () async {
      final cubit = InboxCubit(repo, pushEvents: pushes.stream);
      await cubit.load();
      clearInteractions(repo);
      pushes
        ..add(const PushEvent(event: 'booking-paid', path: '/account'))
        ..add(const PushEvent(event: 'brief-new', path: '/account/inbox'))
        ..add(const PushEvent(event: 'offer-declined', path: '/account/inbox'));
      await Future<void>.delayed(Duration.zero);
      verify(() => repo.inbox()).called(2);
      await cubit.close();
    });
  });

  group('OF-US3 the creator offers a price', () {
    test('OF-US3-S1 accepting at the client price sends no amount', () async {
      when(() => repo.accept(any(), amountFils: any(named: 'amountFils')))
          .thenAnswer((_) async => Ok(offers));
      final cubit = InboxCubit(repo);
      await cubit.load();
      await cubit.accept(item);
      verify(() => repo.accept(item)).called(1);
      await cubit.close();
    });

    test('OF-US3-S2 another price is sent as the amount', () async {
      when(() => repo.accept(any(), amountFils: any(named: 'amountFils')))
          .thenAnswer((_) async => Ok(offers));
      final cubit = InboxCubit(repo);
      await cubit.load();
      await cubit.accept(item, amountFils: 95000);
      verify(() => repo.accept(item, amountFils: 95000)).called(1);
      await cubit.close();
    });

    test('OF-US3-S3 a refused offer keeps the card and shows why', () async {
      when(() => repo.accept(any(), amountFils: any(named: 'amountFils')))
          .thenAnswer((_) async => const Err(NetworkFailure()));
      final cubit = InboxCubit(repo);
      await cubit.load();
      await cubit.accept(item, amountFils: 1);
      final s = cubit.state as InboxLoaded;
      expect(s.failure, const NetworkFailure());
      expect(s.busyKey, isNull);
      await cubit.close();
    });

    test('a quiet refresh waits while an answer is being sent', () async {
      final gate = Completer<Result<dynamic>>();
      when(() => repo.accept(any(), amountFils: any(named: 'amountFils')))
          .thenAnswer((_) async {
            await gate.future;
            return Ok(offers);
          });
      final cubit = InboxCubit(repo);
      await cubit.load();
      clearInteractions(repo);
      final sending = cubit.accept(item);
      await cubit.refresh();
      verifyNever(() => repo.inbox());
      gate.complete(Ok(offers));
      await sending;
      await cubit.close();
    });
  });
}
