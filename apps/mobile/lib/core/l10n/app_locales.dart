import 'dart:ui';

import 'package:shoot_mobile/core/l10n/generated/app_localizations.dart';

/// The app's languages. English is the default and the fallback; Arabic is
/// right-to-left. The list itself comes from the ARB files.
abstract final class AppLocales {
  static const english = Locale('en');
  static const arabic = Locale('ar');
  static const fallback = english;

  static List<Locale> get supported => AppLocalizations.supportedLocales;

  /// Picks the first supported language from the device's preferences,
  /// matching on language code only (so `ar-AE` resolves to `ar`).
  static Locale resolve(List<Locale>? preferred) {
    for (final locale in preferred ?? const <Locale>[]) {
      for (final candidate in supported) {
        if (candidate.languageCode == locale.languageCode) return candidate;
      }
    }
    return fallback;
  }
}
