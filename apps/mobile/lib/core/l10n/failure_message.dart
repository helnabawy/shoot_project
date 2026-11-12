import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/l10n/generated/app_localizations.dart';

/// Every problem code API v1 can answer (`PROBLEM_CODES` in
/// `packages/domain/src/api/v1/problems.ts`). A code is a message key; ARB
/// keys cannot contain dots, so each maps to an ARB string here. A code added
/// to v1 after this build reads as `null` and gets the general message.
enum ProblemCode {
  invalidInput('api.errors.invalidInput'),
  invalidField('api.errors.invalidField'),
  localeUnsupported('api.errors.localeUnsupported'),
  notFound('api.errors.notFound'),
  unauthorized('api.errors.unauthorized'),
  tokenInvalid('api.errors.tokenInvalid'),
  rateLimited('api.errors.rateLimited'),
  unexpected('api.errors.unexpected'),
  // 009: sign-in by one-time code (contracts/auth-api.md).
  phoneInvalid('auth.errors.phoneInvalid'),
  tooManyRequests('auth.errors.tooManyRequests'),
  resendTooSoon('auth.errors.resendTooSoon'),
  sendFailed('auth.errors.sendFailed'),
  codeInvalid('auth.errors.codeInvalid'),
  codeExpired('auth.errors.codeExpired'),
  codeLocked('auth.errors.codeLocked'),
  useEmailSignIn('auth.errors.useEmailSignIn'),
  numberTaken('auth.errors.numberTaken'),
  personaRequired('auth.errors.personaRequired'),
  personaInactive('auth.errors.personaInactive'),
  acceptTerms('auth.errors.acceptTerms'),
  // 013: the client account.
  emailInvalid('account.errors.emailInvalid'),
  emailInUse('account.errors.emailInUse'),
  nameLength('account.errors.nameLength');

  const ProblemCode(this.wire);

  /// The code as the server sends it.
  final String wire;

  /// The known code for [wire], or `null` for `null` or an unknown code.
  static ProblemCode? fromWire(String? wire) {
    for (final code in values) {
      if (code.wire == wire) return code;
    }
    return null;
  }

  /// The sentence for this code. [retryAfter] (seconds, from a 429) fills the waits;
  /// [otherChannel] names the channel to try instead after `sendFailed` (WhatsApp when not
  /// given). No message ever contains the person's number (FR-034).
  String message(
    AppLocalizations l10n, {
    int? retryAfter,
    String? otherChannel,
  }) {
    final wait = Duration(seconds: retryAfter ?? 60);
    return switch (this) {
      // The field-level codes share the request-level message.
      invalidInput ||
      invalidField ||
      localeUnsupported => l10n.problemInvalidInput,
      notFound => l10n.problemNotFound,
      unauthorized => l10n.problemUnauthorized,
      tokenInvalid => l10n.problemTokenInvalid,
      rateLimited => l10n.problemRateLimited,
      unexpected => l10n.problemUnexpected,
      phoneInvalid => l10n.problemPhoneInvalid,
      tooManyRequests => l10n.problemTooManyRequests(
        (wait.inSeconds / 60).ceil().clamp(1, 1 << 20),
      ),
      resendTooSoon => l10n.problemResendTooSoon(_minutesSeconds(wait)),
      sendFailed => l10n.problemSendFailed(
        otherChannel ?? l10n.channelWhatsapp,
      ),
      codeInvalid => l10n.problemCodeInvalid,
      codeExpired => l10n.problemCodeExpired,
      codeLocked => l10n.problemCodeLocked,
      useEmailSignIn => l10n.problemUseEmailSignIn,
      numberTaken => l10n.problemNumberTaken,
      personaRequired => l10n.problemPersonaRequired,
      personaInactive => l10n.problemPersonaInactive,
      acceptTerms => l10n.problemAcceptTerms,
      emailInvalid => l10n.problemEmailInvalid,
      emailInUse => l10n.problemEmailInUse,
      nameLength => l10n.problemNameLength,
    };
  }
}

/// `m:ss`, the way the countdowns read.
String _minutesSeconds(Duration d) =>
    '${d.inMinutes}:${(d.inSeconds % 60).toString().padLeft(2, '0')}';

/// The one place a [Failure] becomes words. Features may add their own,
/// more specific messages before falling back to these.
extension FailureMessageX on Failure {
  String message(AppLocalizations l10n) {
    return switch (this) {
      NetworkFailure() => l10n.failureNetwork,
      ServerFailure(:final code, :final retryAfter) =>
        ProblemCode.fromWire(code)?.message(l10n, retryAfter: retryAfter) ??
            l10n.failureServer,
      NotFoundFailure() => l10n.problemNotFound,
      UnexpectedFailure() => l10n.failureUnexpected,
    };
  }
}
