import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/core/media/image_ref.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_colors.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// Draws CMS rich text (`RichTextDocument`) as the boards 34 and 36 set it: 16 px body at 1.6, level 2
/// headings as `heading` (20/600), lists with their markers at the inline start, quotes with a start
/// rule, images with their description, and links in `accentInk`. It draws only what the node tree
/// can say, so markup text is shown as plain text and never run (FR-013); nodes of a type this build
/// does not know are skipped.
class RichTextView extends StatefulWidget {
  const RichTextView({
    super.key,
    required this.document,
    required this.onLink,
    this.gap = ShootSpace.s3 + 2,
    this.headingKeys = const {},
    this.fontSize = 16,
  });

  final RichTextDocument document;

  /// A tap on a link; the receiver decides where it goes (`resolveLink`).
  final void Function(String href) onLink;

  /// Space between blocks: 14 in articles, 10 in legal text.
  final double gap;

  /// Keys for top-level headings by their index in `document.nodes`, so a table of contents can
  /// scroll to them.
  final Map<int, GlobalKey> headingKeys;

  /// Body size: 16 for reading, 15 for the short answers on pages.
  final double fontSize;

  @override
  State<RichTextView> createState() => _RichTextViewState();
}

class _RichTextViewState extends State<RichTextView> {
  final List<TapGestureRecognizer> _recognizers = [];

  void _release() {
    for (final recognizer in _recognizers) {
      recognizer.dispose();
    }
    _recognizers.clear();
  }

  @override
  void dispose() {
    _release();
    super.dispose();
  }

  TextStyle _body(BuildContext context) => ShootType.body.copyWith(
    fontSize: widget.fontSize,
    color: context.colors.bodyInk,
  );

  TapGestureRecognizer _linkTap(String href) {
    final recognizer = TapGestureRecognizer()
      ..onTap = () => widget.onLink(href);
    _recognizers.add(recognizer);
    return recognizer;
  }

  /// Spans carry only what differs from the run around them. A child span's own `ShootType` base
  /// would bring a `fontFamilyFallback` without the platform family, and the family would be lost;
  /// the root span ([_text]) has the full style.
  InlineSpan _inline(BuildContext context, RichInline inline) {
    final c = context.colors;
    switch (inline) {
      case TextInline():
        return TextSpan(text: inline.text, style: _runStyle(inline, c));
      case LinkInline(:final href, :final children):
        // Flutter asks the innermost span under the finger for its recognizer, so every run of
        // the link carries it.
        final link = TextStyle(
          color: c.accentInk,
          fontWeight: FontWeight.w500,
          decoration: TextDecoration.underline,
          decorationColor: c.accentInk,
        );
        return TextSpan(
          children: [
            for (final child in children)
              TextSpan(
                text: child.text,
                style: link.merge(_runStyle(child, c)),
                recognizer: _linkTap(href),
              ),
          ],
        );
      case LineBreakInline():
        return const TextSpan(text: '\n');
      case UnknownInline():
        return const TextSpan();
    }
  }

  TextStyle _runStyle(TextInline run, ShootColors c) {
    return TextStyle(
      fontWeight: run.bold ? FontWeight.w600 : null,
      fontStyle: run.italic ? FontStyle.italic : null,
      decoration: run.underline ? TextDecoration.underline : null,
      fontFamily: run.code ? 'monospace' : null,
      backgroundColor: run.code ? c.surfaceSunk : null,
    );
  }

  Widget _text(
    BuildContext context,
    List<RichInline> inlines,
    TextStyle style,
  ) {
    return Text.rich(
      TextSpan(
        style: DefaultTextStyle.of(context).style.merge(style),
        children: [for (final i in inlines) _inline(context, i)],
      ),
    );
  }

  Widget? _block(BuildContext context, RichBlock block, {Key? key}) {
    final c = context.colors;
    switch (block) {
      case ParagraphBlock(:final children):
        return _text(context, children, _body(context));
      case HeadingBlock(:final level, :final children):
        final style = switch (level) {
          2 => ShootType.heading,
          3 => ShootType.action,
          _ => ShootType.row.copyWith(fontWeight: FontWeight.w600),
        }.copyWith(color: c.ink);
        return Semantics(
          header: true,
          child: KeyedSubtree(key: key, child: _text(context, children, style)),
        );
      case ListBlock(:final ordered, :final items):
        final style = _body(context).copyWith(height: 1.5);
        return Padding(
          padding: const EdgeInsetsDirectional.only(start: ShootSpace.s1),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            spacing: 6,
            children: [
              for (final (i, item) in items.indexed)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SizedBox(
                      width: ordered ? 24 : 16,
                      child: ExcludeSemantics(
                        child: Text(ordered ? '${i + 1}.' : '•', style: style),
                      ),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        spacing: 6,
                        children: [
                          for (final inner in item)
                            ?_inList(context, inner, style),
                        ],
                      ),
                    ),
                  ],
                ),
            ],
          ),
        );
      case QuoteBlock(:final children):
        return Container(
          padding: const EdgeInsetsDirectional.only(start: ShootSpace.s4),
          decoration: BoxDecoration(
            border: BorderDirectional(
              start: BorderSide(color: c.hair, width: 3),
            ),
          ),
          child: _text(
            context,
            children,
            _body(context).copyWith(fontStyle: FontStyle.italic),
          ),
        );
      case ImageBlock(:final image):
        return _RichImage(image);
      case UnknownBlock():
        return null;
    }
  }

  /// A block inside a list item: paragraphs take the list's tighter line height.
  Widget? _inList(BuildContext context, RichBlock block, TextStyle style) {
    if (block is ParagraphBlock) return _text(context, block.children, style);
    return _block(context, block);
  }

  @override
  Widget build(BuildContext context) {
    _release();
    final blocks = <Widget>[];
    for (final (index, block) in widget.document.nodes.indexed) {
      final built = _block(context, block, key: widget.headingKeys[index]);
      if (built != null) blocks.add(built);
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: widget.gap,
      children: blocks,
    );
  }
}

/// An image in the text at its own ratio, 12 px corners; its description stands in when it cannot
/// load (spec edge case) and is what a screen reader says.
class _RichImage extends StatelessWidget {
  const _RichImage(this.image);

  final ImageRef image;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final alt = image.alt;
    return Semantics(
      image: true,
      label: alt.isEmpty ? null : alt,
      child: ExcludeSemantics(
        child: ClipRRect(
          borderRadius: BorderRadius.circular(ShootRadius.photoLarge),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final target =
                  constraints.maxWidth * MediaQuery.devicePixelRatioOf(context);
              final size = image.pick(target);
              return AspectRatio(
                aspectRatio: image.width / image.height,
                child: Image.network(
                  size.url,
                  fit: BoxFit.cover,
                  frameBuilder: (context, child, frame, sync) =>
                      frame == null && !sync
                      ? ColoredBox(color: c.surfaceSunk)
                      : child,
                  errorBuilder: (context, error, stack) => ColoredBox(
                    color: c.surfaceSunk,
                    child: Padding(
                      padding: const EdgeInsets.all(ShootSpace.s4),
                      child: Center(
                        child: Text(
                          alt,
                          textAlign: TextAlign.center,
                          style: ShootType.meta.copyWith(color: c.mute),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
