import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/content/cta.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/content/domain/entities/path_status.dart';
import 'package:shoot_mobile/features/content/domain/page_layout.dart';

import '../../../../helpers/content_fixtures.dart';
import '../../../../helpers/content_harness.dart';

HowItWorksSection _steps({
  String? subheading = 'Three steps, one conversation.',
}) => HowItWorksSection(
  anchor: null,
  heading: 'How it works',
  subheading: subheading,
  steps: const [
    HowItWorksStep(
      title: 'Say it in one line',
      body: 'Tap the words to build your brief.',
      visual: StepVisual.brief,
    ),
    HowItWorksStep(
      title: 'See the price first',
      body: 'One fixed price.',
      visual: StepVisual.match,
    ),
    HowItWorksStep(
      title: 'Your number is your account',
      body: null,
      visual: StepVisual.work,
    ),
  ],
  cta: null,
);

FaqSection _faq() => FaqSection(
  anchor: null,
  heading: 'Questions',
  items: [
    FaqItem(
      question: 'Is it free?',
      answer: RichTextDocument([paragraph('Yes, briefing is free.')]),
    ),
    FaqItem(
      question: 'How fast?',
      answer: RichTextDocument([paragraph('Within the hour.')]),
    ),
  ],
);

const _logos = LogoCloudSection(anchor: null, heading: 'Trusted by', logos: []);

void main() {
  late ContentHarness h;

  setUp(() => h = ContentHarness());

  group('MG-US3-S1 a published page', () {
    testWidgets(
      'MG-US3-S1 title, introduction and sections in the editor\'s order',
      (tester) async {
        h.stubPage(
          'how-it-works',
          pageOf('How it works', [
            _steps(),
            _faq(),
            RichTextSection(
              anchor: null,
              content: RichTextDocument([paragraph('A closing paragraph.')]),
            ),
          ], path: '/how-it-works'),
        );
        await pumpContent(tester, h, location: '/how-it-works');
        await tester.pumpAndSettle();
        expect(find.text('How it works'), findsOneWidget);
        expect(find.text('Three steps, one conversation.'), findsOneWidget);
        final ys = [
          for (final text in [
            'Say it in one line',
            'Questions',
            'A closing paragraph.',
          ])
            tester.getTopLeft(find.text(text)).dy,
        ];
        expect(ys, [...ys]..sort());
      },
    );

    testWidgets('MG-US3-S1 in Arabic with the editor\'s Arabic text', (
      tester,
    ) async {
      h.stubPage(
        'how-it-works',
        pageOf('كيف يعمل', [
          _steps(subheading: 'ثلاث خطوات'),
        ], path: '/how-it-works'),
      );
      await pumpContent(
        tester,
        h,
        location: '/how-it-works',
        locale: const Locale('ar'),
      );
      await tester.pumpAndSettle();
      expect(find.text('كيف يعمل'), findsOneWidget);
    });
  });

  group('MG-US3-S2 steps', () {
    testWidgets(
      'MG-US3-S2 each step shows its number, title and text from the CMS',
      (tester) async {
        h.stubPage(
          'how-it-works',
          pageOf('How it works', [_steps()], path: '/how-it-works'),
        );
        await pumpContent(tester, h, location: '/how-it-works');
        await tester.pumpAndSettle();
        for (final n in ['1', '2', '3']) {
          expect(find.text(n), findsOneWidget);
        }
        expect(find.text('Say it in one line'), findsOneWidget);
        expect(find.text('Tap the words to build your brief.'), findsOneWidget);
        expect(find.text('Your number is your account'), findsOneWidget);
      },
    );
  });

  group('MG-US3-S3 questions', () {
    testWidgets(
      'MG-US3-S3 a tap opens the answer below and announces expanded',
      (tester) async {
        final handle = tester.ensureSemantics();
        h.stubPage(
          'how-it-works',
          pageOf('How it works', [_faq()], path: '/how-it-works'),
        );
        await pumpContent(tester, h, location: '/how-it-works');
        await tester.pumpAndSettle();
        // The first answer starts open, as on the board; the second is closed.
        expect(find.text('Yes, briefing is free.'), findsOneWidget);
        expect(find.text('Within the hour.'), findsNothing);
        expect(
          tester.getSemantics(find.text('How fast?')),
          matchesSemantics(
            label: 'How fast?',
            isButton: true,
            hasTapAction: true,
            hasExpandedState: true,
            isExpanded: false,
            textDirection: TextDirection.ltr,
          ),
        );
        await tester.tap(find.text('How fast?'));
        await tester.pumpAndSettle();
        expect(find.text('Within the hour.'), findsOneWidget);
        await tester.tap(find.text('How fast?'));
        await tester.pumpAndSettle();
        expect(find.text('Within the hour.'), findsNothing);
        handle.dispose();
      },
    );
  });

  group('MG-US3-S4 sections the app does not draw', () {
    testWidgets('MG-US3-S4 are skipped, the rest still shows', (tester) async {
      h.stubPage(
        'studios',
        pageOf('Studios', [_logos, _faq()], path: '/studios'),
      );
      await pumpContent(tester, h, location: '/studios');
      await tester.pumpAndSettle();
      expect(find.text('Trusted by'), findsNothing);
      expect(find.text('Is it free?'), findsOneWidget);
      expect(find.text('Open this page on the website'), findsNothing);
    });

    testWidgets(
      'MG-US3-S4 a page with nothing the app draws opens on the website',
      (tester) async {
        h.stubPage('studios', pageOf('Studios', [_logos], path: '/studios'));
        await pumpContent(tester, h, location: '/studios');
        await tester.pumpAndSettle();
        await tester.tap(find.text('Open this page on the website'));
        expect(
          h.opener.opened.single.toString(),
          'https://shoot.example/studios',
        );
      },
    );

    test('MG-US3-S4 which sections are drawn', () {
      expect(isDrawn(_steps()), isTrue);
      expect(isDrawn(_faq()), isTrue);
      expect(isDrawn(_logos), isFalse);
      expect(
        isDrawn(const UnknownSection(anchor: null, type: 'future')),
        isFalse,
      );
    });
  });

  group('MG-US3-S1 the one primary action', () {
    testWidgets('MG-US3-S1 is "Start a brief" and goes to the landing', (
      tester,
    ) async {
      h.stubPage(
        'how-it-works',
        pageOf('How it works', [_steps()], path: '/how-it-works'),
      );
      final router = await pumpContent(tester, h, location: '/how-it-works');
      await tester.pumpAndSettle();
      expect(find.byType(TopHit), findsOneWidget);
      await tester.tap(find.text('Start a brief'));
      await tester.pumpAndSettle();
      expect(locationOf(router), '/');
    });

    testWidgets('MG-US3-S1 the page\'s own call to action replaces it', (
      tester,
    ) async {
      h.stubPage(
        'join',
        pageOf('Join', [
          const CallToActionSection(
            anchor: null,
            heading: 'Work with us',
            body: 'Tell us about yourself.',
            primary: Cta(
              label: 'Join as a creator',
              kind: CtaKind.link,
              path: '/register',
              url: null,
            ),
            secondary: null,
          ),
        ], path: '/join'),
      );
      h.stubMissingPage('register', PathStatus.notFound);
      final router = await pumpContent(tester, h, location: '/join');
      await tester.pumpAndSettle();
      expect(find.byType(TopHit), findsOneWidget);
      expect(find.text('Start a brief'), findsNothing);
      expect(find.text('Join as a creator'), findsOneWidget);
      await tester.tap(find.text('Join as a creator'));
      await tester.pumpAndSettle();
      expect(locationOf(router), '/register');
    });
  });

  group('MG-US3-S5 a draft or unknown page', () {
    testWidgets('MG-US3-S5 shows the not-found screen, never the removed one', (
      tester,
    ) async {
      h.stubMissingPage('draft', PathStatus.notFound);
      await pumpContent(tester, h, location: '/draft');
      await tester.pumpAndSettle();
      expect(find.text("That page isn't here"), findsOneWidget);
    });
  });

  group('MG-US3-S6 changes show on the next visit', () {
    testWidgets('MG-US3-S6 opening the page again reads the CMS again', (
      tester,
    ) async {
      h.stubPage('about', pageOf('About', [_faq()], path: '/about'));
      final router = await pumpContent(tester, h, location: '/about');
      await tester.pumpAndSettle();
      expect(find.text('About'), findsOneWidget);
      h.stubPage('about', pageOf('About us', [_faq()], path: '/about'));
      router.go('/');
      await tester.pumpAndSettle();
      router.go('/about');
      await tester.pumpAndSettle();
      expect(find.text('About us'), findsOneWidget);
    });
  });

  group('MG-US3-S7 a page whose address changed', () {
    testWidgets('MG-US3-S7 the old address opens at the new one', (
      tester,
    ) async {
      h.stubPage('old-name', pageOf('New name', [_faq()], path: '/new-name'));
      h.stubPage('new-name', pageOf('New name', [_faq()], path: '/new-name'));
      final router = await pumpContent(tester, h, location: '/old-name');
      await tester.pumpAndSettle();
      expect(locationOf(router), '/new-name');
      expect(find.text('New name'), findsOneWidget);
    });
  });
}
