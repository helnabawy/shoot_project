import 'package:flutter/material.dart';
import 'package:shoot_mobile/core/l10n/bidi.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_tokens.dart';
import 'package:shoot_mobile/core/theme/shoot_type.dart';
import 'package:shoot_mobile/core/widgets/money.dart';

/// One priced line of a quotation.
typedef QuoteLine = ({String label, String? detail, num amount});

/// `.ln` / `.tot`: quotation lines. Each line: min 44, padding 8 0, 16/1.375, a `hair` between
/// lines, the label with an optional `meta` detail and the amount at the end. The total sits under
/// a 2 px `ink` rule, at 500. Each line is read as one sentence.
class QuoteLines extends StatelessWidget {
  const QuoteLines({
    super.key,
    required this.lines,
    required this.totalLabel,
    required this.total,
    this.totalNote,
  });

  final List<QuoteLine> lines;
  final String totalLabel;
  final num total;

  /// Under the total ("VAT not applicable").
  final String? totalNote;

  @override
  Widget build(BuildContext context) {
    final c = context.colors;
    final text = ShootType.row.copyWith(color: c.ink, height: 1.375);
    final meta = ShootType.meta.copyWith(color: c.mute);
    Widget line(
      String label,
      String? detail,
      num amount, {
      bool total = false,
    }) => MergeSemantics(
      child: Container(
        constraints: const BoxConstraints(minHeight: ShootSize.rowHeight),
        padding: total
            ? const EdgeInsetsDirectional.only(top: 12, bottom: 8)
            : const EdgeInsetsDirectional.symmetric(vertical: 8),
        child: Row(
          crossAxisAlignment: total
              ? CrossAxisAlignment.start
              : CrossAxisAlignment.center,
          spacing: ShootSpace.s3,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                spacing: 2,
                children: [
                  Text(
                    isolate(context, label),
                    style: total
                        ? text.copyWith(fontWeight: FontWeight.w500)
                        : text,
                  ),
                  if (detail case final d?)
                    Text(isolate(context, d), style: meta),
                ],
              ),
            ),
            Money(
              amount: amount,
              style: total ? text.copyWith(fontWeight: FontWeight.w500) : text,
            ),
          ],
        ),
      ),
    );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final (i, l) in lines.indexed) ...[
          if (i > 0) Divider(height: 1, thickness: 1, color: c.hair),
          line(l.label, l.detail, l.amount),
        ],
        Padding(
          padding: const EdgeInsetsDirectional.only(top: 4),
          child: DecoratedBox(
            decoration: BoxDecoration(
              border: Border(top: BorderSide(color: c.ink, width: 2)),
            ),
            child: line(totalLabel, totalNote, total, total: true),
          ),
        ),
      ],
    );
  }
}
