import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/sign_in/domain/entities/otp_challenge.dart';

/// The "Resend code in 0:42" countdown, a pure rule shared by the sign-in
/// flow and Quick Match (012). It counts down from the server's `resendAt`
/// corrected by the challenge's clock skew, on the injected [Clock].
final class ResendTimer {
  const ResendTimer(this.challenge, this.clock);

  final OtpChallenge challenge;
  final Clock clock;

  /// Time left before another code may be asked for; never negative.
  Duration get remaining {
    final left = challenge.resendAt.add(challenge.skew).difference(clock.now());
    return left.isNegative ? Duration.zero : left;
  }

  bool get canResend => remaining == Duration.zero;

  /// Whether the code itself has expired (device clock, corrected).
  bool get expired =>
      !challenge.expiresAt.add(challenge.skew).isAfter(clock.now());

  /// `0:42`, `1:00`; whole seconds rounded up so the display never shows
  /// 0:00 while waiting.
  String get label => formatCountdown(remaining);
}

/// `m:ss`, seconds rounded up.
String formatCountdown(Duration d) {
  final seconds = (d.inMilliseconds / 1000).ceil();
  final m = seconds ~/ 60;
  final s = seconds % 60;
  return '$m:${s.toString().padLeft(2, '0')}';
}
