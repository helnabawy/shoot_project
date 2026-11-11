import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/text_link.dart';

/// One block of CMS rich text (guides, pages, legal; boards 34–36). The API sends a plain node
/// list; the app never parses HTML.
sealed class RichNode {
  const RichNode();
}

final class RichParagraph extends RichNode {
  const RichParagraph(this.text);
  final String text;
}

/// Level 2 is a `title`, level 3 a `heading`.
final class RichHeading extends RichNode {
  const RichHeading(this.text, {this.level = 2});
  final String text;
  final int level;
}

final class RichList extends RichNode {
  const RichList(this.items, {this.ordered = false});
  final List<String> items;
  final bool ordered;
}

final class RichLink extends RichNode {
  const RichLink(this.text, this.onTap);
  final String text;
  final VoidCallback onTap;
}

final class RichQuote extends RichNode {
  const RichQuote(this.text);
  final String text;
}

/// Renders [nodes] with the board type: paragraphs in `body`/`bodyInk`, headings as headers,
/// lists with their markers at the inline start, links in `accentInk`, quotes with a start rule.
class RichContent extends StatelessWidget {
  const RichContent({super.key, required this.nodes});

  final List<RichNode> nodes;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final body = ShootType.body.copyWith(color: c.bodyInk);
    Widget node(RichNode n) => switch (n) {
      RichParagraph(:final text) => Text(text, style: body),
      RichHeading(:final text, :final level) => Semantics(
        header: true,
        child: Text(
          text,
          style: (level <= 2 ? ShootType.title : ShootType.heading).copyWith(
            color: c.ink,
          ),
        ),
      ),
      RichList(:final items, :final ordered) => Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        spacing: ShootSpace.s1,
        children: [
          for (final (i, item) in items.indexed)
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: ShootSpace.s6,
                  child: Text(ordered ? '${i + 1}.' : '•', style: body),
                ),
                Expanded(child: Text(item, style: body)),
              ],
            ),
        ],
      ),
      RichLink(:final text, :final onTap) => TextLink(
        label: text,
        onTap: onTap,
        style: body,
      ),
      RichQuote(:final text) => Container(
        padding: const EdgeInsetsDirectional.only(start: ShootSpace.s4),
        decoration: BoxDecoration(
          border: BorderDirectional(start: BorderSide(color: c.hair, width: 3)),
        ),
        child: Text(text, style: body.copyWith(fontStyle: FontStyle.italic)),
      ),
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      spacing: ShootSpace.s4,
      children: [for (final n in nodes) node(n)],
    );
  }
}
