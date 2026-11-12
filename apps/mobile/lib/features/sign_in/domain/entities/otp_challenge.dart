import 'package:equatable/equatable.dart';

/// How the code travels (`otpChannelV1`).
enum OtpChannel {
  sms,
  whatsapp;

  OtpChannel get other => this == sms ? whatsapp : sms;
}

/// A code on its way (`otpChallengeV1`). [expiresAt] and [resendAt] are the
/// server's times; [skew] is how far the device clock is ahead of the server's
/// (device time at receipt minus the answer's `Date` header), so countdowns
/// read `resendAt + skew - now` on the device clock (research R14).
final class OtpChallenge extends Equatable {
  const OtpChallenge({
    required this.challengeId,
    required this.channel,
    required this.phone,
    required this.expiresAt,
    required this.resendAt,
    this.skew = Duration.zero,
  });

  final String challengeId;
  final OtpChannel channel;

  /// The normalised number (E.164) the code was sent to.
  final String phone;
  final DateTime expiresAt;
  final DateTime resendAt;
  final Duration skew;

  @override
  List<Object?> get props => [
    challengeId,
    channel,
    phone,
    expiresAt,
    resendAt,
    skew,
  ];
}
