import 'dart:async';

import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';

/// The accent colour the person picked, saved on the device. Blue when
/// nothing is saved or the saved id is unknown (FR-011).
class AccentCubit extends Cubit<ShootAccent> {
  AccentCubit(this._store)
    : super(
        ShootAccent.fromId(_store.readString(PreferenceKeys.accent)) ??
            ShootAccent.fallback,
      );

  final PreferencesStore _store;

  /// Applies [accent] at once, then saves it without waiting (FR-012).
  void select(ShootAccent accent) {
    if (accent == state) return;
    emit(accent);
    unawaited(_store.writeString(PreferenceKeys.accent, accent.id));
  }
}
