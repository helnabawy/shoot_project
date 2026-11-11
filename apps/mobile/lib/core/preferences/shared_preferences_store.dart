import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';

/// [PreferencesStore] over the platform's key-value store (NSUserDefaults on
/// iOS, SharedPreferences on Android), cached in memory for synchronous reads.
///
/// The cache holds only the keys in [PreferenceKeys]; any other key reads as
/// nothing and is never written.
class SharedPreferencesStore implements PreferencesStore {
  SharedPreferencesStore(this._prefs);

  final SharedPreferencesWithCache _prefs;

  /// Loads the saved values. Call once in `main()` before `runApp`.
  static Future<SharedPreferencesStore> open() async {
    final prefs = await SharedPreferencesWithCache.create(
      cacheOptions: const SharedPreferencesWithCacheOptions(
        allowList: PreferenceKeys.all,
      ),
    );
    return SharedPreferencesStore(prefs);
  }

  @override
  String? readString(String key) {
    try {
      return _prefs.getString(key);
    } on Object catch (error) {
      _log('read $key', error);
      return null;
    }
  }

  @override
  Future<void> writeString(String key, String value) async {
    try {
      await _prefs.setString(key, value);
    } on Object catch (error) {
      _log('write $key', error);
    }
  }

  @override
  Future<void> remove(String key) async {
    try {
      await _prefs.remove(key);
    } on Object catch (error) {
      _log('remove $key', error);
    }
  }

  void _log(String what, Object error) {
    if (kDebugMode) debugPrint('PreferencesStore: could not $what: $error');
  }
}
