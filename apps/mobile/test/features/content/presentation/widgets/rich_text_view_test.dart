import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/rich_text_view.dart';

import '../../../../helpers/content_fixtures.dart';
import '../../../../helpers/pump_app.dart';

/// Every `TextSpan` of the rendered text, flattened.
List<TextSpan> _spans(WidgetTester tester) {
  final out = <TextSpan>[];
  void walk(InlineSpan span) {
    if (span is TextSpan) {
      out.add(span);
      span.children?.forEach(walk);
    }
  }

  for (final text in tester.widgetList<RichText>(find.byType(RichText))) {
    walk(text.text);
  }
  return out;
}

void main() {
  Future<List<String>> pump(
    WidgetTester tester,
    RichTextDocument document, {
    Locale locale = const Locale('en'),
  }) async {
    final taps = <String>[];
    await tester.pumpApp(
      Scaffold(
        body: SingleChildScrollView(
          child: RichTextView(document: document, onLink: taps.add),
        ),
      ),
      locale: locale,
    );
    await tester.pump();
    return taps;
  }

  group('MG-US2-S4 the long-form text is drawn from the CMS nodes', () {
    testWidgets('MG-US2-S4 paragraphs, bold and italic runs', (tester) async {
      await pump(
        tester,
        const RichTextDocument([
          ParagraphBlock([
            TextInline('Plain '),
            TextInline('strong', bold: true),
            TextInline(' and '),
            TextInline('slanted', italic: true),
          ]),
        ]),
      );
      final spans = _spans(tester);
      expect(
        spans.firstWhere((s) => s.text == 'strong').style?.fontWeight,
        FontWeight.w600,
      );
      expect(
        spans.firstWhere((s) => s.text == 'slanted').style?.fontStyle,
        FontStyle.italic,
      );
    });

    testWidgets('MG-US2-S4 headings are announced as headings', (tester) async {
      final handle = tester.ensureSemantics();
      await pump(
        tester,
        RichTextDocument([heading('Start with the day'), paragraph('Body')]),
      );
      expect(
        tester.getSemantics(find.text('Start with the day')),
        matchesSemantics(
          isHeader: true,
          label: 'Start with the day',
          textDirection: TextDirection.ltr,
        ),
      );
      handle.dispose();
    });

    testWidgets('MG-US2-S4 ordered and unordered lists keep their markers', (
      tester,
    ) async {
      await pump(
        tester,
        RichTextDocument([
          ListBlock(
            ordered: true,
            items: [
              [paragraph('First')],
              [paragraph('Second')],
            ],
          ),
          ListBlock(
            ordered: false,
            items: [
              [paragraph('Dot')],
            ],
          ),
        ]),
      );
      expect(find.text('1.'), findsOneWidget);
      expect(find.text('2.'), findsOneWidget);
      expect(find.text('•'), findsOneWidget);
      expect(find.text('Second'), findsOneWidget);
    });

    testWidgets('MG-US2-S4 markup in text is shown as plain text, never run', (
      tester,
    ) async {
      await pump(
        tester,
        RichTextDocument([paragraph('<script>alert(1)</script> <b>x</b>')]),
      );
      expect(find.textContaining('<script>alert(1)</script>'), findsOneWidget);
    });

    testWidgets('MG-US2-S4 nodes this build does not know are skipped', (
      tester,
    ) async {
      await pump(
        tester,
        const RichTextDocument([
          UnknownBlock('table'),
          ParagraphBlock([UnknownInline('emoji'), TextInline('kept')]),
        ]),
      );
      expect(find.text('kept'), findsOneWidget);
    });

    testWidgets(
      'MG-US2-S4 an image that cannot load shows its description in its place',
      (tester) async {
        await pump(
          tester,
          const RichTextDocument([
            ImageBlock(
              ImageRef(
                alt: 'A couple on a terrace',
                width: 1600,
                height: 1200,
                sizes: [
                  ImageSize(
                    url: 'https://shoot.example/missing.webp',
                    width: 400,
                    height: 300,
                  ),
                ],
              ),
            ),
          ]),
        );
        await tester.pump(const Duration(milliseconds: 50));
        expect(find.text('A couple on a terrace'), findsWidgets);
      },
    );
  });

  group('MG-US2-S5 links', () {
    testWidgets('MG-US2-S5 a tap on a link reports its address', (
      tester,
    ) async {
      final taps = await pump(
        tester,
        const RichTextDocument([
          ParagraphBlock([
            TextInline('See the '),
            LinkInline(
              href: '/privacy',
              children: [TextInline('privacy policy')],
            ),
          ]),
        ]),
      );
      final link = _spans(tester)
          .firstWhere((s) => s.recognizer is TapGestureRecognizer);
      (link.recognizer! as TapGestureRecognizer).onTap!();
      expect(taps, ['/privacy']);
      expect(link.style?.decoration, TextDecoration.underline);
    });
  });
}
