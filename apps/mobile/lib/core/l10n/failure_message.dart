import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/l10n/generated/app_localizations.dart';

/// The one place a [Failure] becomes words. Features may add their own,
/// more specific messages before falling back to these.
extension FailureMessageX on Failure {
  String message(AppLocalizations l10n) {
    return switch (this) {
      NetworkFailure() => l10n.failureNetwork,
      ServerFailure() => l10n.failureServer,
      UnexpectedFailure() => l10n.failureUnexpected,
    };
  }
}
