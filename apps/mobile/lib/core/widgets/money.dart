import 'package:flutter/material.dart';
import 'package:intl/intl.dart' show NumberFormat;
import 'package:shoot_mobile/core/theme/shoot_type.dart';

/// `.num` for prices: `AED 950`, grouped, tabular figures, kept left to right inside Arabic text
/// (the designer's Arabic boards keep `AED 950` in Western digits).
class Money extends StatelessWidget {
  const Money({
    super.key,
    required this.amount,
    this.currency = 'AED',
    this.style,
  });

  /// Whole units of [currency].
  final num amount;
  final String currency;
  final TextStyle? style;

  static String format(num amount, {String currency = 'AED'}) =>
      '$currency ${NumberFormat.decimalPattern('en').format(amount)}';

  @override
  Widget build(BuildContext context) => Text(
    format(amount, currency: currency),
    textDirection: TextDirection.ltr,
    softWrap: false,
    style: ShootType.num(style ?? DefaultTextStyle.of(context).style),
  );
}
