import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/motion/focus_in.dart';
import 'package:shoot_mobile/core/motion/rise.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// A centred state: a [mark] (usually `IconTile.large`), an optional [meta] line, the [title] and
/// the [body] (15/1.6, `mute`, at most [bodyMaxWidth] wide). Gaps are 8, with 8 more under the mark,
/// as on boards 37 and 39.
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.mark,
    required this.title,
    this.meta,
    this.body,
    this.bodyMaxWidth = 260,
    this.titleKey,
  });

  final Widget mark;
  final String title;
  final String? meta;
  final String? body;
  final double bodyMaxWidth;

  /// The heading's key; screens pass `ValueKey('fidelity:h1')`.
  final Key? titleKey;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    const gap = SizedBox(height: ShootSpace.s2);
    return Column(
      mainAxisSize: MainAxisSize.min,
      // The board's `main.mx`: the mark comes into focus, the rest rise in turn.
      children: stagger([
        FocusIn(child: mark),
        gap,
        if (meta case final m?) ...[
          gap,
          Text(
            m,
            textAlign: TextAlign.center,
            style: ShootType.meta.copyWith(color: c.mute),
          ),
        ],
        gap,
        Semantics(
          header: true,
          child: Text(
            title,
            key: titleKey,
            textAlign: TextAlign.center,
            style: ShootType.title.copyWith(color: c.ink),
          ),
        ),
        if (body case final b?) ...[
          gap,
          ConstrainedBox(
            constraints: BoxConstraints(maxWidth: bodyMaxWidth),
            child: Text(
              b,
              textAlign: TextAlign.center,
              style: ShootType.body.copyWith(color: c.mute),
            ),
          ),
        ],
      ]),
    );
  }
}
