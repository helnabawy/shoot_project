import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/install/install_id_store.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';

import '../../helpers/in_memory_preferences_store.dart';

final _hex32 = RegExp(r'^[0-9a-f]{32}$');

void main() {
  group('MR-US2-S8 install id', () {
    test(
      'the first call creates 32 lower-case hex characters and saves it',
      () {
        final prefs = InMemoryPreferencesStore();
        final id = InstallIdStore(prefs).id();

        expect(id, matches(_hex32));
        expect(prefs.values[PreferenceKeys.installId], id);
      },
    );

    test('a new store instance over the same storage returns the same id', () {
      final prefs = InMemoryPreferencesStore();
      final first = InstallIdStore(prefs).id();

      expect(InstallIdStore(prefs).id(), first);
      expect(prefs.writes, hasLength(1));
    });

    test('repeated calls return the same id without writing again', () {
      final prefs = InMemoryPreferencesStore();
      final store = InstallIdStore(prefs);

      expect(store.id(), store.id());
      expect(prefs.writes, hasLength(1));
    });

    test('a failed write keeps the id for the session', () {
      final prefs = InMemoryPreferencesStore()..failWrites = true;
      final store = InstallIdStore(prefs);
      final id = store.id();

      expect(id, matches(_hex32));
      expect(store.id(), id);
      expect(prefs.values, isEmpty);
    });

    test('an unreadable store gives a new id for the session', () {
      final prefs = InMemoryPreferencesStore({
        PreferenceKeys.installId: '0123456789abcdef0123456789abcdef',
      })..failReads = true;
      final store = InstallIdStore(prefs);

      expect(store.id(), isNot('0123456789abcdef0123456789abcdef'));
      expect(store.id(), matches(_hex32));
    });

    test('a malformed saved value is replaced', () {
      final prefs = InMemoryPreferencesStore({
        PreferenceKeys.installId: 'NOT-A-VALID-ID',
      });
      final id = InstallIdStore(prefs).id();

      expect(id, matches(_hex32));
      expect(prefs.values[PreferenceKeys.installId], id);
    });

    test('two fresh stores give different ids', () {
      final a = InstallIdStore(InMemoryPreferencesStore()).id();
      final b = InstallIdStore(InMemoryPreferencesStore()).id();

      expect(a, isNot(b));
    });

    test('the key is kept by the device store', () {
      expect(PreferenceKeys.installId, 'install.id');
      expect(PreferenceKeys.all, contains(PreferenceKeys.installId));
    });
  });
}
