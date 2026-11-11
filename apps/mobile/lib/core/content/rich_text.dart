/// CMS rich text as the API sends it (`richTextV1`, research R10): a fixed
/// tree of blocks and inlines, never HTML. A node type this build does not
/// know decodes to [UnknownBlock] or [UnknownInline], which screens skip.
library;

import 'package:equatable/equatable.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/core/network/json_read.dart';

/// A rich text value: its top-level blocks in order.
///
/// Named `RichTextDocument` so it never clashes with Flutter's `RichText`
/// widget in a file that renders it.
final class RichTextDocument extends Equatable {
  const RichTextDocument(this.nodes);

  final List<RichBlock> nodes;

  @override
  List<Object?> get props => [nodes];
}

/// One block of rich text.
sealed class RichBlock extends Equatable {
  const RichBlock();
}

final class ParagraphBlock extends RichBlock {
  const ParagraphBlock(this.children);

  final List<RichInline> children;

  @override
  List<Object?> get props => [children];
}

/// [level] is 2, 3 or 4 (the page title is level 1).
final class HeadingBlock extends RichBlock {
  const HeadingBlock({required this.level, required this.children});

  final int level;
  final List<RichInline> children;

  @override
  List<Object?> get props => [level, children];
}

/// Each item is a list of blocks, so lists nest.
final class ListBlock extends RichBlock {
  const ListBlock({required this.ordered, required this.items});

  final bool ordered;
  final List<List<RichBlock>> items;

  @override
  List<Object?> get props => [ordered, items];
}

final class QuoteBlock extends RichBlock {
  const QuoteBlock(this.children);

  final List<RichInline> children;

  @override
  List<Object?> get props => [children];
}

final class ImageBlock extends RichBlock {
  const ImageBlock(this.image);

  final ImageRef image;

  @override
  List<Object?> get props => [image];
}

/// A block type added to v1 after this build; [type] is its wire name.
final class UnknownBlock extends RichBlock {
  const UnknownBlock(this.type);

  final String type;

  @override
  List<Object?> get props => [type];
}

/// One inline run of rich text.
sealed class RichInline extends Equatable {
  const RichInline();
}

final class TextInline extends RichInline {
  const TextInline(
    this.text, {
    this.bold = false,
    this.italic = false,
    this.underline = false,
    this.code = false,
  });

  final String text;
  final bool bold;
  final bool italic;
  final bool underline;
  final bool code;

  @override
  List<Object?> get props => [text, bold, italic, underline, code];
}

/// [href] is a site path (`/guides/x`) or a web, mail or phone address.
final class LinkInline extends RichInline {
  const LinkInline({required this.href, required this.children});

  final String href;
  final List<TextInline> children;

  @override
  List<Object?> get props => [href, children];
}

final class LineBreakInline extends RichInline {
  const LineBreakInline();

  @override
  List<Object?> get props => [];
}

/// An inline type added to v1 after this build; [type] is its wire name.
final class UnknownInline extends RichInline {
  const UnknownInline(this.type);

  final String type;

  @override
  List<Object?> get props => [type];
}

/// Decodes `richTextV1`. Throws [FormatException] on a missing or mistyped
/// field of a known node; an unknown node type is not an error.
final class RichTextModel {
  const RichTextModel._(this._entity);

  factory RichTextModel.fromJson(Json json) {
    return RichTextModel._(
      RichTextDocument(List.unmodifiable(_blocks(json, 'nodes'))),
    );
  }

  /// A required `richTextV1` at [key].
  static RichTextDocument read(Json json, String key) {
    return RichTextModel.fromJson(readObject(json, key)).toEntity();
  }

  final RichTextDocument _entity;

  RichTextDocument toEntity() => _entity;
}

List<RichBlock> _blocks(Json json, String key) {
  return readList(json, key, (item) => _block(asObject(item)));
}

RichBlock _block(Json json) {
  final type = readString(json, 'type');
  return switch (type) {
    'paragraph' => ParagraphBlock(_inlines(json)),
    'heading' => HeadingBlock(
      level: readInt(json, 'level'),
      children: _inlines(json),
    ),
    'list' => ListBlock(
      ordered: readBool(json, 'ordered'),
      items: List.unmodifiable(
        readList(json, 'items', (item) {
          if (item is! List) {
            throw const FormatException('Expected a list at "items"');
          }
          return List<RichBlock>.unmodifiable([
            for (final block in item) _block(asObject(block)),
          ]);
        }),
      ),
    ),
    'quote' => QuoteBlock(_inlines(json)),
    'image' => ImageBlock(ImageRefModel.read(json, 'image')),
    _ => UnknownBlock(type),
  };
}

List<RichInline> _inlines(Json json) {
  return List.unmodifiable(
    readList(json, 'children', (item) => _inline(asObject(item))),
  );
}

RichInline _inline(Json json) {
  final type = readString(json, 'type');
  return switch (type) {
    'text' => _text(json),
    'link' => LinkInline(
      href: readString(json, 'href'),
      children: List.unmodifiable(
        readList(json, 'children', (item) => _text(asObject(item))),
      ),
    ),
    'lineBreak' => const LineBreakInline(),
    _ => UnknownInline(type),
  };
}

TextInline _text(Json json) {
  return TextInline(
    readString(json, 'text'),
    bold: readBool(json, 'bold'),
    italic: readBool(json, 'italic'),
    underline: readBool(json, 'underline'),
    code: readBool(json, 'code'),
  );
}
