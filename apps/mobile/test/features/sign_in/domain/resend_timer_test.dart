import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/sign_in/data/models/otp_models.dart';
import 'package:shoot_mobile/features/sign_in/domain/resend_timer.dart';

import '../../../helpers/api_examples.dart';

void main() {
  final model = OtpChallengeModel.fromJson(loadExample('auth-challenge'));

  group(
    'OT-US1-S7 no resend within 60 s; a new code makes the old one unusable',
    () {
      test(
        'OT-US1-S7 counts down from the server resendAt on the fixed clock',
        () {
          final timer = ResendTimer(
            model.toEntity(),
            FixedClock(DateTime.utc(2026, 12, 14, 6, 0, 18)),
          );
          expect(timer.remaining, const Duration(seconds: 42));
          expect(timer.label, '0:42');
          expect(timer.canResend, isFalse);
          expect(timer.expired, isFalse);
        },
      );

      test('OT-US1-S7 a device clock 30 s ahead of the server is corrected by the Date skew', () {
        // Received at device 06:00:48 while the server said 06:00:18.
        final challenge = model.toEntity(skew: const Duration(seconds: 30));
        final timer = ResendTimer(
          challenge,
          FixedClock(DateTime.utc(2026, 12, 14, 6, 0, 48)),
        );
        expect(timer.label, '0:42');
      });

      test('OT-US1-S7 canResend at zero, never negative', () {
        final at = ResendTimer(
          model.toEntity(),
          FixedClock(DateTime.utc(2026, 12, 14, 6, 1)),
        );
        expect(at.remaining, Duration.zero);
        expect(at.canResend, isTrue);
        final later = ResendTimer(
          model.toEntity(),
          FixedClock(DateTime.utc(2026, 12, 14, 6, 3)),
        );
        expect(later.remaining, Duration.zero);
        expect(later.label, '0:00');
      });

      test('OT-US1-S7 the code expires at expiresAt (device time)', () {
        final timer = ResendTimer(
          model.toEntity(),
          FixedClock(DateTime.utc(2026, 12, 14, 6, 5)),
        );
        expect(timer.expired, isTrue);
      });
    },
  );

  test('formatCountdown rounds seconds up', () {
    expect(formatCountdown(const Duration(milliseconds: 41200)), '0:42');
    expect(formatCountdown(const Duration(seconds: 60)), '1:00');
    expect(formatCountdown(const Duration(minutes: 2, seconds: 5)), '2:05');
  });
}
