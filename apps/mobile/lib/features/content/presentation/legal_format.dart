import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';
import 'package:shoot_mobile/core/time/clock.dart';

/// A legal date as the board writes it ("1 November"), with the year when it is not this year, in the
/// app's language. Digits are Western in both languages, as everywhere in the app. Effective dates
/// are dates, so the UTC day is shown.
String legalDate(BuildContext context, DateTime instant, Clock clock) {
  final locale = Localizations.localeOf(context).languageCode;
  final day = instant.toUtc();
  final sameYear = day.year == clock.now().toUtc().year;
  final format = sameYear
      ? DateFormat('d MMMM', locale)
      : DateFormat('d MMMM y', locale);
  return _westernDigits(format.format(day));
}

String _westernDigits(String text) {
  final out = StringBuffer();
  for (final rune in text.runes) {
    // Arabic-Indic (U+0660 to U+0669) and extended (U+06F0 to U+06F9) digits.
    if (rune >= 0x0660 && rune <= 0x0669) {
      out.writeCharCode(0x30 + rune - 0x0660);
    } else if (rune >= 0x06F0 && rune <= 0x06F9) {
      out.writeCharCode(0x30 + rune - 0x06F0);
    } else {
      out.writeCharCode(rune);
    }
  }
  return out.toString();
}
