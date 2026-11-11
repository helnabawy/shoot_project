import 'dart:async';
import 'dart:ui';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/l10n/app_locales.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';

/// The language the person picked, or `null` to follow the device. Saved on
/// the device; an unsupported or unreadable value follows the device.
class LocaleCubit extends Cubit<Locale?> {
  LocaleCubit(this._store)
    : super(_read(_store.readString(PreferenceKeys.locale)));

  final PreferencesStore _store;

  static Locale? _read(String? saved) {
    for (final locale in AppLocales.supported) {
      if (locale.languageCode == saved) return locale;
    }
    return null;
  }

  /// Applies [locale] at once, then saves it (or forgets it for `null`).
  void select(Locale? locale) {
    if (locale == state) return;
    emit(locale);
    unawaited(
      locale == null
          ? _store.remove(PreferenceKeys.locale)
          : _store.writeString(PreferenceKeys.locale, locale.languageCode),
    );
  }
}
