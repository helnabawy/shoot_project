import 'package:shoot_mobile/core/preferences/preferences_store.dart';

/// Whether the person has seen the welcome steps (screens 02–04, feature 010), saved on the device
/// so they show once per install. An unreadable value means not seen; a failed write still counts
/// for this session.
class FirstRunStore {
  FirstRunStore(this._store)
    : _seen = _store.readString(PreferenceKeys.welcomeSeen) == 'true';

  final PreferencesStore _store;
  bool _seen;

  bool get welcomeSeen => _seen;

  Future<void> markWelcomeSeen() async {
    _seen = true;
    await _store.writeString(PreferenceKeys.welcomeSeen, 'true');
  }
}
