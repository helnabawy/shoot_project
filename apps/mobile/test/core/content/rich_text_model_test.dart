import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/core/network/json_read.dart';

import '../../helpers/api_examples.dart';

Map<String, Object?> _text(String text, {bool bold = false}) => {
  'type': 'text',
  'text': text,
  'bold': bold,
  'italic': false,
  'underline': false,
  'code': false,
};

const _image = {
  'alt': '',
  'width': 800,
  'height': 600,
  'sizes': [
    {'url': 'https://cdn.test/a.webp', 'width': 800, 'height': 600},
  ],
};

void main() {
  group('MR-US1-S5 RichTextModel.fromJson', () {
    test('decodes every block and inline type, lists nest', () {
      final doc = RichTextModel.fromJson({
        'nodes': [
          {
            'type': 'heading',
            'level': 3,
            'children': [_text('Title')],
          },
          {
            'type': 'paragraph',
            'children': [
              _text('Hello ', bold: true),
              {
                'type': 'link',
                'href': '/guides/light',
                'children': [_text('a guide')],
              },
              {'type': 'lineBreak'},
            ],
          },
          {
            'type': 'list',
            'ordered': true,
            'items': [
              [
                {
                  'type': 'paragraph',
                  'children': [_text('One')],
                },
                {
                  'type': 'list',
                  'ordered': false,
                  'items': [
                    [
                      {
                        'type': 'paragraph',
                        'children': [_text('One a')],
                      },
                    ],
                  ],
                },
              ],
            ],
          },
          {
            'type': 'quote',
            'children': [_text('Said')],
          },
          {'type': 'image', 'image': _image},
        ],
      }).toEntity();

      expect(doc.nodes, hasLength(5));
      expect(
        doc.nodes[0],
        const HeadingBlock(level: 3, children: [TextInline('Title')]),
      );
      expect(
        doc.nodes[1],
        const ParagraphBlock([
          TextInline('Hello ', bold: true),
          LinkInline(href: '/guides/light', children: [TextInline('a guide')]),
          LineBreakInline(),
        ]),
      );
      final list = doc.nodes[2] as ListBlock;
      expect(list.ordered, isTrue);
      expect(list.items.single[0], const ParagraphBlock([TextInline('One')]));
      expect(
        (list.items.single[1] as ListBlock).items.single.single,
        const ParagraphBlock([TextInline('One a')]),
      );
      expect(doc.nodes[3], const QuoteBlock([TextInline('Said')]));
      expect((doc.nodes[4] as ImageBlock).image.width, 800);
    });

    test('unknown block and inline types decode to Unknown*', () {
      final doc = RichTextModel.fromJson({
        'nodes': [
          {'type': 'table', 'rows': 3},
          {
            'type': 'paragraph',
            'children': [
              {'type': 'mention', 'who': 'x'},
            ],
          },
        ],
      }).toEntity();

      expect(doc.nodes, const [
        UnknownBlock('table'),
        ParagraphBlock([UnknownInline('mention')]),
      ]);
    });

    test('a missing or mistyped field of a known node throws', () {
      expect(
        () => RichTextModel.fromJson({
          'nodes': [
            {'type': 'heading', 'children': <Object?>[]},
          ],
        }),
        throwsFormatException,
      );
      expect(
        () => RichTextModel.fromJson({
          'nodes': [
            {
              'type': 'list',
              'ordered': false,
              'items': ['not a list'],
            },
          ],
        }),
        throwsFormatException,
      );
      expect(
        () => RichTextModel.fromJson({
          'nodes': [
            {
              'type': 'paragraph',
              'children': [
                {'type': 'text', 'text': 'x'},
              ],
            },
          ],
        }),
        throwsFormatException,
      );
      expect(() => RichTextModel.fromJson({}), throwsFormatException);
    });
  });

  group('MR-US4-S2 the guide example body', () {
    /// Every block and inline anywhere in [blocks], lists included.
    Iterable<Object> walk(List<RichBlock> blocks) sync* {
      for (final block in blocks) {
        yield block;
        switch (block) {
          case ParagraphBlock(:final children) ||
              HeadingBlock(:final children) ||
              QuoteBlock(:final children):
            yield* children;
          case ListBlock(:final items):
            for (final item in items) {
              yield* walk(item);
            }
          case ImageBlock() || UnknownBlock():
            break;
        }
      }
    }

    test('decodes into every block and inline kind', () {
      final body = RichTextModel.read(loadExample('guide'), 'body');
      final types = walk(body.nodes).map((n) => n.runtimeType).toSet();

      expect(
        types,
        containsAll(<Type>[
          ParagraphBlock,
          HeadingBlock,
          ListBlock,
          QuoteBlock,
          ImageBlock,
          TextInline,
          LinkInline,
          LineBreakInline,
        ]),
      );
      final links = walk(body.nodes).whereType<LinkInline>().map((l) => l.href);
      expect(links, contains('/creators'));
    });

    test('an unknown kind in the guide body gives Unknown*', () {
      final json = loadExample('guide');
      final nodes = (json['body']! as Json)['nodes']! as List<Object?>;
      final body = RichTextModel.fromJson({
        'nodes': [
          ...nodes,
          {'type': 'table', 'rows': <Object?>[]},
          {
            'type': 'paragraph',
            'children': [
              {'type': 'mention', 'who': 'x'},
            ],
          },
        ],
      }).toEntity();

      expect(body.nodes.whereType<UnknownBlock>().single.type, 'table');
      final last = body.nodes.last as ParagraphBlock;
      expect(last.children.single, isA<UnknownInline>());
    });
  });
}
