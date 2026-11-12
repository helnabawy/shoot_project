import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';

/// One numbered section of a legal document: a level-2 heading of its text.
final class LegalSection extends Equatable {
  const LegalSection({
    required this.id,
    required this.number,
    required this.title,
    required this.blockIndex,
  });

  /// The scroll anchor, `section-<position>`.
  final String id;

  /// The clause number the heading starts with (`1.` or `2)`), else its position. The same number
  /// in English and Arabic, because it is the CMS's own text.
  final String number;

  /// The heading without its number.
  final String title;

  /// Index of the heading in [RichTextDocument.nodes].
  final int blockIndex;

  @override
  List<Object?> get props => [id, number, title, blockIndex];
}

final _numbered = RegExp(r'^\s*(\d+)\s*[.)]\s*(.*)$', dotAll: true);

/// The table of contents of [document]: its level-2 headings, in order (research R5).
List<LegalSection> tocOf(RichTextDocument document) {
  final sections = <LegalSection>[];
  for (final (index, block) in document.nodes.indexed) {
    if (block is! HeadingBlock || block.level != 2) continue;
    final text = block.children
        .whereType<TextInline>()
        .map((t) => t.text)
        .join();
    final match = _numbered.firstMatch(text);
    final position = sections.length;
    sections.add(
      LegalSection(
        id: 'section-$position',
        number: match?.group(1) ?? '${position + 1}',
        title: (match?.group(2) ?? text).trim(),
        blockIndex: index,
      ),
    );
  }
  return sections;
}
