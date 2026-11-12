import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/features/content/domain/legal_sections.dart';

HeadingBlock _h(String text, {int level = 2}) =>
    HeadingBlock(level: level, children: [TextInline(text)]);

void main() {
  group(
    'MG-US1-S7 clause numbers are the CMS text, the same in both languages',
    () {
      test('MG-US1-S7 numbers come from "1." and "2)" prefixes', () {
        final sections = tocOf(
          RichTextDocument([
            _h('1. Who we are'),
            const ParagraphBlock([TextInline('x')]),
            _h('2) Bookings'),
          ]),
        );
        expect(sections.map((s) => s.number), ['1', '2']);
        expect(sections.map((s) => s.title), ['Who we are', 'Bookings']);
        expect(sections.map((s) => s.id), ['section-0', 'section-1']);
        expect(sections.map((s) => s.blockIndex), [0, 2]);
      });

      test('MG-US1-S7 a heading with no number takes its position', () {
        final sections = tocOf(
          RichTextDocument([_h('Who we are'), _h('Bookings')]),
        );
        expect(sections.map((s) => s.number), ['1', '2']);
        expect(sections.first.title, 'Who we are');
      });

      test('MG-US1-S7 Arabic text keeps the same number as English', () {
        final english = tocOf(RichTextDocument([_h('2. Bookings')]));
        final arabic = tocOf(RichTextDocument([_h('2. الحجوزات')]));
        expect(arabic.single.number, english.single.number);
        expect(arabic.single.title, 'الحجوزات');
      });

      test('MG-US1-S7 only level-2 headings are sections', () {
        final sections = tocOf(
          RichTextDocument([
            _h('Intro', level: 3),
            _h('1. A'),
            _h('Sub', level: 4),
          ]),
        );
        expect(sections, hasLength(1));
      });
    },
  );
}
