import 'dart:async';

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/push/push_service.dart';
import 'package:shoot_mobile/features/quick_match/data/models/quick_match_models.dart';
import 'package:shoot_mobile/features/quick_match/domain/entities/quick_match.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/match_cubit.dart';

import '../../../../helpers/api_examples.dart';
import '../../../../helpers/quick_match_fixtures.dart';

MatchPage offersPage() =>
    MatchPageModel.fromJson(loadExample('match-offers-declined')).toEntity();

void main() {
  late MockQuickMatchRepository repository;
  late StreamController<PushEvent> pushes;

  MatchCubit make() => MatchCubit(
    repository: repository,
    ref: exampleRef,
    key: exampleKey,
    pushEvents: pushes.stream,
  );

  void answers(MatchPage page) => when(
    () => repository.getMatch(
      any(),
      any(),
      date: any(named: 'date'),
      duration: any(named: 'duration'),
    ),
  ).thenAnswer((_) async => Ok(page));

  setUp(() {
    repository = MockQuickMatchRepository();
    pushes = StreamController<PushEvent>.broadcast();
    answers(offersPage());
  });

  tearDown(() => pushes.close());

  group('OF-US4 step 2 lists offers', () {
    test(
      'OF-US4-S1 offers mode: the picked offer carries its amount as expect',
      () async {
        final cubit = make();
        await cubit.load();
        final page = cubit.state.page!;
        expect(page.offersMode, isTrue);
        expect(page.sentTo, 7);
        final offer = page.sections.first.offers!.first;
        expect(cubit.state.picks!.first.expectFils, offer.amountFils);
        await cubit.close();
      },
    );

    test(
      'OF-US4-S5 declining an offer shows step 2 as the server answers it',
      () async {
        final cubit = make();
        await cubit.load();
        final after = MatchPageModel.fromJson(
          loadExample('match-offers-declined'),
        ).toEntity();
        when(
          () => repository.declineOffer(
            any(),
            any(),
            persona: any(named: 'persona'),
            creator: any(named: 'creator'),
          ),
        ).thenAnswer((_) async => Ok(after));
        await cubit.decline(0, 0);
        verify(
          () => repository.declineOffer(
            exampleRef,
            exampleKey,
            persona: 'photographer',
            creator: '0087',
          ),
        ).called(1);
        expect(cubit.state.failure, isNull);
        await cubit.close();
      },
    );

    test('a refused decline keeps the list and shows the failure', () async {
      final cubit = make();
      await cubit.load();
      when(
        () => repository.declineOffer(
          any(),
          any(),
          persona: any(named: 'persona'),
          creator: any(named: 'creator'),
        ),
      ).thenAnswer((_) async => const Err(NetworkFailure()));
      await cubit.decline(0, 0);
      expect(cubit.state.failure, const NetworkFailure());
      expect(cubit.state.page, isNotNull);
      await cubit.close();
    });

    test(
      'OF-US4-S2 a new-offer push for this brief reloads the list at once',
      () async {
        final cubit = make();
        await cubit.load();
        clearInteractions(repository);
        pushes
          ..add(const PushEvent(event: 'offer-new', path: '/match/other/k'))
          ..add(
            const PushEvent(
              event: 'offer-new',
              path: '/match/$exampleRef/$exampleKey',
            ),
          );
        await Future<void>.delayed(Duration.zero);
        verify(
          () => repository.getMatch(
            exampleRef,
            exampleKey,
            date: any(named: 'date'),
            duration: any(named: 'duration'),
          ),
        ).called(1);
        await cubit.close();
      },
    );

    test('the fixed flow never starts polling', () async {
      answers(exampleMatch());
      final cubit = make();
      await cubit.load();
      cubit.startLive();
      expect(cubit.state.page!.offersMode, isFalse);
      verifyNever(() => repository.matchStamp(any(), any()));
      await cubit.close();
    });

    test('OF-EC-01 a closed brief decodes as closed with no offers', () {
      final json = loadExample('match-offers-declined')..['closed'] = true;
      final page = MatchPageModel.fromJson(json).toEntity();
      expect(page.closed, isTrue);
      expect(offersPage().closed, isFalse);
    });

    test(
      'OF-US4-S7 after a moved offer the reload names whose price changed',
      () async {
        final cubit = make();
        await cubit.load();
        final offer = cubit.state.page!.sections.first.offers!.first;
        await cubit.reloadAfterMove([
          Pick(
            persona: 'photographer',
            code: offer.creator.code,
            expectFils: offer.amountFils - 5000,
          ),
        ]);
        expect(cubit.state.moved, offer.creator.firstName);
        cubit.dismissMoved();
        expect(cubit.state.moved, isNull);
        // The same amount: nothing moved, no notice.
        await cubit.reloadAfterMove([
          Pick(
            persona: 'photographer',
            code: offer.creator.code,
            expectFils: offer.amountFils,
          ),
        ]);
        expect(cubit.state.moved, isNull);
        await cubit.close();
      },
    );

    test(
      'OF-US5-S2 the details total is the chosen offers plus the fee',
      () async {
        final cubit = make();
        await cubit.load();
        final offer = cubit.state.page!.sections.first.offers!.first;
        expect(cubit.state.offersTotalFils, offer.totalFils);
        answers(exampleMatch());
        final fixed = make();
        await fixed.load();
        expect(fixed.state.offersTotalFils, isNull);
        await fixed.close();
        await cubit.close();
      },
    );
  });
}
