/// A UAE mobile number in E.164 (`+9715XXXXXXXX`), or `null`: the Dart twin of
/// `normaliseUaeMobile` in `packages/domain/src/auth/otp.ts`, so a landline or
/// foreign number is refused before anything is sent (OT-US1-S9). The server
/// checks again; the two agree on the shared example (`auth-request.json`).
String? normaliseUaeMobile(String input) {
  final compact = input.trim().replaceAll(RegExp(r'[\s\-().]'), '');
  String candidate;
  if (RegExp(r'^05\d{8}$').hasMatch(compact)) {
    candidate = '+971${compact.substring(1)}';
  } else if (RegExp(r'^5\d{8}$').hasMatch(compact)) {
    candidate = '+971$compact';
  } else if (RegExp(r'^9715\d{8}$').hasMatch(compact)) {
    candidate = '+$compact';
  } else if (compact.startsWith('00')) {
    candidate = '+${compact.substring(2)}';
  } else {
    candidate = compact;
  }
  return RegExp(r'^\+9715\d{8}$').hasMatch(candidate) ? candidate : null;
}

/// `+971501234567` → `+971 50 123 4567`, the way the boards show a number.
/// Anything else is returned unchanged.
String displayUaeMobile(String e164) {
  final match = RegExp(r'^\+971(5\d)(\d{3})(\d{4})$').firstMatch(e164);
  if (match == null) return e164;
  return '+971 ${match[1]} ${match[2]} ${match[3]}';
}
