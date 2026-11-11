import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';

/// Light, dark or follow the device (the default, as on the web), saved on the
/// device. Anything unreadable or unknown follows the device.
class ThemeModeCubit extends Cubit<ThemeMode> {
  ThemeModeCubit(this._store)
    : super(_read(_store.readString(PreferenceKeys.themeMode)));

  final PreferencesStore _store;

  static ThemeMode _read(String? saved) {
    for (final mode in ThemeMode.values) {
      if (mode.name == saved) return mode;
    }
    return ThemeMode.system;
  }

  /// Applies [mode] at once, then saves it without waiting.
  void select(ThemeMode mode) {
    if (mode == state) return;
    emit(mode);
    unawaited(_store.writeString(PreferenceKeys.themeMode, mode.name));
  }
}
