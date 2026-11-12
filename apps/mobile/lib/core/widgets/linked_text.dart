import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// A link or an emphasised run inside a sentence. [underline]: a plain `a` (the boards'
/// legal links); [quiet]: `.quiet`, weight 500.
typedef InlinePart = ({
  String text,
  VoidCallback? onTap,
  bool number,
  bool underline,
  bool quiet,
});

/// Running text with inline `a` / `.quiet` links and `bdi.num` runs (boards 20–23): the
/// sentence comes from an ARB string whose placeholders were filled with `{name}` tokens, and
/// each token is replaced by its [parts] entry. A part with `onTap` is a link in `accentInk`
/// (its own semantics node): an underlined `a` or a `.quiet` one at 500. One with `number: true`
/// is the number at 500, tabular, always left to right. Unknown tokens stay as they are.
class LinkedText extends StatefulWidget {
  const LinkedText(
    this.template, {
    super.key,
    required this.parts,
    this.style,
    this.textAlign = TextAlign.start,
  });

  final String template;
  final Map<String, InlinePart> parts;
  final TextStyle? style;
  final TextAlign textAlign;

  /// A plain `a`: underlined, regular weight.
  static InlinePart link(String text, VoidCallback? onTap) =>
      (text: text, onTap: onTap, number: false, underline: true, quiet: false);

  /// A `.quiet` button or link: weight 500, [underline] only where the board's `a` keeps it.
  static InlinePart quiet(
    String text,
    VoidCallback? onTap, {
    bool underline = false,
  }) => (
    text: text,
    onTap: onTap,
    number: false,
    underline: underline,
    quiet: true,
  );

  /// A phone number part.
  static InlinePart number(String text) =>
      (text: text, onTap: null, number: true, underline: false, quiet: false);

  @override
  State<LinkedText> createState() => _LinkedTextState();
}

class _LinkedTextState extends State<LinkedText> {
  final _recognizers = <TapGestureRecognizer>[];

  void _clear() {
    for (final r in _recognizers) {
      r.dispose();
    }
    _recognizers.clear();
  }

  @override
  void dispose() {
    _clear();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    _clear();
    final c = context.colors;
    final base = widget.style ?? DefaultTextStyle.of(context).style;
    final spans = <InlineSpan>[];
    final token = RegExp(r'\{(\w+)\}');
    var at = 0;
    for (final m in token.allMatches(widget.template)) {
      final part = widget.parts[m.group(1)];
      if (part == null) continue;
      if (m.start > at) {
        spans.add(TextSpan(text: widget.template.substring(at, m.start)));
      }
      at = m.end;
      if (part.number) {
        // U+2066 … U+2069 isolate the number left to right, like `<bdi>`.
        spans.add(
          TextSpan(
            text: '\u2066${part.text}\u2069',
            style: ShootType.num(const TextStyle(fontWeight: FontWeight.w500)),
          ),
        );
      } else {
        final onTap = part.onTap;
        final recognizer = onTap == null
            ? null
            : (TapGestureRecognizer()..onTap = onTap);
        if (recognizer != null) _recognizers.add(recognizer);
        spans.add(
          TextSpan(
            // A `.quiet` button is an atomic inline box: it moves to the next line whole.
            text: part.quiet ? part.text.replaceAll(' ', '\u00a0') : part.text,
            semanticsLabel: part.text,
            recognizer: recognizer,
            style: TextStyle(
              color: c.accentInk,
              fontWeight: part.quiet ? FontWeight.w500 : null,
              decoration: part.underline ? TextDecoration.underline : null,
              decorationColor: c.accentInk,
            ),
          ),
        );
      }
    }
    if (at < widget.template.length) {
      spans.add(TextSpan(text: widget.template.substring(at)));
    }
    // The sentence style goes on the Text, not a span: merged there it keeps the theme's font
    // family; on a child span a `fontFamilyFallback` without a family would replace it.
    return Text.rich(
      TextSpan(children: spans),
      style: base,
      textAlign: widget.textAlign,
    );
  }
}
