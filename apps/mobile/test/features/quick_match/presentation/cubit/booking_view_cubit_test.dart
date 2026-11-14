import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/features/quick_match/domain/entities/quick_match.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/booking_view_cubit.dart';

import '../../../../helpers/quick_match_fixtures.dart';

void main() {
  late MockQuickMatchRepository repository;

  BookingViewCubit make() => BookingViewCubit(
    repository: repository,
    ref: 'Q-4F8Z2',
    key: exampleKey,
    pollEvery: Duration.zero,
    pollTimes: 3,
  );

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

  group('020 paying online from the app', () {
    const checkout = 'https://checkout.stripe.com/c/pay/cs_test_1';
    BookingView paid() => exampleView('confirmed', (j) {
      j['state'] = 'paid';
      j['nextStep'] = 'shootDay';
      j['canPayOnline'] = false;
    });

    test('PY-US2-S1 a confirmed booking with online payment on offers Pay; an older server without the field does not', () {
      expect(exampleView('confirmed').canPayOnline, isTrue);
      expect(
        exampleView('confirmed', (j) => j.remove('canPayOnline')).canPayOnline,
        isFalse,
      );
      expect(paid().canPayOnline, isFalse);
    });

    test('PY-US2-S2 PY-US1-S4 Pay opens the secure page; back in the app it reloads until the booking is paid', () async {
      when(() => repository.getBooking(any(), any()))
          .thenAnswer((_) async => Ok(exampleView('confirmed')));
      when(() => repository.pay(any(), any()))
          .thenAnswer((_) async => const Ok(checkout));
      final cubit = make();
      await cubit.load();
      final opened = <Uri>[];
      await cubit.pay((uri) async => opened.add(uri));
      expect(opened, [Uri.parse(checkout)]);
      expect(cubit.state.paying, isTrue);
      expect(cubit.state.busy, isFalse);

      // PY-US1-S4: still confirmed on the first read back, paid on the next.
      var reads = 0;
      when(() => repository.getBooking(any(), any())).thenAnswer(
        (_) async => Ok(++reads == 1 ? exampleView('confirmed') : paid()),
      );
      await cubit.resumed();
      expect(cubit.state.view!.state, BookingState.paid);
      expect(cubit.state.paying, isFalse);
      expect(cubit.state.notPaidYet, isFalse);
    });

    test('PY-US2-S3 left the secure page: after a short wait it is still confirmed and Pay is offered again', () async {
      when(() => repository.getBooking(any(), any()))
          .thenAnswer((_) async => Ok(exampleView('confirmed')));
      when(() => repository.pay(any(), any()))
          .thenAnswer((_) async => const Ok(checkout));
      final cubit = make();
      await cubit.load();
      await cubit.pay((_) async {});
      await cubit.resumed();
      expect(cubit.state.view!.state, BookingState.confirmed);
      expect(cubit.state.paying, isFalse);
      expect(cubit.state.notPaidYet, isTrue);
      // 1 load + 1 resume read + 3 polls.
      verify(() => repository.getBooking(any(), any())).called(5);
    });

    test(
      'a refused or failed start shows its message and opens nothing',
      () async {
        when(() => repository.getBooking(any(), any()))
            .thenAnswer((_) async => Ok(exampleView('confirmed')));
        when(() => repository.pay(any(), any())).thenAnswer(
          (_) async => const Err(
            ServerFailure(statusCode: 503, code: 'payment.errors.unavailable'),
          ),
        );
        final cubit = make();
        await cubit.load();
        final opened = <Uri>[];
        await cubit.pay((uri) async => opened.add(uri));
        expect(opened, isEmpty);
        expect(cubit.state.paying, isFalse);
        expect(cubit.state.commandFailure, isA<ServerFailure>());
      },
    );
  });
}
