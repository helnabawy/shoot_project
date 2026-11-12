import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';

import '../../../../helpers/content_fixtures.dart';
import '../../../../helpers/content_harness.dart';

const _longText =
    'The parties agree that this clause is read with the others, and that nothing in it '
    'limits what the law gives either of them. ';

RichTextDocument _body(int sections, {String prefix = 'Section'}) =>
    RichTextDocument([
      for (var i = 1; i <= sections; i++) ...[
        heading('$i. $prefix $i'),
        paragraph(_longText * 6),
      ],
    ]);

LegalDocument _doc({
  LegalKind kind = LegalKind.terms,
  String title = 'Terms',
  int version = 3,
  DateTime? from,
  DateTime? until,
  bool inRequestedLanguage = true,
  UpcomingLegalVersion? upcoming,
  RichTextDocument? body,
}) => LegalDocument(
  locale: 'en',
  kind: kind,
  title: title,
  version: version,
  effectiveFrom: from ?? DateTime.utc(2026, 11),
  until: until,
  body: body ?? _body(5),
  inRequestedLanguage: inRequestedLanguage,
  upcoming: upcoming,
);

void main() {
  late ContentHarness h;

  setUp(() => h = ContentHarness());

  group('MG-US1-S1 the version in force', () {
    testWidgets(
      'MG-US1-S1 label, title, version line, switch, note, contents and sections',
      (tester) async {
        h.stubLegal(LegalKind.terms, _doc());
        await pumpContent(tester, h, location: '/terms');
        await tester.pumpAndSettle();
        expect(find.text('LEGAL'), findsOneWidget);
        expect(find.text('Terms'), findsWidgets);
        expect(
          find.text('Version 3 · applies from 1 November'),
          findsOneWidget,
        );
        expect(find.text('Professional terms'), findsOneWidget);
        expect(find.text('Privacy'), findsOneWidget);
        expect(
          find.text(
            'If the Arabic and English texts differ, the English text governs.',
          ),
          findsOneWidget,
        );
        expect(find.text('IN THIS DOCUMENT'), findsOneWidget);
        expect(find.text('Section 1'), findsOneWidget);
        expect(find.text('1. Section 1'), findsOneWidget);
      },
    );

    testWidgets('MG-US1-S1 the screen has no primary action (FR-006)', (
      tester,
    ) async {
      h.stubLegal(LegalKind.terms, _doc());
      await pumpContent(tester, h, location: '/terms');
      await tester.pumpAndSettle();
      expect(find.byType(TopHit), findsNothing);
    });

    testWidgets('MG-US1-S1 a date in another year shows its year', (
      tester,
    ) async {
      h.stubLegal(LegalKind.terms, _doc(from: DateTime.utc(2025, 3, 9)));
      await pumpContent(tester, h, location: '/terms');
      await tester.pumpAndSettle();
      expect(
        find.text('Version 3 · applies from 9 March 2025'),
        findsOneWidget,
      );
    });
  });

  group('MG-US1-S2 the switch', () {
    testWidgets(
      'MG-US1-S2 Professional terms and Privacy open their own paths',
      (tester) async {
        h.stubLegal(LegalKind.terms, _doc());
        h.stubLegal(
          LegalKind.professionalTerms,
          _doc(
            kind: LegalKind.professionalTerms,
            title: 'Professional terms',
            version: 1,
          ),
        );
        h.stubLegal(
          LegalKind.privacy,
          _doc(kind: LegalKind.privacy, title: 'Privacy', version: 2),
        );
        final router = await pumpContent(tester, h, location: '/terms');
        await tester.pumpAndSettle();
        await tester.tap(find.text('Professional terms'));
        await tester.pumpAndSettle();
        expect(locationOf(router), '/terms/professional');
        expect(
          find.text('Version 1 · applies from 1 November'),
          findsOneWidget,
        );
        await tester.tap(find.text('Privacy'));
        await tester.pumpAndSettle();
        expect(locationOf(router), '/privacy');
        expect(
          find.text('Version 2 · applies from 1 November'),
          findsOneWidget,
        );
      },
    );
  });

  group('MG-US1-S3 the table of contents', () {
    testWidgets('MG-US1-S3 a tap scrolls to the section', (tester) async {
      h.stubLegal(LegalKind.terms, _doc());
      await pumpContent(tester, h, location: '/terms');
      await tester.pumpAndSettle();
      final heading = find.text('5. Section 5');
      final viewportHeight =
          tester.view.physicalSize.height / tester.view.devicePixelRatio;
      expect(tester.getTopLeft(heading).dy, greaterThan(viewportHeight));
      await tester.tap(find.text('Section 5'));
      await tester.pumpAndSettle();
      expect(tester.getTopLeft(heading).dy, lessThan(viewportHeight));
    });

    testWidgets('MG-US1-S3 headings are headings for the screen reader', (
      tester,
    ) async {
      final handle = tester.ensureSemantics();
      h.stubLegal(LegalKind.terms, _doc());
      await pumpContent(tester, h, location: '/terms');
      await tester.pumpAndSettle();
      expect(find.bySemanticsLabel('1. Section 1'), findsWidgets);
      expect(
        tester.getSemantics(find.text('1. Section 1')),
        matchesSemantics(
          isHeader: true,
          label: '1. Section 1',
          textDirection: TextDirection.ltr,
        ),
      );
      handle.dispose();
    });
  });

  group('MG-US1-S4 a version that starts later', () {
    testWidgets('MG-US1-S4 the version in force announces the next one', (
      tester,
    ) async {
      h.stubLegal(
        LegalKind.terms,
        _doc(
          upcoming: UpcomingLegalVersion(
            version: 4,
            effectiveFrom: DateTime.utc(2026, 12),
          ),
        ),
      );
      await pumpContent(tester, h, location: '/terms');
      await tester.pumpAndSettle();
      expect(find.text('Version 4 applies from 1 December.'), findsOneWidget);
    });

    testWidgets('MG-US1-S4 with nothing upcoming there is no such line', (
      tester,
    ) async {
      h.stubLegal(LegalKind.terms, _doc());
      await pumpContent(tester, h, location: '/terms');
      await tester.pumpAndSettle();
      expect(find.textContaining('applies from 1 December'), findsNothing);
    });

    testWidgets(
      'MG-US1-S4 every open reads the server again, so the date takes over',
      (tester) async {
        h.stubLegal(LegalKind.terms, _doc(version: 3));
        final router = await pumpContent(tester, h, location: '/terms');
        await tester.pumpAndSettle();
        expect(
          find.text('Version 3 · applies from 1 November'),
          findsOneWidget,
        );
        h.stubLegal(
          LegalKind.terms,
          _doc(version: 4, from: DateTime.utc(2026, 12, 1)),
        );
        router.go('/privacy');
        h.stubLegal(
          LegalKind.privacy,
          _doc(kind: LegalKind.privacy, title: 'Privacy'),
        );
        await tester.pumpAndSettle();
        router.go('/terms');
        await tester.pumpAndSettle();
        expect(
          find.text('Version 4 · applies from 1 December'),
          findsOneWidget,
        );
      },
    );
  });

  group('MG-US1-S5 earlier versions', () {
    testWidgets(
      'MG-US1-S5 the list, then an earlier version with the newer-version line',
      (tester) async {
        h.stubLegal(LegalKind.terms, _doc());
        h.stubLegalVersions(LegalKind.terms, exampleLegalVersions());
        h.stubLegalVersion(
          LegalKind.terms,
          1,
          _doc(
            version: 1,
            from: DateTime.utc(2026),
            until: DateTime.utc(2026, 6),
          ),
        );
        final router = await pumpContent(tester, h, location: '/terms');
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.text('Earlier versions'));
        await tester.tap(find.text('Earlier versions'));
        await tester.pumpAndSettle();
        expect(locationOf(router), '/terms/versions');
        expect(find.text('Version 2 · From 1 June'), findsOneWidget);
        expect(find.text('Version 1 · 1 January to 1 June'), findsOneWidget);
        expect(find.text('Clearer words on cancellations.'), findsOneWidget);
        await tester.tap(find.text('Version 1 · 1 January to 1 June'));
        await tester.pumpAndSettle();
        expect(locationOf(router), '/terms/versions/1');
        expect(find.text('A newer version is in force.'), findsOneWidget);
        await tester.tap(find.text('Read the version in force'));
        await tester.pumpAndSettle();
        expect(locationOf(router), '/terms');
      },
    );

    testWidgets(
      'MG-US1-S5 a version number that is not a number is not found',
      (tester) async {
        await pumpContent(tester, h, location: '/terms/versions/abc');
        await tester.pumpAndSettle();
        expect(find.text("That page isn't here"), findsOneWidget);
      },
    );
  });

  group('MG-US1-S6 a document with no Arabic text', () {
    testWidgets(
      'MG-US1-S6 the English text shows left to right with the Arabic notice',
      (tester) async {
        h.stubLegal(LegalKind.terms, _doc(inRequestedLanguage: false));
        await pumpContent(
          tester,
          h,
          location: '/terms',
          locale: const Locale('ar'),
        );
        await tester.pumpAndSettle();
        expect(
          find.text('النص العربي غير متوفر بعد. يسود النص الإنجليزي.'),
          findsOneWidget,
        );
        expect(
          Directionality.of(tester.element(find.text('1. Section 1'))),
          TextDirection.ltr,
        );
      },
    );

    testWidgets(
      'MG-US1-S6 text in Arabic reads right to left with no such notice',
      (tester) async {
        h.stubLegal(
          LegalKind.terms,
          _doc(
            body: _body(2, prefix: 'القسم'),
            title: 'الشروط والأحكام',
          ),
        );
        await pumpContent(
          tester,
          h,
          location: '/terms',
          locale: const Locale('ar'),
        );
        await tester.pumpAndSettle();
        expect(
          find.text('النص العربي غير متوفر بعد. يسود النص الإنجليزي.'),
          findsNothing,
        );
        expect(
          Directionality.of(tester.element(find.text('1. القسم 1'))),
          TextDirection.rtl,
        );
      },
    );
  });

  group('MG-US1-S7 clause numbers in Arabic', () {
    testWidgets('MG-US1-S7 the contents keep the same numbers as English', (
      tester,
    ) async {
      h.stubLegal(LegalKind.terms, _doc(body: _body(3, prefix: 'القسم')));
      await pumpContent(
        tester,
        h,
        location: '/terms',
        locale: const Locale('ar'),
      );
      await tester.pumpAndSettle();
      for (final number in ['1', '2', '3']) {
        expect(find.text(number), findsOneWidget);
        expect(find.text('$number. القسم $number'), findsOneWidget);
      }
    });
  });
}
