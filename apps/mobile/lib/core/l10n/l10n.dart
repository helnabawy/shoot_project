import 'package:flutter/widgets.dart';
import 'package:shoot_mobile/core/l10n/generated/app_localizations.dart';

export 'package:shoot_mobile/core/l10n/generated/app_localizations.dart';

/// `context.l10n.appTitle` instead of `AppLocalizations.of(context).appTitle`.
extension L10nX on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
}
