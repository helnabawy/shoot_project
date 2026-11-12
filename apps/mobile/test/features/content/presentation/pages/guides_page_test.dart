import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/content/domain/entities/guides.dart';

import '../../../../helpers/content_fixtures.dart';
import '../../../../helpers/content_harness.dart';

GuideList _list({int page = 1, int pageCount = 3, GuideCategory? category}) =>
    guideListOf(
      [
        summaryOf(
          'brief',
          title: 'How to brief a wedding photographer',
          topic: 'Briefing',
        ),
        summaryOf(
          'quote',
          title: 'What your quotation includes',
          topic: 'Booking',
          minutes: 3,
        ),
        summaryOf(
          'prep',
          title: 'What to prepare the day before a shoot',
          topic: 'Preparing',
          minutes: 5,
        ),
      ],
      page: page,
      pageCount: pageCount,
      categories: const [
        GuideCategory(
          slug: 'briefing',
          name: 'Briefing',
          description: null,
          count: 2,
        ),
        GuideCategory(
          slug: 'booking',
          name: 'Booking',
          description: null,
          count: 1,
        ),
        GuideCategory(
          slug: 'empty',
          name: 'Empty topic',
          description: null,
          count: 0,
        ),
      ],
      category: category,
    );

void main() {
  late ContentHarness h;

  setUp(() => h = ContentHarness());

  group('MG-US2-S1 the guides list', () {
    testWidgets(
      'MG-US2-S1 shows the line, rows with topic, title, author and reading time',
      (tester) async {
        h.stubGuides(_list());
        await pumpContent(tester, h, location: '/guides');
        await tester.pumpAndSettle();
        expect(find.text('Guides'), findsOneWidget);
        expect(
          find.text(
            'Plain answers for briefing, booking and preparing a shoot.',
          ),
          findsOneWidget,
        );
        expect(
          find.text('How to brief a wedding photographer'),
          findsOneWidget,
        );
        expect(find.text('By Shoot team · 4 min read'), findsNWidgets(1));
        expect(find.text('By Shoot team · 3 min read'), findsOneWidget);
        // Newest first is the server's order; the screen keeps it.
        final titles = [
          'How to brief',
          'What your quotation',
          'What to prepare',
        ];
        final ys = [
          for (final t in titles) tester.getTopLeft(find.textContaining(t)).dy,
        ];
        expect(ys, [...ys]..sort());
      },
    );

    testWidgets(
      'MG-US2-S1 pages: Previous muted, Page 1 of 3, Next goes to ?page=2',
      (tester) async {
        h.stubGuides(_list());
        final router = await pumpContent(tester, h, location: '/guides');
        await tester.pumpAndSettle();
        expect(find.text('Page 1 of 3'), findsOneWidget);
        expect(find.text('Previous'), findsOneWidget);
        await tester.tap(find.text('Previous'));
        await tester.pumpAndSettle();
        expect(locationOf(router), '/guides');
        await tester.ensureVisible(find.text('Next'));
        await tester.tap(find.text('Next'));
        await tester.pumpAndSettle();
        expect(locationOf(router), '/guides?page=2');
        verify(
          () => h.repository.getGuides(page: 2, category: null, author: null),
        ).called(1);
      },
    );

    testWidgets('MG-US2-S1 one page of guides has no paging row', (
      tester,
    ) async {
      h.stubGuides(_list(pageCount: 1));
      await pumpContent(tester, h, location: '/guides');
      await tester.pumpAndSettle();
      expect(find.text('Next'), findsNothing);
      expect(find.textContaining('Page 1 of'), findsNothing);
    });
  });

  group('MG-US2-S2 topics', () {
    testWidgets('MG-US2-S2 All plus topics with live guides only', (
      tester,
    ) async {
      h.stubGuides(_list());
      await pumpContent(tester, h, location: '/guides');
      await tester.pumpAndSettle();
      expect(find.text('All'), findsOneWidget);
      expect(find.text('Briefing'), findsWidgets);
      expect(find.text('Empty topic'), findsNothing);
    });

    testWidgets(
      'MG-US2-S2 a topic chip opens that topic and the paging restarts',
      (tester) async {
        h.stubGuides(_list());
        final router = await pumpContent(tester, h, location: '/guides?page=2');
        await tester.pumpAndSettle();
        await tester.tap(find.widgetWithText(GestureDetector, 'Booking').first);
        await tester.pumpAndSettle();
        expect(locationOf(router), '/guides/category/booking');
      },
    );

    testWidgets('MG-US2-S2 a narrowed list is titled with its topic', (
      tester,
    ) async {
      h.stubGuides(
        _list(
          pageCount: 1,
          category: const GuideCategory(
            slug: 'booking',
            name: 'Booking',
            description: 'Everything about booking.',
            count: 1,
          ),
        ),
      );
      await pumpContent(tester, h, location: '/guides/category/booking');
      await tester.pumpAndSettle();
      expect(find.text('Everything about booking.'), findsOneWidget);
      verify(
        () => h.repository.getGuides(
          page: null,
          category: 'booking',
          author: null,
        ),
      ).called(1);
    });

    testWidgets('MG-US2-S2 an author view is titled with the author', (
      tester,
    ) async {
      h.stubGuides(
        guideListOf(
          [summaryOf('a', title: 'One')],
          author: const GuideAuthor(
            slug: 'sara',
            name: 'Sara Khan',
            bio: null,
            photo: null,
          ),
        ),
      );
      await pumpContent(tester, h, location: '/guides/author/sara');
      await tester.pumpAndSettle();
      expect(find.text('Sara Khan'), findsOneWidget);
      verify(
        () =>
            h.repository.getGuides(page: null, category: null, author: 'sara'),
      ).called(1);
    });
  });

  group('MG-US2-S7 the feed', () {
    testWidgets('MG-US2-S7 opens the feed outside the app (English)', (
      tester,
    ) async {
      h.stubGuides(_list());
      await pumpContent(tester, h, location: '/guides');
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Follow the guides with RSS'));
      await tester.tap(find.text('Follow the guides with RSS'));
      expect(
        h.opener.opened.single.toString(),
        'https://shoot.example/guides/feed',
      );
    });

    testWidgets('MG-US2-S7 opens the Arabic feed in Arabic', (tester) async {
      h.stubGuides(_list());
      await pumpContent(
        tester,
        h,
        location: '/guides',
        locale: const Locale('ar'),
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('تابع الأدلة عبر RSS'));
      await tester.tap(find.text('تابع الأدلة عبر RSS'));
      expect(
        h.opener.opened.single.toString(),
        'https://shoot.example/ar/guides/feed',
      );
    });
  });

  group('MG-US2-S8 the call to brief', () {
    testWidgets(
      'MG-US2-S8 "Start a brief" opens the landing; WhatsApp opens WhatsApp',
      (tester) async {
        h.stubGuides(_list());
        final router = await pumpContent(tester, h, location: '/guides');
        await tester.pumpAndSettle();
        expect(find.byType(TopHit), findsOneWidget);
        await tester.ensureVisible(find.text('WhatsApp us'));
        await tester.tap(find.text('WhatsApp us'));
        expect(h.whatsappOpened, 1);
        await tester.ensureVisible(find.text('Start a brief'));
        await tester.tap(find.text('Start a brief'));
        await tester.pumpAndSettle();
        expect(locationOf(router), '/');
      },
    );
  });

  group('MG-US2-S1 states', () {
    testWidgets(
      'MG-US2-S1 a failed read shows the something-went-wrong screen and retries',
      (tester) async {
        var fail = true;
        when(
          () => h.repository.getGuides(
            page: any(named: 'page'),
            category: any(named: 'category'),
            author: any(named: 'author'),
          ),
        ).thenAnswer(
          (_) async =>
              fail ? const Err<GuideList>(NetworkFailure()) : Ok(_list()),
        );
        await pumpContent(tester, h, location: '/guides');
        await tester.pumpAndSettle();
        expect(find.text('Something went wrong'), findsOneWidget);
        fail = false;
        await tester.tap(find.text('Try again'));
        await tester.pumpAndSettle();
        expect(
          find.text('How to brief a wedding photographer'),
          findsOneWidget,
        );
      },
    );
  });
}
