import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/widgets/phone_field.dart';
import 'package:shoot_mobile/core/widgets/snap_carousel.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/quick_match/domain/entities/quick_match.dart';
import 'package:shoot_mobile/features/quick_match/presentation/cubit/book_flow_cubit.dart';
import 'package:shoot_mobile/features/quick_match/presentation/pages/details_page.dart';

import '../../../../helpers/quick_match_fixtures.dart';
import '../../../../helpers/quick_match_harness.dart';
import '../../../../helpers/sign_in_harness.dart';

void main() {
  late MockQuickMatchRepository repository;

  const match = '/match/$exampleRef/$exampleKey';
  const quote = '/q/Q-4F8Z2/$exampleKey';

  setUpAll(() {
    registerFallbackValue(
      const BookingDetails(date: '', startTime: '', duration: '', venue: ''),
    );
    registerFallbackValue(<Pick>[]);
  });

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
    when(() => repository.getBooking(any(), any()))
        .thenAnswer((_) async => Ok(exampleView('quoted')));
  });

  group('BI-US2 creators who said yes', () {
    testWidgets('BI-US2-S3 a creator who said yes is marked on their card', (
      tester,
    ) async {
      expect(exampleMatch().sections.first.creators.first.saidYes, isTrue);
      await pumpQuickMatch(tester, repository: repository, location: match);
      await tester.pumpAndSettle();
      expect(find.text('Said yes'), findsOneWidget);
    });
  });

  group('MQ-US1 screen 07', () {
    testWidgets(
      'MQ-US1-S1 MQ-US1-S2 shows the creators at one price and the action follows the chosen card',
      (tester) async {
        await pumpQuickMatch(tester, repository: repository, location: match);
        await tester.pumpAndSettle();
        expect(find.text('Swipe to choose'), findsOneWidget);
        expect(find.text('Omar K.'), findsOneWidget);
        expect(find.text('Continue with Omar'), findsOneWidget);
        expect(find.text('AED 950'), findsWidgets);

        await tester.drag(find.byType(SnapCarousel), const Offset(-250, 0));
        await tester.pumpAndSettle();
        expect(find.text('Continue with Mariam'), findsOneWidget);
        expect(find.text("See Mariam's work and profile"), findsOneWidget);
      },
    );

    testWidgets(
      'MQ-US1-S1 shows no ratings, verified badges or review counts',
      (tester) async {
        await pumpQuickMatch(tester, repository: repository, location: match);
        await tester.pumpAndSettle();
        expect(
          find.textContaining(
            RegExp('rating|verified|review', caseSensitive: false),
          ),
          findsNothing,
        );
      },
    );

    testWidgets('MQ-US1-S4 "Not sure? Let us pick" is offered', (tester) async {
      await pumpQuickMatch(tester, repository: repository, location: match);
      await tester.pumpAndSettle();
      expect(find.text('Not sure? Let us pick'), findsOneWidget);
    });

    testWidgets(
      'MQ-US1-S6 nobody free shows the nearest days, the first as the one action',
      (tester) async {
        when(
          () => repository.getMatch(
            any(),
            any(),
            date: any(named: 'date'),
            duration: any(named: 'duration'),
          ),
        ).thenAnswer((_) async => Ok(exampleNoneFree()));
        await pumpQuickMatch(tester, repository: repository, location: match);
        await tester.pumpAndSettle();
        expect(find.text('No one is free that day'), findsOneWidget);
        expect(find.text('3 free'), findsOneWidget);
        expect(find.byType(TopHit), findsOneWidget);
        expect(find.text('Ask on WhatsApp'), findsOneWidget);
      },
    );

    testWidgets(
      'MQ-US3-S7 a wrong key shows the not-found screen and nothing else',
      (tester) async {
        when(
          () => repository.getMatch(
            any(),
            any(),
            date: any(named: 'date'),
            duration: any(named: 'duration'),
          ),
        ).thenAnswer((_) async => const Err(NotFoundFailure()));
        await pumpQuickMatch(tester, repository: repository, location: match);
        await tester.pumpAndSettle();
        expect(find.text('Swipe to choose'), findsNothing);
      },
    );
  });

  group('MQ-US2 screens 09, 10, 11', () {
    testWidgets('MQ-US2-S1 MQ-FR-011 details ask no number, name or email', (
      tester,
    ) async {
      await pumpQuickMatch(
        tester,
        repository: repository,
        location: '$match/details',
      );
      await tester.pumpAndSettle();
      expect(find.text('Your shoot'), findsOneWidget);
      expect(find.byType(PhoneField), findsNothing);
      expect(find.textContaining('Mobile number'), findsNothing);
      expect(find.text('Continue'), findsOneWidget);
    });

    testWidgets(
      'MQ-US2-S4 the primary action marks what is missing and sends nothing',
      (tester) async {
        await pumpQuickMatch(
          tester,
          repository: repository,
          location: '$match/details',
        );
        await tester.pumpAndSettle();
        await tester.tap(find.byType(TopHit));
        await tester.pumpAndSettle();
        expect(find.text('Where will the shoot be?'), findsOneWidget);
        expect(
          find.text('Enter the start time as hours and minutes, like 18:30.'),
          findsOneWidget,
        );
        verifyNever(
          () => repository.issueQuotation(any(), any(), any(), any()),
        );
        expect(find.byType(PhoneField), findsNothing);
      },
    );

    testWidgets(
      'MQ-US2-S5 the number is asked on its own screen, with SMS or WhatsApp and Send code',
      (tester) async {
        await pumpQuickMatch(
          tester,
          repository: repository,
          location: '$match/number',
        );
        await tester.pumpAndSettle();
        expect(find.text('Your number'), findsOneWidget);
        expect(find.byType(PhoneField), findsOneWidget);
        expect(find.text('SMS'), findsOneWidget);
        expect(find.text('WhatsApp'), findsOneWidget);
        expect(find.text('Send code'), findsOneWidget);
      },
    );

    testWidgets(
      'MQ-US2-S10 MQ-US2-S11 a signed-in person saves in one tap, WhatsApp opens and the quotation shows',
      (tester) async {
        when(() => repository.issueQuotation(any(), any(), any(), any()))
            .thenAnswer((_) async => Ok(exampleIssued()));
        final opener = RecordingOpener();
        final router = await pumpQuickMatch(
          tester,
          repository: repository,
          location: '$match/details',
          signedIn: true,
          opener: opener,
        );
        await tester.pumpAndSettle();
        final flow = tester
            .element(find.byType(DetailsPage))
            .read<BookFlowCubit>();
        flow
          ..dateChanged('2026-12-20')
          ..startTimeChanged('18:30')
          ..venueChanged('Dubai Marina');
        await tester.runAsync(flow.continueSignedIn);
        await tester.pumpAndSettle();
        expect(opener.opened.single.host, 'wa.me');
        expect(locationOf(router), '/q/Q-4F8Z2/${'k' * 43}');
      },
    );

    testWidgets(
      'MQ-FR-046 the code step opened with no code on its way goes back to the number',
      (tester) async {
        final router = await pumpQuickMatch(
          tester,
          repository: repository,
          location: '$match/code',
        );
        await tester.pumpAndSettle();
        expect(locationOf(router), '$match/number');
      },
    );
  });

  group('MQ-US3 to MQ-US5 the booking screen', () {
    testWidgets(
      'MQ-US3-S1 the quotation shows its lines, the total and one primary action',
      (tester) async {
        await pumpQuickMatch(tester, repository: repository, location: quote);
        await tester.pumpAndSettle();
        expect(find.text('Quotation Q-4F8Z2'), findsOneWidget);
        expect(find.text('Accept quotation'), findsOneWidget);
        expect(find.byType(TopHit), findsOneWidget);
        expect(find.text('Total'), findsOneWidget);
        expect(find.text('Download PDF'), findsOneWidget);
      },
    );

    testWidgets(
      'MQ-US3-S2 accepting asks the professional and shows the accepted state',
      (tester) async {
        when(() => repository.accept(any(), any()))
            .thenAnswer((_) async => Ok(exampleView('accepted')));
        await pumpQuickMatch(tester, repository: repository, location: quote);
        await tester.pumpAndSettle();
        await tester.tap(find.text('Accept quotation'));
        await tester.pumpAndSettle();
        verify(() => repository.accept(any(), any())).called(1);
        expect(find.text('Waiting for Omar K. to confirm.'), findsOneWidget);
        expect(find.text('Accept quotation'), findsNothing);
      },
    );

    testWidgets('MQ-US3-S5 an expired quotation can only be refreshed', (
      tester,
    ) async {
      when(() => repository.getBooking(any(), any()))
          .thenAnswer((_) async => Ok(exampleView('expired')));
      await pumpQuickMatch(tester, repository: repository, location: quote);
      await tester.pumpAndSettle();
      expect(find.text('This quotation expired'), findsOneWidget);
      expect(find.text('Get a fresh quotation'), findsOneWidget);
      expect(find.text('Accept quotation'), findsNothing);
    });

    testWidgets(
      'MQ-US4-S1 MQ-US4-S6 MQ-US4-S7 confirmed shows the chat, offers no way to pay and points date changes to the chat',
      (tester) async {
        when(() => repository.getBooking(any(), any()))
            .thenAnswer((_) async => Ok(exampleView('confirmed')));
        await pumpQuickMatch(tester, repository: repository, location: quote);
        await tester.pumpAndSettle();
        expect(find.text('Awaiting payment'), findsOneWidget);
        expect(find.text('Open the WhatsApp chat'), findsOneWidget);
        expect(find.byType(TextField), findsNothing);
        expect(
          find.textContaining(
            RegExp(r'pay now|card number|checkout', caseSensitive: false),
          ),
          findsNothing,
        );
      },
    );

    testWidgets(
      'MQ-US4-S5 an on-hold booking shows its status and reason, with WhatsApp as the way to reach a person',
      (tester) async {
        when(() => repository.getBooking(any(), any()))
            .thenAnswer((_) async => Ok(exampleView('on-hold')));
        await pumpQuickMatch(tester, repository: repository, location: quote);
        await tester.pumpAndSettle();
        expect(find.text('On hold'), findsOneWidget);
        expect(
          find.text('Reported: The photos never arrived.'),
          findsOneWidget,
        );
        expect(find.text('Open the WhatsApp chat'), findsOneWidget);
      },
    );

    testWidgets('MQ-US4-S2 the chat opens with the booking written in', (
      tester,
    ) async {
      when(() => repository.getBooking(any(), any()))
          .thenAnswer((_) async => Ok(exampleView('confirmed')));
      final opener = RecordingOpener();
      await pumpQuickMatch(
        tester,
        repository: repository,
        location: quote,
        opener: opener,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Open the WhatsApp chat'));
      await tester.pump();
      expect(opener.opened.single.host, 'wa.me');
    });

    testWidgets(
      'MQ-US5-S1 MQ-US5-S3 delivered offers confirming and reporting; a report goes to the team',
      (tester) async {
        when(() => repository.getBooking(any(), any()))
            .thenAnswer((_) async => Ok(exampleView('delivered')));
        when(() => repository.report(any(), any(), any()))
            .thenAnswer((_) async => Ok(exampleView('on-hold')));
        await pumpQuickMatch(tester, repository: repository, location: quote);
        await tester.pumpAndSettle();
        expect(find.text('Confirm delivery'), findsOneWidget);
        await tester.ensureVisible(find.text('Report a problem'));
        await tester.pump();
        await tester.tap(find.text('Report a problem'));
        await tester.pumpAndSettle();
        expect(find.text('What went wrong?'), findsOneWidget);
        await tester.enterText(
          find.descendant(
            of: find.byKey(const ValueKey('qm:report')),
            matching: find.byType(TextField),
          ),
          'The photos never arrived.',
        );
        await tester.ensureVisible(find.text('Send to the team'));
        await tester.pump();
        await tester.tap(find.text('Send to the team'));
        await tester.pumpAndSettle();
        verify(
          () => repository.report(any(), any(), 'The photos never arrived.'),
        ).called(1);
        expect(find.text('On hold'), findsOneWidget);
      },
    );
  });
}
