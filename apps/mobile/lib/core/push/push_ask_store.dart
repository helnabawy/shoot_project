import 'package:shoot_mobile/core/preferences/preferences_store.dart';
import 'package:shoot_mobile/core/push/push_service.dart';

/// Remembers on this device that the push reason sheet was shown (asked once, US6-S1).
final class PreferencesPushAskStore implements PushAskStore {
  const PreferencesPushAskStore(this._store);

  final PreferencesStore _store;

  @override
  bool get asked => _store.readString(PreferenceKeys.pushAsked) == 'true';

  @override
  Future<void> markAsked() =>
      _store.writeString(PreferenceKeys.pushAsked, 'true');
}
