import 'dart:async';
import 'dart:math';

import 'package:shoot_mobile/core/preferences/preferences_store.dart';

/// The anonymous install id: 32 lower-case hex characters (128 random bits),
/// created on first launch and kept under [PreferenceKeys.installId].
///
/// It is sent as `X-Shoot-Install` so the server counts limits and duplicate
/// briefs per install rather than per carrier address. It is not a secret and
/// not an identity, and it is never logged.
///
/// A failed write keeps the id for the session; an unreadable or malformed
/// saved value is replaced by a new one.
final class InstallIdStore {
  InstallIdStore(this._store, {Random? random})
    : _random = random ?? Random.secure();

  static final _valid = RegExp(r'^[0-9a-f]{32}$');

  final PreferencesStore _store;
  final Random _random;
  String? _id;

  /// The id, created and saved on the first call.
  String id() {
    final known = _id;
    if (known != null) return known;

    final saved = _store.readString(PreferenceKeys.installId);
    if (saved != null && _valid.hasMatch(saved)) return _id = saved;

    final created = _generate();
    _id = created;
    // Writes never throw (PreferencesStore); a failure keeps the session id.
    unawaited(_store.writeString(PreferenceKeys.installId, created));
    return created;
  }

  String _generate() {
    final buffer = StringBuffer();
    for (var i = 0; i < 16; i++) {
      buffer.write(_random.nextInt(256).toRadixString(16).padLeft(2, '0'));
    }
    return buffer.toString();
  }
}
