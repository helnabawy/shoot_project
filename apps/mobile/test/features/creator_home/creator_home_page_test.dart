import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/creator_home/data/models/creator_home_model.dart';
import 'package:shoot_mobile/features/creator_home/domain/entities/creator_home.dart';
import 'package:shoot_mobile/features/creator_home/domain/repositories/creator_home_repository.dart';
import 'package:shoot_mobile/features/creator_home/presentation/cubit/creator_home_cubit.dart';
import 'package:shoot_mobile/features/creator_home/presentation/pages/creator_home_page.dart';

import '../../helpers/api_examples.dart';
import '../../helpers/pump_app.dart';

class _Repository extends Mock implements CreatorHomeRepository {}

CreatorHome example(String name) =>
    CreatorHomeModel.fromJson(loadExample(name)).toEntity();

void main() {
  final now = DateTime.utc(2026, 11, 17, 10);

  void phone(WidgetTester tester) {
    tester.view.physicalSize = const Size(360, 2800);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
  }

  Future<List<String>> show(
    WidgetTester tester,
    CreatorHome home, {
    Locale locale = const Locale('en'),
    HomeNotice? notice,
    String? answering,
  }) async {
    phone(tester);
    final opened = <String>[];
    await tester.pumpApp(
      CreatorHomeView(
        state: CreatorHomeLoaded(home, notice: notice, answering: answering),
        now: now,
        onRetry: () {},
        onRefresh: () async {},
        onAccept: (_) {},
        onDecline: (_) {},
        onOpen: opened.add,
      ),
      locale: locale,
    );
    await tester.pump(const Duration(seconds: 2));
    return opened;
  }

  group('CH-US1-S1 the request card', () {
    testWidgets(
      'shows the booking request first with its lines, deadline and position',
      (tester) async {
        await show(tester, example('creator-home'));
        expect(find.text('Booking request'), findsOneWidget);
        expect(find.text('Wedding in Dubai'), findsOneWidget);
        expect(find.text('Answer by Wed 18 Nov, 18:00'), findsOneWidget);
        for (final text in [
          'Date',
          'Sat 28 Nov, 16:00',
          'Length',
          '4 hours',
          'Client',
          'Sara M.',
          'Reference',
          'Q-2026-0142',
        ]) {
          expect(find.text(text), findsOneWidget, reason: text);
        }
        expect(find.text('1 of 3'), findsOneWidget);
      },
    );

    testWidgets('has exactly two actions and Accept is the one red action', (
      tester,
    ) async {
      await show(tester, example('creator-home'));
      expect(find.byType(TopHit), findsOneWidget);
      expect(find.text('Accept'), findsOneWidget);
      expect(find.text('Decline'), findsOneWidget);
    });

    testWidgets('lists the following requests as plain rows marked Next', (
      tester,
    ) async {
      await show(tester, example('creator-home'));
      expect(find.text('Next'), findsNWidgets(2));
      expect(find.text('Birthday party in Dubai'), findsOneWidget);
      expect(find.text('Product launch in Abu Dhabi'), findsOneWidget);
    });

    testWidgets(
      'a brief shows what is needed and when it was sent, never a client',
      (tester) async {
        final home = example('creator-home');
        await show(
          tester,
          CreatorHome(
            name: home.name,
            code: home.code,
            professions: home.professions,
            photo: null,
            mode: home.mode,
            needs: home.needs,
            counts: home.counts,
            queue: home.queue.skip(1).toList(),
            next: home.next,
            today: home.today,
            reasons: home.reasons,
          ),
        );
        expect(find.text('New brief'), findsOneWidget);
        expect(find.text('Needs'), findsOneWidget);
        expect(find.text('Sent'), findsOneWidget);
        expect(find.text('Client'), findsNothing);
        expect(find.text('Client\'s price'), findsOneWidget);
        expect(find.text('AED 900'), findsOneWidget);
      },
    );

    testWidgets('CH-US1-S5 the note says what Accept does for each kind', (
      tester,
    ) async {
      await show(tester, example('creator-home'));
      expect(
        find.text('Accepting adds the date to your calendar.'),
        findsOneWidget,
      );
    });

    testWidgets(
      'a brief with the client\'s price names it and points to the inbox',
      (tester) async {
        final home = example('creator-home');
        final opened = await show(
          tester,
          CreatorHome(
            name: home.name,
            code: home.code,
            professions: home.professions,
            photo: null,
            mode: home.mode,
            needs: home.needs,
            counts: home.counts,
            queue: home.queue.skip(1).toList(),
            next: home.next,
            today: home.today,
            reasons: home.reasons,
          ),
        );
        expect(
          find.textContaining('offers the client\'s price'),
          findsOneWidget,
        );
        await tester.tap(find.text('Offer another price in your inbox'));
        expect(opened, ['/account/inbox']);
      },
    );

    testWidgets(
      'CH-US1-S7 nothing waiting says "You are up to date" with no Accept or Decline',
      (tester) async {
        await show(tester, example('creator-home-clear'));
        expect(find.text('You are up to date'), findsOneWidget);
        expect(
          find.text('New requests show here as they arrive.'),
          findsOneWidget,
        );
        expect(find.text('Accept'), findsNothing);
        expect(find.text('Decline'), findsNothing);
        expect(find.byType(TopHit), findsNothing);
      },
    );

    testWidgets('CH-US1-S8 a message after an answer that did not go through', (
      tester,
    ) async {
      await show(tester, example('creator-home'), notice: HomeNotice.closed);
      expect(find.text('That request is no longer open.'), findsOneWidget);
      await show(tester, example('creator-home'), notice: HomeNotice.notSent);
      expect(find.text('Your answer was not sent. Try again.'), findsOneWidget);
    });

    testWidgets('CH-US1-S2 the buttons wait while an answer is being sent', (
      tester,
    ) async {
      await show(tester, example('creator-home'), answering: 'Q-2026-0142');
      final accept = tester.widget<TopHit>(find.byType(TopHit));
      expect(accept.loading, isTrue);
    });
  });

  group('CH-US3 who and where', () {
    testWidgets(
      'CH-US3-S1 shows the name, professions, code, Live and the three counts',
      (tester) async {
        await show(tester, example('creator-home'));
        expect(find.text('Omar K.'), findsOneWidget);
        expect(find.text('Photographer · SH-0087'), findsOneWidget);
        expect(find.text('Live'), findsOneWidget);
        for (final text in [
          'To answer',
          'Coming up',
          'Completed',
          '3',
          '1',
          '4',
        ]) {
          expect(find.text(text), findsOneWidget, reason: text);
        }
      },
    );

    testWidgets('CH-US3-S2 each count opens the place it lists', (
      tester,
    ) async {
      final opened = await show(tester, example('creator-home'));
      await tester.tap(find.text('Coming up'));
      await tester.tap(find.text('Completed'));
      expect(opened, ['/account/bookings', '/account/bookings']);
    });

    testWidgets(
      'CH-US3-S3 shows the nearest booking as one row that opens it, with its payment state',
      (tester) async {
        final opened = await show(tester, example('creator-home'));
        expect(find.text('NEXT SHOOT'), findsOneWidget);
        expect(find.text('Product shoot in Sharjah'), findsOneWidget);
        expect(find.text('Thu 19 Nov, 10:00 · 2 hours'), findsOneWidget);
        expect(find.text('Paid'), findsOneWidget);
        await tester.tap(find.text('Product shoot in Sharjah'));
        expect(opened, ['/account/bookings/Q-2026-0131']);
      },
    );

    testWidgets(
      'CH-US3-S4 leaves the section out when there is no upcoming booking',
      (tester) async {
        final home = example('creator-home-clear');
        expect(home.next, isNotNull);
        await show(
          tester,
          CreatorHome(
            name: home.name,
            code: home.code,
            professions: home.professions,
            photo: null,
            mode: home.mode,
            needs: home.needs,
            counts: home.counts,
            queue: home.queue,
            next: null,
            today: home.today,
            reasons: home.reasons,
          ),
        );
        expect(find.text('NEXT SHOOT'), findsNothing);
      },
    );

    testWidgets(
      'CH-US3-S5 lists Bookings, Availability with today and My profile',
      (tester) async {
        final opened = await show(tester, example('creator-home'));
        expect(find.text('MANAGE'), findsOneWidget);
        expect(find.text('Bookings'), findsOneWidget);
        expect(find.text('Free today'), findsOneWidget);
        await tester.tap(find.text('My profile'));
        await tester.tap(find.text('Availability'));
        expect(opened, ['/account/profile', '/account/availability']);
      },
    );

    testWidgets(
      'CH-US3-S6 a creator with nothing sees zeros and invents nothing',
      (tester) async {
        final home = example('creator-home-clear');
        await show(
          tester,
          CreatorHome(
            name: home.name,
            code: home.code,
            professions: home.professions,
            photo: null,
            mode: home.mode,
            needs: home.needs,
            counts: const HomeCounts(toAnswer: 0, comingUp: 0, completed: 0),
            queue: const [],
            next: null,
            today: TodayState.blocked,
            reasons: home.reasons,
          ),
        );
        expect(find.text('0'), findsNWidgets(3));
        expect(find.text('Busy today'), findsOneWidget);
      },
    );
  });

  group('CH-US4 a creator who is not live', () {
    testWidgets(
      'CH-US4-S1 an incomplete profile: the status, the missing steps and "Finish my profile"',
      (tester) async {
        final opened = await show(tester, example('creator-home-not-live'));
        expect(find.text('Not live yet'), findsOneWidget);
        expect(find.text('Clients can\'t find you yet'), findsOneWidget);
        expect(find.text('Work samples'), findsOneWidget);
        expect(find.text('Missing'), findsNWidgets(2));
        expect(find.text('5 of 7 steps done'), findsOneWidget);
        await tester.tap(find.text('Finish my profile'));
        expect(opened, ['/account/profile']);
      },
    );

    testWidgets(
      'CH-US4-S3 shows no counts, queue or answers, and no Bookings row',
      (tester) async {
        await show(tester, example('creator-home-not-live'));
        expect(find.text('To answer'), findsNothing);
        expect(find.text('Accept'), findsNothing);
        expect(find.text('Bookings'), findsNothing);
        expect(find.text('Availability'), findsOneWidget);
      },
    );

    testWidgets('CH-US4-S2 in review: the message and no primary action', (
      tester,
    ) async {
      final home = example('creator-home-not-live');
      await show(
        tester,
        CreatorHome(
          name: home.name,
          code: home.code,
          professions: home.professions,
          photo: null,
          mode: HomeMode.review,
          needs: const [],
          counts: null,
          queue: const [],
          next: null,
          today: TodayState.free,
          reasons: const [],
        ),
      );
      expect(find.text('In review'), findsOneWidget);
      expect(find.text('Our team is reviewing your profile'), findsOneWidget);
      expect(find.byType(TopHit), findsNothing);
    });

    testWidgets(
      'CH-US4-S5 hidden: the message and a link to the profile, no primary action',
      (tester) async {
        final home = example('creator-home-not-live');
        final opened = await show(
          tester,
          CreatorHome(
            name: home.name,
            code: home.code,
            professions: home.professions,
            photo: null,
            mode: HomeMode.paused,
            needs: const [],
            counts: null,
            queue: const [],
            next: null,
            today: TodayState.free,
            reasons: const [],
          ),
        );
        expect(find.text('Hidden'), findsOneWidget);
        expect(find.text('Your profile is hidden'), findsOneWidget);
        expect(find.byType(TopHit), findsNothing);
        await tester.tap(find.text('Open my profile'));
        expect(opened, ['/account/profile']);
      },
    );
  });

  group('CH-US1-S1 in Arabic', () {
    testWidgets('reads right to left with Arabic labels and Western digits', (
      tester,
    ) async {
      await show(tester, example('creator-home'), locale: const Locale('ar'));
      expect(find.text('قبول'), findsOneWidget);
      expect(find.text('اعتذار'), findsOneWidget);
      expect(find.text('منشور'), findsOneWidget);
      expect(find.text('بانتظار ردّك'), findsWidgets);
      expect(find.text('1 من 3'), findsOneWidget);
      expect(find.textContaining('28'), findsWidgets);
      expect(find.textContaining('٢'), findsNothing);
      final direction = Directionality.of(tester.element(find.text('قبول')));
      expect(direction, TextDirection.rtl);
    });
  });

  group('CH-US1-S4 the Decline step through the page', () {
    late _Repository repository;
    late CreatorHome live;

    setUp(() {
      repository = _Repository();
      live = example('creator-home');
      when(() => repository.home()).thenAnswer((_) async => Ok(live));
      when(
        () => repository.answerBooking(
          any(),
          confirm: any(named: 'confirm'),
          reason: any(named: 'reason'),
        ),
      ).thenAnswer((_) async => const Ok(null));
      when(
        () => repository.answerBrief(
          any(),
          persona: any(named: 'persona'),
          accept: any(named: 'accept'),
          reason: any(named: 'reason'),
          note: any(named: 'note'),
        ),
      ).thenAnswer((_) async => const Ok(null));
    });

    Future<void> open(WidgetTester tester) async {
      phone(tester);
      await tester.pumpApp(
        CreatorHomePage(
          create: () => CreatorHomeCubit(repository),
          clock: FixedClock(now),
        ),
      );
      await tester.pump(const Duration(seconds: 2));
    }

    testWidgets('a booking: opens one optional reason, and Decline sends it', (
      tester,
    ) async {
      await open(tester);
      await tester.tap(find.text('Decline'));
      await tester.pumpAndSettle();
      expect(find.text('Decline this request'), findsOneWidget);
      expect(find.text('Reason (optional)'), findsOneWidget);
      await tester.enterText(find.byType(TextField), 'Booked elsewhere');
      await tester.tap(find.text('Decline').last);
      await tester.pumpAndSettle();
      verify(
        () => repository.answerBooking(
          'Q-2026-0142',
          confirm: false,
          reason: 'Booked elsewhere',
        ),
      ).called(1);
    });

    testWidgets('backing out records nothing', (tester) async {
      await open(tester);
      await tester.tap(find.text('Decline'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Back'));
      await tester.pumpAndSettle();
      expect(find.text('Decline this request'), findsNothing);
      verifyNever(
        () => repository.answerBooking(
          any(),
          confirm: any(named: 'confirm'),
          reason: any(named: 'reason'),
        ),
      );
    });

    testWidgets('a brief: lists the content reasons and an optional note', (
      tester,
    ) async {
      live = CreatorHome(
        name: live.name,
        code: live.code,
        professions: live.professions,
        photo: null,
        mode: live.mode,
        needs: live.needs,
        counts: live.counts,
        queue: live.queue.skip(1).toList(),
        next: live.next,
        today: live.today,
        reasons: live.reasons,
      );
      await open(tester);
      await tester.tap(find.text('Decline'));
      await tester.pumpAndSettle();
      expect(find.text('Too far'), findsOneWidget);
      expect(find.text('Not my kind of work'), findsOneWidget);
      await tester.tap(find.text('Too far'));
      await tester.enterText(find.byType(TextField), 'Too far for me');
      await tester.tap(find.text('Decline').last);
      await tester.pumpAndSettle();
      verify(
        () => repository.answerBrief(
          'B-7K2QX',
          persona: '1',
          accept: false,
          reason: 'too-far',
          note: 'Too far for me',
        ),
      ).called(1);
    });

    testWidgets('Accept answers the card at once', (tester) async {
      await open(tester);
      await tester.tap(find.text('Accept'));
      await tester.pump(const Duration(seconds: 1));
      verify(() => repository.answerBooking('Q-2026-0142', confirm: true))
          .called(1);
    });
  });
}
