import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/content_icons.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/guide_row.dart';
import 'package:shoot_mobile/features/content/presentation/widgets/rich_text_view.dart';

/// The numbered steps of a steps section (board 35's `ol`): a 30 px number tile, the step's title
/// at 17/600 and its text, between hairlines.
class StepsList extends StatelessWidget {
  const StepsList({super.key, required this.steps});

  final List<HowItWorksStep> steps;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      container: true,
      explicitChildNodes: true,
      child: HairlineList(
        rows: [
          for (final (i, step) in steps.indexed)
            Padding(
              padding: const EdgeInsetsDirectional.symmetric(vertical: 14),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  ExcludeSemantics(
                    child: Container(
                      width: 30,
                      height: 30,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: c.ink,
                        borderRadius: BorderRadius.circular(ShootRadius.tile),
                      ),
                      child: Text(
                        '${i + 1}',
                        style: ShootType.num(
                          ShootType.body.copyWith(
                            fontWeight: FontWeight.w600,
                            height: 1,
                            color: c.ground,
                          ),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Semantics(
                      container: true,
                      label: ['${i + 1}. ${step.title}', ?step.body].join('. '),
                      excludeSemantics: true,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        spacing: ShootSpace.s1,
                        children: [
                          Text(
                            step.title,
                            style: ShootType.action.copyWith(
                              height: 1.3,
                              color: c.ink,
                            ),
                          ),
                          if (step.body case final text?)
                            Text(
                              text,
                              style: ShootType.body.copyWith(color: c.bodyInk),
                            ),
                        ],
                      ),
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

/// A questions section (board 35): a heading, then each question as a row that opens its answer
/// below it. The first answer starts open, as on the board; the state is announced as expanded.
class FaqList extends StatefulWidget {
  const FaqList({
    super.key,
    required this.heading,
    required this.items,
    required this.onLink,
    this.initiallyOpen = 0,
  });

  final String heading;
  final List<FaqItem> items;
  final void Function(String href) onLink;

  /// Index of the answer open at first, or -1 for none.
  final int initiallyOpen;

  @override
  State<FaqList> createState() => _FaqListState();
}

class _FaqListState extends State<FaqList> {
  late final Set<int> _open = {
    if (widget.initiallyOpen >= 0) widget.initiallyOpen,
  };

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final hair = BorderSide(color: c.hair);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          header: true,
          child: Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Text(
              widget.heading,
              style: ShootType.heading.copyWith(color: c.ink),
            ),
          ),
        ),
        // A Container pads by its border, as CSS borders add to the box.
        // ignore: use_decorated_box
        Container(
          decoration: BoxDecoration(border: Border(bottom: hair)),
          child: Column(
            children: [
              for (final (i, item) in widget.items.indexed)
                // ignore: use_decorated_box
                Container(
                  decoration: BoxDecoration(border: Border(top: hair)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _Question(
                        text: item.question,
                        open: _open.contains(i),
                        onTap: () => setState(
                          () => _open.contains(i)
                              ? _open.remove(i)
                              : _open.add(i),
                        ),
                      ),
                      if (_open.contains(i))
                        Padding(
                          padding: const EdgeInsetsDirectional.only(bottom: 14),
                          child: RichTextView(
                            document: item.answer,
                            onLink: widget.onLink,
                            fontSize: 15,
                            gap: ShootSpace.s2,
                          ),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Question extends StatelessWidget {
  const _Question({
    required this.text,
    required this.open,
    required this.onTap,
  });

  final String text;
  final bool open;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    return Semantics(
      button: true,
      expanded: open,
      label: text,
      onTap: onTap,
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        highlightColor: c.selectedHover,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 52),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  text,
                  style: ShootType.row.copyWith(
                    fontWeight: FontWeight.w500,
                    color: c.ink,
                  ),
                ),
              ),
              const SizedBox(width: ShootSpace.s3),
              ContentIcon(ContentIcons.chevronDown, color: c.mute),
            ],
          ),
        ),
      ),
    );
  }
}
