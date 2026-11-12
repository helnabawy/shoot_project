import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/auth/auth_api.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/time/clock.dart';

import 'api_examples.dart';

/// The time every sign-in test runs at: 18 s after the shared challenge example was sent
/// (`auth-challenge.json`, resend at 06:01:00), so its countdown reads 0:42 as on board 21.
final DateTime examplesNow = DateTime.utc(2026, 12, 14, 6, 0, 18);
final Clock examplesClock = FixedClock(examplesNow);

class MockAuthApi extends Mock implements AuthApi {}

/// The session in `auth-token.json`, with its expiry moved to [exp] (the example's own `exp`
/// is in 2026-12, close to the test clock).
Session exampleSession({DateTime? exp}) {
  final session = Session.fromAuthToken(loadExample('auth-token'));
  return exp == null ? session : session.copyWith(exp: exp);
}
