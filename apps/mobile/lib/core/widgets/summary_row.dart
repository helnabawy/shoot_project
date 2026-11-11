import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/l10n/bidi.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// `.srow`: a read-only line in a summary panel. Min-height 44, padding 4 8, gap 12, 15 px; an
/// optional [leading] tile and a trailing [value].
class SummaryRow extends StatelessWidget {
  const SummaryRow({super.key, required this.label, this.leading, this.value});

  final String label;
  final Widget? leading;
  final String? value;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final style = ShootType.chip.copyWith(color: c.ink, height: 1.3);
    return MergeSemantics(
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: ShootSize.rowHeight),
        child: Padding(
          padding: const EdgeInsetsDirectional.symmetric(
            horizontal: ShootSpace.s2,
            vertical: ShootSpace.s1,
          ),
          child: Row(
            children: [
              if (leading case final l?) ...[
                l,
                const SizedBox(width: ShootSpace.s3),
              ],
              Expanded(child: Text(isolate(context, label), style: style)),
              if (value case final v?) ...[
                const SizedBox(width: ShootSpace.s3),
                Text(v, style: ShootType.num(style)),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
