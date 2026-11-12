import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';

import '../../helpers/auth_fixtures.dart';
import '../../helpers/in_memory_preferences_store.dart';

class _ThrowingStorage extends Mock implements FlutterSecureStorage {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  final session = exampleSession(exp: DateTime.utc(2026, 12, 21));

  group('MemorySessionStore', () {
    test('round-trips a session', () async {
      final store = MemorySessionStore();
      expect(await store.read(), isNull);
      await store.write(session);
      expect(await store.read(), session);
      await store.clear();
      expect(await store.read(), isNull);
    });

    test('an unparsable value reads as signed out and is deleted', () async {
      final store = MemorySessionStore('{"token": 1}');
      expect(await store.read(), isNull);
      expect(store.raw, isNull);
      store.raw = 'not json';
      expect(await store.read(), isNull);
      expect(store.raw, isNull);
    });

    test('keeps no phone number on the device', () async {
      final store = MemorySessionStore();
      await store.write(session);
      expect(store.raw, isNot(contains('+971')));
      expect((jsonDecode(store.raw!) as Map)['user'], {
        'id': '42',
        'name': null,
        'accountType': 'provider',
      });
    });
  });

  group('SecureSessionStore', () {
    test('round-trips under session.v1', () async {
      FlutterSecureStorage.setMockInitialValues({});
      final prefs = InMemoryPreferencesStore({
        PreferenceKeys.installSeen: 'true',
      });
      final store = SecureSessionStore(prefs);
      await store.init();
      await store.write(session);
      expect(await store.read(), session);
      expect(
        await const FlutterSecureStorage().read(key: SecureSessionStore.key),
        isNotNull,
      );
    });

    test(
      'OT-US3-S5 the first launch after install wipes the secure store',
      () async {
        // The Keychain kept a session from before an uninstall; the preferences did not survive.
        FlutterSecureStorage.setMockInitialValues({
          SecureSessionStore.key: jsonEncode(session.toJson()),
        });
        final prefs = InMemoryPreferencesStore();
        final store = SecureSessionStore(prefs);

        await store.init();

        expect(await store.read(), isNull);
        expect(prefs.values[PreferenceKeys.installSeen], 'true');
      },
    );

    test('OT-US3-S5 with install.seen present the session is kept', () async {
      FlutterSecureStorage.setMockInitialValues({
        SecureSessionStore.key: jsonEncode(session.toJson()),
      });
      final prefs = InMemoryPreferencesStore({
        PreferenceKeys.installSeen: 'true',
      });
      final store = SecureSessionStore(prefs);

      await store.init();

      expect(await store.read(), session);
    });

    test('OT-US3-S5 a read exception wipes and reads as signed out', () async {
      final storage = _ThrowingStorage();
      when(() => storage.read(key: SecureSessionStore.key))
          .thenThrow(Exception('restored device'));
      when(() => storage.delete(key: SecureSessionStore.key))
          .thenAnswer((_) async {});
      final store = SecureSessionStore(
        InMemoryPreferencesStore({PreferenceKeys.installSeen: 'true'}),
        storage: storage,
      );

      expect(await store.read(), isNull);
      verify(() => storage.delete(key: SecureSessionStore.key)).called(1);
    });

    test('an unparsable stored value is deleted', () async {
      FlutterSecureStorage.setMockInitialValues({
        SecureSessionStore.key: '[1, 2]',
      });
      final store = SecureSessionStore(
        InMemoryPreferencesStore({PreferenceKeys.installSeen: 'true'}),
      );
      expect(await store.read(), isNull);
      expect(
        await const FlutterSecureStorage().read(key: SecureSessionStore.key),
        isNull,
      );
    });

    test('failing writes and deletes never throw', () async {
      final storage = _ThrowingStorage();
      when(
        () => storage.write(
          key: any(named: 'key'),
          value: any(named: 'value'),
        ),
      ).thenThrow(Exception('full'));
      when(() => storage.delete(key: any(named: 'key')))
          .thenThrow(Exception('locked'));
      final store = SecureSessionStore(
        InMemoryPreferencesStore(),
        storage: storage,
      );
      await store.write(session);
      await store.clear();
    });

    test('install.seen is a saved preference key', () {
      expect(PreferenceKeys.all, contains(PreferenceKeys.installSeen));
    });
  });
}
