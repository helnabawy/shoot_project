import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';

/// Where the session lives on the device (research R14). Every method
/// completes normally: a store that cannot be read is "signed out".
abstract interface class SessionStore {
  /// Runs once before the first read (`main()`, before `runApp`).
  Future<void> init();

  /// The saved session, or `null` when there is none or it cannot be read
  /// (an unreadable value is deleted).
  Future<Session?> read();

  Future<void> write(Session session);

  Future<void> clear();
}

/// [SessionStore] in the iOS Keychain (this device only, after first unlock)
/// and the Android Keystore, as one JSON value under [key].
///
/// The Keychain survives an uninstall, so the first launch of an install
/// (no [PreferenceKeys.installSeen] in the plain preferences, which an
/// uninstall does remove) wipes it first (OT-US3-S5).
final class SecureSessionStore implements SessionStore {
  SecureSessionStore(this._prefs, {FlutterSecureStorage? storage})
    : _storage =
          storage ??
          const FlutterSecureStorage(aOptions: _android, iOptions: _ios);

  static const key = 'session.v1';

  static const _ios = IOSOptions(
    accessibility: KeychainAccessibility.first_unlock_this_device,
  );
  static const _android = AndroidOptions();

  final PreferencesStore _prefs;
  final FlutterSecureStorage _storage;

  @override
  Future<void> init() async {
    if (_prefs.readString(PreferenceKeys.installSeen) == 'true') return;
    await clear();
    await _prefs.writeString(PreferenceKeys.installSeen, 'true');
  }

  @override
  Future<Session?> read() async {
    try {
      final raw = await _storage.read(key: key);
      if (raw == null) return null;
      final decoded = jsonDecode(raw);
      if (decoded is! Map) throw const FormatException('session.v1');
      return Session.fromJson(decoded.cast<String, Object?>());
    } on Object catch (error) {
      // A device restore or a key change makes the value unreadable.
      if (kDebugMode) {
        debugPrint('SessionStore: unreadable (${error.runtimeType})');
      }
      await clear();
      return null;
    }
  }

  @override
  Future<void> write(Session session) async {
    try {
      await _storage.write(key: key, value: jsonEncode(session.toJson()));
    } on Object catch (error) {
      // The session still applies until the app closes.
      if (kDebugMode) {
        debugPrint('SessionStore: write failed (${error.runtimeType})');
      }
    }
  }

  @override
  Future<void> clear() async {
    try {
      await _storage.delete(key: key);
    } on Object catch (error) {
      if (kDebugMode) {
        debugPrint('SessionStore: delete failed (${error.runtimeType})');
      }
    }
  }
}

/// [SessionStore] in memory, for tests and goldens.
final class MemorySessionStore implements SessionStore {
  MemorySessionStore([this.raw]);

  /// The raw saved value, so tests can seed an unparsable one.
  String? raw;

  @override
  Future<void> init() async {}

  @override
  Future<Session?> read() async {
    final value = raw;
    if (value == null) return null;
    try {
      final decoded = jsonDecode(value);
      if (decoded is! Map) throw const FormatException('session.v1');
      return Session.fromJson(decoded.cast<String, Object?>());
    } on FormatException {
      raw = null;
      return null;
    }
  }

  @override
  Future<void> write(Session session) async =>
      raw = jsonEncode(session.toJson());

  @override
  Future<void> clear() async => raw = null;
}
