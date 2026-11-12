import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/quick_match/domain/entities/quick_match.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/booking_view_cubit.dart';

import '../../../../helpers/quick_match_fixtures.dart';

void main() {
  late MockQuickMatchRepository repository;

  BookingViewCubit make() =>
      BookingViewCubit(repository: repository, ref: 'Q-4F8Z2', key: exampleKey);

  setUp(() {
    repository = MockQuickMatchRepository();
    when(() => repository.getBooking(any(), any()))
        .thenAnswer((_) async => Ok(exampleView('quoted')));
  });

  group('MQ-US3 quotation', () {
    test('MQ-US3-S1 loads the quotation with its one action', () async {
      final cubit = make();
      await cubit.load();
      expect(cubit.state.status, BookingViewStatus.ready);
      expect(cubit.state.view!.state, BookingState.quoted);
      expect(cubit.state.view!.canAccept, isTrue);
      expect(cubit.state.view!.nextStep, NextStep.accept);
    });

    test('MQ-US3-S2 accepting shows the accepted booking', () async {
      when(() => repository.accept(any(), any()))
          .thenAnswer((_) async => Ok(exampleView('accepted')));
      final cubit = make();
      await cubit.load();
      await cubit.accept();
      expect(cubit.state.view!.state, BookingState.accepted);
      expect(cubit.state.busy, isFalse);
    });

    test(
      'MQ-US3-S3 a second tap while the first is on its way sends nothing more',
      () async {
        when(() => repository.accept(any(), any()))
            .thenAnswer((_) async => Ok(exampleView('accepted')));
        final cubit = make();
        await cubit.load();
        await Future.wait([cubit.accept(), cubit.accept()]);
        verify(() => repository.accept(any(), any())).called(1);
      },
    );

    test(
      'MQ-US3-S5 an expired quotation offers a fresh one and no accepting',
      () async {
        when(() => repository.getBooking(any(), any()))
            .thenAnswer((_) async => Ok(exampleView('expired')));
        final cubit = make();
        await cubit.load();
        expect(cubit.state.view!.state, BookingState.expired);
        expect(cubit.state.view!.canAccept, isFalse);
        expect(cubit.state.view!.nextStep, NextStep.freshQuotation);
      },
    );

    test(
      'MQ-US3-S6 a fresh quotation gives the brief link to open step 2',
      () async {
        when(() => repository.fresh(any(), any())).thenAnswer(
          (_) async => const Ok(
            FreshQuotation(
              briefReference: 'B-7K2M9',
              briefKey: 'k',
              picks: [Pick(persona: 'photographer', code: '0087')],
            ),
          ),
        );
        final cubit = make();
        await cubit.load();
        await cubit.getFresh();
        expect(cubit.state.fresh!.briefReference, 'B-7K2M9');
      },
    );

    test('MQ-US3-S7 a wrong key is not-found and shows nothing', () async {
      when(() => repository.getBooking(any(), any()))
          .thenAnswer((_) async => const Err(NotFoundFailure()));
      final cubit = make();
      await cubit.load();
      expect(cubit.state.status, BookingViewStatus.notFound);
      expect(cubit.state.view, isNull);
    });
  });

  group('MQ-US4 and MQ-US5 booking states', () {
    test('MQ-US4-S1 confirmed shows awaiting payment with the chat as the next step', () async {
      when(() => repository.getBooking(any(), any()))
          .thenAnswer((_) async => Ok(exampleView('confirmed')));
      final cubit = make();
      await cubit.load();
      expect(cubit.state.view!.nextStep, NextStep.pay);
      expect(
        cubit.state.view!.progress
            .firstWhere((p) => p.key == ProgressKey.confirmed)
            .at,
        isNotNull,
      );
    });

    test('MQ-US4-S4 a declined creator offers other free ones, and picking one shows the booking', () async {
      when(() => repository.getBooking(any(), any()))
          .thenAnswer((_) async => Ok(exampleView('lapsed')));
      when(() => repository.pickAnother(any(), any(), any(), any()))
          .thenAnswer((_) async => Ok(exampleView('reassigned')));
      final cubit = make();
      await cubit.load();
      expect(cubit.state.view!.nextStep, NextStep.chooseAnother);
      expect(
        cubit.state.view!.replacements.single.creators.single.code,
        '0421',
      );
      await cubit.pickAnother('photographer', '0421');
      expect(cubit.state.view!.professionals.single.name, 'Mariam A.');
    });

    test('MQ-US5-S2 confirming delivery completes the booking', () async {
      when(() => repository.getBooking(any(), any()))
          .thenAnswer((_) async => Ok(exampleView('delivered')));
      when(() => repository.confirmDelivery(any(), any()))
          .thenAnswer((_) async => Ok(exampleView('completed')));
      final cubit = make();
      await cubit.load();
      expect(cubit.state.view!.canConfirmDelivery, isTrue);
      await cubit.confirmDelivery();
      expect(cubit.state.view!.state, BookingState.completed);
    });

    test(
      'MQ-US5-S3 a reported problem puts the booking on hold with the text',
      () async {
        when(() => repository.report(any(), any(), any()))
            .thenAnswer((_) async => Ok(exampleView('on-hold')));
        final cubit = make();
        await cubit.load();
        await cubit.report('The photos never arrived.');
        verify(
          () => repository.report(any(), any(), 'The photos never arrived.'),
        ).called(1);
        expect(cubit.state.view!.state, BookingState.onHold);
        expect(cubit.state.view!.holdReason, 'The photos never arrived.');
      },
    );

    test('a state conflict shows the booking as it stands now', () async {
      when(() => repository.confirmDelivery(any(), any())).thenAnswer(
        (_) async => const Err(
          ServerFailure(statusCode: 409, code: 'booking.errors.terminal'),
        ),
      );
      final cubit = make();
      await cubit.load();
      when(() => repository.getBooking(any(), any()))
          .thenAnswer((_) async => Ok(exampleView('completed')));
      await cubit.confirmDelivery();
      expect(cubit.state.view!.state, BookingState.completed);
      expect(
        (cubit.state.commandFailure! as ServerFailure).code,
        'booking.errors.terminal',
      );
    });
  });
}
