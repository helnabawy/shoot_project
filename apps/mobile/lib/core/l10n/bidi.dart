import 'package:flutter/widgets.dart';

/// The direction of [text]'s first strong character: Arabic script reads right to left, Latin left
/// to right; `null` when it has neither (digits, punctuation).
TextDirection? firstStrongDirection(String text) {
  for (final r in text.runes) {
    if ((r >= 0x0590 && r <= 0x08FF) || (r >= 0xFB1D && r <= 0xFEFC)) {
      return TextDirection.rtl;
    }
    if ((r >= 0x41 && r <= 0x5A) ||
        (r >= 0x61 && r <= 0x7A) ||
        (r >= 0xC0 && r <= 0x24F)) {
      return TextDirection.ltr;
    }
  }
  return null;
}

/// [text] wrapped in a first-strong isolate (U+2068 to U+2069) when its own direction differs from
/// the screen's, so a Latin name or phrase inside Arabic keeps its order: "Omar K." never becomes
/// ".Omar K", and "4 hours, Dubai" never becomes "hours, Dubai 4". Use it for every data string a
/// widget shows; the English fallback means Latin text reaches the Arabic interface.
String isolate(BuildContext context, String text) {
  final own = firstStrongDirection(text);
  if (own == null || own == Directionality.of(context)) return text;
  return '\u2068$text\u2069';
}
