import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/features/content/domain/entities/guides.dart';
import 'package:shoot_mobile/features/content/domain/entities/path_status.dart';

import '../../../../helpers/content_fixtures.dart';
import '../../../../helpers/content_harness.dart';

Article _article({
  bool inRequestedLanguage = true,
  List<ArticleSummary>? related,
  RichTextDocument? body,
}) {
  final base = exampleArticle();
  return Article(
    summary: ArticleSummary(
      slug: base.summary.slug,
      title: base.summary.title,
      summary: base.summary.summary,
      cover: base.summary.cover,
      publishedAt: base.summary.publishedAt,
      readingMinutes: base.summary.readingMinutes,
      categories: base.summary.categories,
      author: base.summary.author,
      inRequestedLanguage: inRequestedLanguage,
    ),
    body: body ?? base.body,
    related: related ?? base.related,
  );
}

void main() {
  late ContentHarness h;

  setUp(() => h = ContentHarness());

  group('MG-US2-S4 an article', () {
    testWidgets(
      'MG-US2-S4 shows topic, title, byline, lead, text, the call to brief and two more guides',
      (tester) async {
        h.stubGuide(
          'brief-a-wedding-photographer',
          _article(
            related: [
              summaryOf('r1', title: 'Related one', topic: 'Booking'),
              summaryOf('r2', title: 'Related two', topic: 'Booking'),
              summaryOf('r3', title: 'Related three', topic: 'Booking'),
            ],
          ),
        );
        await pumpContent(
          tester,
          h,
          location: '/guides/brief-a-wedding-photographer',
        );
        await tester.pumpAndSettle();
        expect(find.text('WEDDINGS'), findsOneWidget);
        expect(
          find.text('How to brief a wedding photographer'),
          findsOneWidget,
        );
        expect(find.textContaining('By Sara Khan'), findsOneWidget);
        expect(find.textContaining('4 min read'), findsWidgets);
        expect(
          find.text(
            'What to say before the day, so nothing that matters is missed.',
          ),
          findsOneWidget,
        );
        expect(find.text('Start with the day'), findsOneWidget);
        expect(find.text('Ready to brief?'), findsOneWidget);
        await tester.scrollUntilVisible(find.text('MORE GUIDES'), 300);
        expect(find.text('MORE GUIDES'), findsOneWidget);
        expect(find.text('Related one'), findsOneWidget);
        expect(find.text('Related two'), findsOneWidget);
        expect(find.text('Related three'), findsNothing);
      },
    );

    testWidgets(
      'MG-US2-S4 the cover carries its description for screen readers',
      (tester) async {
        final handle = tester.ensureSemantics();
        h.stubGuide('brief-a-wedding-photographer', _article());
        await pumpContent(
          tester,
          h,
          location: '/guides/brief-a-wedding-photographer',
        );
        await tester.pump(const Duration(milliseconds: 100));
        expect(
          find.bySemanticsLabel('A couple on a terrace at sunset'),
          findsOneWidget,
        );
        handle.dispose();
      },
    );

    testWidgets('MG-US2-S4 the back button returns to the guides', (
      tester,
    ) async {
      h.stubGuide('brief-a-wedding-photographer', _article());
      h.stubGuides(guideListOf([summaryOf('a', title: 'Listed')]));
      final router = await pumpContent(
        tester,
        h,
        location: '/guides/brief-a-wedding-photographer',
      );
      await tester.pumpAndSettle();
      await tester.tap(find.bySemanticsLabel('Back to the guides'));
      await tester.pumpAndSettle();
      expect(locationOf(router), '/guides');
    });
  });

  group('MG-US2-S5 links in the text', () {
    testWidgets('MG-US2-S5 a link to a path the app has opens that screen', (
      tester,
    ) async {
      h.stubGuide(
        'a',
        _article(
          body: const RichTextDocument([
            ParagraphBlock([
              LinkInline(
                href: '/guides/other',
                children: [TextInline('Another guide')],
              ),
            ]),
          ]),
        ),
      );
      h.stubGuide('other', _article());
      final router = await pumpContent(tester, h, location: '/guides/a');
      await tester.pumpAndSettle();
      final link = find.text('Another guide', findRichText: true);
      await tester.ensureVisible(link);
      // The text widget spans the column; the link is at its start.
      await tester.tapAt(tester.getTopLeft(link) + const Offset(10, 10));
      await tester.pumpAndSettle();
      expect(locationOf(router), '/guides/other');
    });

    testWidgets('MG-US2-S5 a link elsewhere opens outside the app', (
      tester,
    ) async {
      h.stubGuide(
        'a',
        _article(
          body: const RichTextDocument([
            ParagraphBlock([
              LinkInline(
                href: 'https://other.example/x',
                children: [TextInline('Elsewhere')],
              ),
            ]),
          ]),
        ),
      );
      final router = await pumpContent(tester, h, location: '/guides/a');
      await tester.pumpAndSettle();
      final link = find.text('Elsewhere', findRichText: true);
      await tester.ensureVisible(link);
      // The text widget spans the column; the link is at its start.
      await tester.tapAt(tester.getTopLeft(link) + const Offset(10, 10));
      await tester.pumpAndSettle();
      expect(h.opener.opened.single.toString(), 'https://other.example/x');
      expect(locationOf(router), '/guides/a');
    });
  });

  group('MG-US2-S6 an article with no Arabic text', () {
    testWidgets(
      'MG-US2-S6 shows the English text, left to right, with the notice',
      (tester) async {
        h.stubGuide(
          'brief-a-wedding-photographer',
          _article(inRequestedLanguage: false),
        );
        await pumpContent(
          tester,
          h,
          location: '/guides/brief-a-wedding-photographer',
          locale: const Locale('ar'),
        );
        await tester.pumpAndSettle();
        expect(find.text('هذا النص متوفر بالإنجليزية فقط.'), findsOneWidget);
        final title = find.text('How to brief a wedding photographer');
        expect(Directionality.of(tester.element(title)), TextDirection.ltr);
      },
    );

    testWidgets('MG-US2-S6 an article in the app\'s language has no notice', (
      tester,
    ) async {
      h.stubGuide('brief-a-wedding-photographer', _article());
      await pumpContent(
        tester,
        h,
        location: '/guides/brief-a-wedding-photographer',
        locale: const Locale('ar'),
      );
      await tester.pumpAndSettle();
      expect(find.text('هذا النص متوفر بالإنجليزية فقط.'), findsNothing);
    });
  });

  group('MG-US2-S3 an article that is not live', () {
    testWidgets('MG-US2-S3 a scheduled or unknown link shows not found', (
      tester,
    ) async {
      h.stubMissingGuide('later', PathStatus.notFound);
      await pumpContent(tester, h, location: '/guides/later');
      await tester.pumpAndSettle();
      expect(find.text("That page isn't here"), findsOneWidget);
      expect(find.text('This page has been removed'), findsNothing);
    });

    testWidgets('MG-US4-S1 a deleted article shows the removed notice', (
      tester,
    ) async {
      h.stubMissingGuide('gone', PathStatus.removed);
      await pumpContent(tester, h, location: '/guides/gone');
      await tester.pumpAndSettle();
      expect(find.text('This page has been removed'), findsOneWidget);
    });
  });
}
