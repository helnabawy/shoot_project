import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/quick_match/domain/entities/quick_match.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/match_cubit.dart';

import '../../../../helpers/quick_match_fixtures.dart';

void main() {
  late MockQuickMatchRepository repository;

  MatchCubit make() =>
      MatchCubit(repository: repository, ref: exampleRef, key: exampleKey);

  setUp(() {
    repository = MockQuickMatchRepository();
    when(
      () => repository.getMatch(
        any(),
        any(),
        date: any(named: 'date'),
        duration: any(named: 'duration'),
      ),
    ).thenAnswer((_) async => Ok(exampleMatch()));
  });

  group('MQ-US1 step 2 cubit', () {
    test(
      'MQ-US1-S1 loads the creators free, the first one chosen with its price',
      () async {
        final cubit = make();
        await cubit.load();
        expect(cubit.state.status, MatchStatus.ready);
        expect(cubit.state.page!.sections.single.creators, hasLength(3));
        expect(cubit.state.chosenIn(0)!.firstName, 'Omar');
        expect(cubit.state.page!.totalFils, 95000);
        expect(cubit.state.picks, [
          const Pick(persona: 'photographer', code: '0087'),
        ]);
      },
    );

    test('MQ-US1-S2 choosing another card makes it the chosen one and the pick follows', () async {
      final cubit = make();
      await cubit.load();
      cubit.choose(0, 1);
      expect(cubit.state.chosenIn(0)!.firstName, 'Mariam');
      expect(cubit.state.picks!.single.code, '0421');
    });

    test(
      'MQ-US1-S4 "Not sure? Let us pick" continues without a creator',
      () async {
        final cubit = make();
        await cubit.load();
        cubit.letTeamPick();
        expect(cubit.state.chosenIn(0), isNull);
        expect(cubit.state.picks, [
          const Pick(persona: 'photographer', code: null),
        ]);
        cubit.choose(0, 2);
        expect(cubit.state.letUsPick, isEmpty);
      },
    );

    test(
      'MQ-US1-S6 nobody free: no picks, and the nearest days with their counts',
      () async {
        when(
          () => repository.getMatch(
            any(),
            any(),
            date: any(named: 'date'),
            duration: any(named: 'duration'),
          ),
        ).thenAnswer((_) async => Ok(exampleNoneFree()));
        final cubit = make();
        await cubit.load();
        expect(cubit.state.page!.noneFree, isTrue);
        expect(cubit.state.picks, isNull);
        expect(cubit.state.page!.nearby.map((d) => d.free), [3, 2, 5]);
      },
    );

    test(
      'MQ-US1-S7 picking another day changes only the date and reloads',
      () async {
        final cubit = make();
        await cubit.load();
        await cubit.changeDay('2026-12-13');
        verify(
          () => repository.getMatch(
            exampleRef,
            exampleKey,
            date: '2026-12-13',
            duration: null,
          ),
        ).called(1);
        expect(cubit.state.date, '2026-12-13');
      },
    );

    test('MQ-US1-S9 price on request has no total', () async {
      final page = exampleMatch();
      when(
        () => repository.getMatch(
          any(),
          any(),
          date: any(named: 'date'),
          duration: any(named: 'duration'),
        ),
      ).thenAnswer(
        (_) async => Ok(
          MatchPage(
            reference: page.reference,
            sentence: page.sentence,
            briefDate: page.briefDate,
            duration: page.duration,
            date: page.date,
            priceOnRequest: true,
            durations: page.durations,
            totalFils: null,
            sections: page.sections,
            nearby: const [],
            whatsappUrl: null,
          ),
        ),
      );
      final cubit = make();
      await cubit.load();
      expect(cubit.state.page!.priceOnRequest, isTrue);
      expect(cubit.state.page!.totalFils, isNull);
    });

    test(
      'a wrong key is not-found (screen 37), another failure is a retry',
      () async {
        when(
          () => repository.getMatch(
            any(),
            any(),
            date: any(named: 'date'),
            duration: any(named: 'duration'),
          ),
        ).thenAnswer((_) async => const Err(NotFoundFailure()));
        final cubit = make();
        await cubit.load();
        expect(cubit.state.status, MatchStatus.notFound);
        when(
          () => repository.getMatch(
            any(),
            any(),
            date: any(named: 'date'),
            duration: any(named: 'duration'),
          ),
        ).thenAnswer((_) async => const Err(NetworkFailure()));
        await cubit.load();
        expect(cubit.state.status, MatchStatus.failed);
      },
    );
  });
}
