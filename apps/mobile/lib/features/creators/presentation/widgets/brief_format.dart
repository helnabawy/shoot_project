import 'package:intl/intl.dart';

/// Today in the business time zone (UAE, UTC+4) as `YYYY-MM-DD`, the website's `todayInZone`.
String briefToday(DateTime now) {
  final uae = now.toUtc().add(const Duration(hours: 4));
  return '${uae.year.toString().padLeft(4, '0')}-'
      '${uae.month.toString().padLeft(2, '0')}-'
      '${uae.day.toString().padLeft(2, '0')}';
}

/// A human date for the brief ("Fri 21 Nov"), the website's `formatBriefDate`; falls back to the
/// ISO text when the date or the language's data cannot be read.
String formatBriefDate(String iso, String languageCode) {
  final date = DateTime.tryParse('${iso}T12:00:00Z');
  if (date == null) return iso;
  try {
    return DateFormat('EEE d MMM', languageCode).format(date);
  } on Object {
    return iso;
  }
}
