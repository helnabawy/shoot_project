import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences_platform_interface/in_memory_shared_preferences_async.dart';
import 'package:shared_preferences_platform_interface/shared_preferences_async_platform_interface.dart';
import 'package:shared_preferences_platform_interface/types.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';
import 'package:shoot_mobile/core/preferences/shared_preferences_store.dart';

/// A platform whose writes always fail, like a full disk.
base class _FailingWrites extends InMemorySharedPreferencesAsync {
  _FailingWrites() : super.empty();

  @override
  Future<bool> setString(
    String key,
    String value,
    SharedPreferencesOptions options,
  ) => throw StateError('disk full');

  @override
  Future<bool> clear(
    ClearPreferencesParameters parameters,
    SharedPreferencesOptions options,
  ) => throw StateError('disk full');
}

void main() {
  void usePlatform(Map<String, Object> data) {
    SharedPreferencesAsyncPlatform.instance =
        InMemorySharedPreferencesAsync.withData(data);
  }

  setUp(() => usePlatform({}));

  test('a missing key reads as nothing', () async {
    final store = await SharedPreferencesStore.open();
    expect(store.readString(PreferenceKeys.accent), isNull);
  });

  test('a value of the wrong type reads as nothing and never throws', () async {
    usePlatform({PreferenceKeys.accent: 42, PreferenceKeys.themeMode: true});
    final store = await SharedPreferencesStore.open();
    expect(store.readString(PreferenceKeys.accent), isNull);
    expect(store.readString(PreferenceKeys.themeMode), isNull);
  });

  test('writeString then readString round-trips', () async {
    final store = await SharedPreferencesStore.open();
    await store.writeString(PreferenceKeys.accent, 'violet');
    expect(store.readString(PreferenceKeys.accent), 'violet');
  });

  test('a saved value is read back by a new store (the next launch)', () async {
    final first = await SharedPreferencesStore.open();
    await first.writeString(PreferenceKeys.locale, 'ar');
    final second = await SharedPreferencesStore.open();
    expect(second.readString(PreferenceKeys.locale), 'ar');
  });

  test('remove clears the key', () async {
    usePlatform({PreferenceKeys.locale: 'ar'});
    final store = await SharedPreferencesStore.open();
    expect(store.readString(PreferenceKeys.locale), 'ar');
    await store.remove(PreferenceKeys.locale);
    expect(store.readString(PreferenceKeys.locale), isNull);
  });

  test('keys outside PreferenceKeys are not cached or readable', () async {
    usePlatform({'other.key': 'secret', PreferenceKeys.accent: 'teal'});
    final store = await SharedPreferencesStore.open();
    expect(store.readString('other.key'), isNull);
    expect(store.readString(PreferenceKeys.accent), 'teal');
    // Writing one is swallowed too, and does not reach the cache.
    await store.writeString('other.key', 'x');
    expect(store.readString('other.key'), isNull);
  });

  test('a failing write completes without throwing', () async {
    SharedPreferencesAsyncPlatform.instance = _FailingWrites();
    final store = await SharedPreferencesStore.open();
    await store.writeString(PreferenceKeys.accent, 'violet');
    await store.remove(PreferenceKeys.accent);
  });

  test('the three keys are the on-device data format', () {
    expect(PreferenceKeys.accent, 'appearance.accent');
    expect(PreferenceKeys.themeMode, 'appearance.themeMode');
    expect(PreferenceKeys.locale, 'appearance.locale');
  });
}
