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
  unexpected('api.errors.unexpected');

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

  String message(AppLocalizations l10n) {
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
    };
  }
}

/// The one place a [Failure] becomes words. Features may add their own,
/// more specific messages before falling back to these.
extension FailureMessageX on Failure {
  String message(AppLocalizations l10n) {
    return switch (this) {
      NetworkFailure() => l10n.failureNetwork,
      ServerFailure(:final code) =>
        ProblemCode.fromWire(code)?.message(l10n) ?? l10n.failureServer,
      NotFoundFailure() => l10n.problemNotFound,
      UnexpectedFailure() => l10n.failureUnexpected,
    };
  }
}
