/// WhatsApp chat addresses for the business number from site settings (feature 010, FR-043).
///
/// [native] opens the WhatsApp app; [web] is WhatsApp's web address, the fallback when the app is
/// not installed. The number is E.164 (`+971501234567`); only its digits go in the address.
abstract final class WhatsappLink {
  static String _digits(String number) => number.replaceAll(RegExp(r'\D'), '');

  static Uri native(String number, {String? message}) => Uri(
    scheme: 'whatsapp',
    host: 'send',
    queryParameters: {
      'phone': _digits(number),
      if (message != null && message.isNotEmpty) 'text': message,
    },
  );

  static Uri web(String number, {String? message}) => Uri(
    scheme: 'https',
    host: 'wa.me',
    path: _digits(number),
    queryParameters: {
      if (message != null && message.isNotEmpty) 'text': message,
    },
  );
}
