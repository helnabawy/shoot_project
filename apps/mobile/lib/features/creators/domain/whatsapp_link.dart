/// `https://wa.me/<digits>?text=<message>`, like the website's `buildWhatsAppLink`: [number] is
/// E.164 (`+971501234567`); anything else gives `null`.
Uri? whatsappLink(String number, [String? message]) {
  final digits = RegExp(r'^\+([1-9]\d{7,14})$')
      .firstMatch(number.trim())
      ?.group(1);
  if (digits == null) return null;
  return Uri.https(
    'wa.me',
    '/$digits',
    message == null || message.isEmpty ? null : {'text': message},
  );
}
