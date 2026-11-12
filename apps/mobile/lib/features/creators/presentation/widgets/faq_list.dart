import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/content/rich_text.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/shoot_icon.dart';

/// The questions of a hire page as expandable rows (board 19's `details`): one open at a time,
/// the open state announced, and tapping the open one closes it (MC-US5-S4).
class FaqList extends StatelessWidget {
  const FaqList({
    super.key,
    required this.items,
    required this.expanded,
    required this.onToggle,
  });

  final List<FaqItem> items;
  final int? expanded;
  final void Function(int index) onToggle;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final l10n = context.l10n;
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: c.hair)),
      ),
      child: Column(
        children: [
          for (var i = 0; i < items.length; i++)
            DecoratedBox(
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: c.hair)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Semantics(
                    button: true,
                    expanded: expanded == i,
                    label: items[i].question,
                    value: expanded == i ? l10n.mcExpanded : l10n.mcCollapsed,
                    onTap: () => onToggle(i),
                    excludeSemantics: true,
                    child: GestureDetector(
                      onTap: () => onToggle(i),
                      behavior: HitTestBehavior.opaque,
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(minHeight: 52),
                        child: Row(
                          spacing: 12,
                          children: [
                            Expanded(
                              child: Text(
                                items[i].question,
                                style: ShootType.row.copyWith(
                                  color: c.ink,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                            AnimatedRotation(
                              turns: expanded == i ? .5 : 0,
                              duration: MediaQuery.disableAnimationsOf(context)
                                  ? Duration.zero
                                  : const Duration(milliseconds: 180),
                              child: ShootIcon(
                                ShootIcons.chevronDown,
                                color: c.mute,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  if (expanded == i)
                    Padding(
                      padding: const EdgeInsetsDirectional.only(bottom: 14),
                      child: Text(
                        faqAnswerText(items[i].answer),
                        style: ShootType.body.copyWith(color: c.bodyInk),
                      ),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

/// The answer's paragraphs as plain text (an answer is "plain sentences", board 19).
String faqAnswerText(RichTextDocument answer) {
  String inline(RichInline i) => switch (i) {
    TextInline(:final text) => text,
    LinkInline(:final children) => children.map((c) => c.text).join(),
    LineBreakInline() => '\n',
    UnknownInline() => '',
  };
  return [
    for (final block in answer.nodes)
      if (block is ParagraphBlock) block.children.map(inline).join(),
  ].where((s) => s.isNotEmpty).join('\n\n');
}
