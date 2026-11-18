import 'package:bloc_test/bloc_test.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/creator_home/data/models/creator_home_model.dart';
import 'package:shoot_mobile/features/creator_home/domain/entities/creator_home.dart';
import 'package:shoot_mobile/features/creator_home/domain/repositories/creator_home_repository.dart';
import 'package:shoot_mobile/features/creator_home/presentation/cubit/creator_home_cubit.dart';

import '../../helpers/api_examples.dart';

class _Repository extends Mock implements CreatorHomeRepository {}

CreatorHome example(String name) =>
    CreatorHomeModel.fromJson(loadExample(name)).toEntity();

void main() {
  late _Repository repository;
  late CreatorHome live;
  late CreatorHome clear;

  setUpAll(() {
    live = example('creator-home');
    clear = example('creator-home-clear');
  });
  setUp(() => repository = _Repository());

  CreatorHomeCubit make() => CreatorHomeCubit(repository);
  HomeBooking booking() => live.queue.whereType<HomeBooking>().first;
  HomeBrief brief() => live.queue.whereType<HomeBrief>().first;

  group('CH-US1-S1 loading the home', () {
    blocTest<CreatorHomeCubit, CreatorHomeState>(
      'reads the home',
      build: () {
        when(() => repository.home()).thenAnswer((_) async => Ok(live));
        return make();
      },
      act: (cubit) => cubit.load(),
      expect: () => [const CreatorHomeLoading(), CreatorHomeLoaded(live)],
    );

    blocTest<CreatorHomeCubit, CreatorHomeState>(
      'fails with the failure so the screen can offer "Try again"',
      build: () {
        when(() => repository.home())
            .thenAnswer((_) async => const Err(NetworkFailure()));
        return make();
      },
      act: (cubit) => cubit.load(),
      expect: () => [
        const CreatorHomeLoading(),
        const CreatorHomeFailed(NetworkFailure()),
      ],
    );
  });

  group('CH-US1-S2 accepting a booking request', () {
    blocTest<CreatorHomeCubit, CreatorHomeState>(
      'confirms it and reads the home again, so the next request is the card',
      build: () {
        var reads = 0;
        when(() => repository.home())
            .thenAnswer((_) async => Ok(reads++ == 0 ? live : clear));
        when(() => repository.answerBooking(any(), confirm: true))
            .thenAnswer((_) async => const Ok(null));
        return make();
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.accept(booking());
      },
      expect: () => [
        const CreatorHomeLoading(),
        CreatorHomeLoaded(live),
        CreatorHomeLoaded(live, answering: booking().key),
        CreatorHomeLoaded(clear),
      ],
      verify: (_) =>
          verify(() => repository.answerBooking(booking().ref, confirm: true))
              .called(1),
    );
  });

  group('CH-US1-S3 accepting a brief', () {
    blocTest<CreatorHomeCubit, CreatorHomeState>(
      'accepts it for its professional type',
      build: () {
        when(() => repository.home()).thenAnswer((_) async => Ok(live));
        when(
          () => repository.answerBrief(
            any(),
            persona: any(named: 'persona'),
            accept: true,
          ),
        ).thenAnswer((_) async => const Ok(null));
        return make();
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.accept(brief());
      },
      verify: (_) => verify(
        () => repository.answerBrief(
          brief().ref,
          persona: brief().persona,
          accept: true,
        ),
      ).called(1),
    );
  });

  group('CH-US1-S4 declining', () {
    blocTest<CreatorHomeCubit, CreatorHomeState>(
      'a booking with the optional reason',
      build: () {
        when(() => repository.home()).thenAnswer((_) async => Ok(live));
        when(
          () => repository.answerBooking(
            any(),
            confirm: false,
            reason: any(named: 'reason'),
          ),
        ).thenAnswer((_) async => const Ok(null));
        return make();
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.decline(booking(), reason: 'Booked elsewhere');
      },
      verify: (_) => verify(
        () => repository.answerBooking(
          booking().ref,
          confirm: false,
          reason: 'Booked elsewhere',
        ),
      ).called(1),
    );

    blocTest<CreatorHomeCubit, CreatorHomeState>(
      'a brief with a reason and a note, or with neither',
      build: () {
        when(() => repository.home()).thenAnswer((_) async => Ok(live));
        when(
          () => repository.answerBrief(
            any(),
            persona: any(named: 'persona'),
            accept: false,
            reason: any(named: 'reason'),
            note: any(named: 'note'),
          ),
        ).thenAnswer((_) async => const Ok(null));
        return make();
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.decline(brief(), reason: 'too-far', note: 'Too far');
        await cubit.decline(brief());
      },
      verify: (_) {
        verify(
          () => repository.answerBrief(
            brief().ref,
            persona: brief().persona,
            accept: false,
            reason: 'too-far',
            note: 'Too far',
          ),
        ).called(1);
        verify(
          () => repository.answerBrief(
            brief().ref,
            persona: brief().persona,
            accept: false,
          ),
        ).called(1);
      },
    );
  });

  group('CH-US1-S8 an answer that does not go through', () {
    blocTest<CreatorHomeCubit, CreatorHomeState>(
      'a request that is no longer open records nothing, says so and moves the queue on',
      build: () {
        var reads = 0;
        when(() => repository.home())
            .thenAnswer((_) async => Ok(reads++ == 0 ? live : clear));
        when(() => repository.answerBooking(any(), confirm: true))
            .thenAnswer((_) async => const Err(ServerFailure(statusCode: 409)));
        return make();
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.accept(booking());
      },
      expect: () => [
        const CreatorHomeLoading(),
        CreatorHomeLoaded(live),
        CreatorHomeLoaded(live, answering: booking().key),
        CreatorHomeLoaded(clear, notice: HomeNotice.closed),
      ],
    );

    blocTest<CreatorHomeCubit, CreatorHomeState>(
      'a request that is not this creator’s reads as no longer open too',
      build: () {
        when(() => repository.home()).thenAnswer((_) async => Ok(live));
        when(() => repository.answerBooking(any(), confirm: true))
            .thenAnswer((_) async => const Err(ServerFailure(statusCode: 403)));
        return make();
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.accept(booking());
      },
      verify: (cubit) =>
          expect((cubit.state as CreatorHomeLoaded).notice, HomeNotice.closed),
    );

    blocTest<CreatorHomeCubit, CreatorHomeState>(
      'a failed send keeps the card and says it was not sent, so it can be tried again',
      build: () {
        when(() => repository.home()).thenAnswer((_) async => Ok(live));
        when(() => repository.answerBooking(any(), confirm: true))
            .thenAnswer((_) async => const Err(NetworkFailure()));
        return make();
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.accept(booking());
      },
      expect: () => [
        const CreatorHomeLoading(),
        CreatorHomeLoaded(live),
        CreatorHomeLoaded(live, answering: booking().key),
        CreatorHomeLoaded(live, notice: HomeNotice.notSent),
      ],
    );

    blocTest<CreatorHomeCubit, CreatorHomeState>(
      'ignores a second answer while one is being sent',
      build: () {
        when(() => repository.home()).thenAnswer((_) async => Ok(live));
        when(() => repository.answerBooking(any(), confirm: true))
            .thenAnswer((_) async {
              await Future<void>.delayed(const Duration(milliseconds: 20));
              return const Ok(null);
            });
        return make();
      },
      act: (cubit) async {
        await cubit.load();
        final first = cubit.accept(booking());
        await cubit.accept(booking());
        await first;
      },
      verify: (_) =>
          verify(() => repository.answerBooking(any(), confirm: true))
              .called(1),
    );
  });

  group('CH-US1-S1 refreshing', () {
    blocTest<CreatorHomeCubit, CreatorHomeState>(
      'keeps what is shown until the new answer arrives, and keeps it if the read fails',
      build: () {
        var reads = 0;
        when(() => repository.home()).thenAnswer(
          (_) async => switch (reads++) {
            0 => Ok(live),
            1 => Ok(clear),
            _ => const Err(NetworkFailure()),
          },
        );
        return make();
      },
      act: (cubit) async {
        await cubit.load();
        await cubit.refresh();
        await cubit.refresh();
      },
      expect: () => [
        const CreatorHomeLoading(),
        CreatorHomeLoaded(live),
        CreatorHomeLoaded(clear),
      ],
    );

    blocTest<CreatorHomeCubit, CreatorHomeState>(
      'loads from scratch when nothing is shown yet',
      build: () {
        when(() => repository.home()).thenAnswer((_) async => Ok(live));
        return make();
      },
      act: (cubit) => cubit.refresh(),
      expect: () => [const CreatorHomeLoading(), CreatorHomeLoaded(live)],
    );
  });
}
