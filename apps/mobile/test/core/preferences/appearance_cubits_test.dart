import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';
import 'package:shoot_mobile/core/theme/accent_cubit.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';

import '../../helpers/in_memory_preferences_store.dart';

void main() {
  test('MA-US2-S2 theme mode and language are restored', () {
    final store = InMemoryPreferencesStore({
      PreferenceKeys.themeMode: 'dark',
      PreferenceKeys.locale: 'ar',
      PreferenceKeys.accent: 'violet',
    });
    expect(ThemeModeCubit(store).state, ThemeMode.dark);
    expect(LocaleCubit(store).state, const Locale('ar'));
    expect(AccentCubit(store).state, ShootAccent.violet);
  });

  test('MA-US2-S2 select writes the values the store reads back', () async {
    final store = InMemoryPreferencesStore();
    final theme = ThemeModeCubit(store);
    final locale = LocaleCubit(store);
    final accent = AccentCubit(store);

    for (final mode in ThemeMode.values) {
      theme.select(mode == ThemeMode.system ? ThemeMode.light : mode);
      await Future<void>.delayed(Duration.zero);
    }
    expect(store.values[PreferenceKeys.themeMode], 'dark');
    theme.select(ThemeMode.system);
    await Future<void>.delayed(Duration.zero);
    expect(store.values[PreferenceKeys.themeMode], 'system');
    theme.select(ThemeMode.light);
    await Future<void>.delayed(Duration.zero);
    expect(store.values[PreferenceKeys.themeMode], 'light');

    locale.select(const Locale('ar'));
    await Future<void>.delayed(Duration.zero);
    expect(store.values[PreferenceKeys.locale], 'ar');
    locale.select(const Locale('en'));
    await Future<void>.delayed(Duration.zero);
    expect(store.values[PreferenceKeys.locale], 'en');

    // Back to the device language removes the key.
    locale.select(null);
    await Future<void>.delayed(Duration.zero);
    expect(store.values.containsKey(PreferenceKeys.locale), isFalse);
    expect(locale.state, isNull);

    accent.select(ShootAccent.teal);
    await Future<void>.delayed(Duration.zero);
    expect(store.values[PreferenceKeys.accent], 'teal');

    // A restart reads the same choices back.
    expect(ThemeModeCubit(store).state, ThemeMode.light);
    expect(LocaleCubit(store).state, isNull);
    expect(AccentCubit(store).state, ShootAccent.teal);
  });

  test('MA-US2-S3 an unknown saved accent falls back to Blue', () async {
    final store = InMemoryPreferencesStore({PreferenceKeys.accent: 'orange'});
    final cubit = AccentCubit(store);
    expect(cubit.state, ShootAccent.blue);
    // The stored value is left alone until a new choice replaces it.
    expect(store.values[PreferenceKeys.accent], 'orange');
    expect(store.writes, isEmpty);

    cubit.select(ShootAccent.magenta);
    await Future<void>.delayed(Duration.zero);
    expect(store.values[PreferenceKeys.accent], 'magenta');
  });

  test(
    'MA-US2-S4 unreadable preferences give the defaults without an error',
    () {
      final unreadable = InMemoryPreferencesStore({
        PreferenceKeys.accent: 'violet',
        PreferenceKeys.themeMode: 'dark',
        PreferenceKeys.locale: 'ar',
      })..failReads = true;
      expect(AccentCubit(unreadable).state, ShootAccent.blue);
      expect(ThemeModeCubit(unreadable).state, ThemeMode.system);
      expect(LocaleCubit(unreadable).state, isNull);

      final unsupported = InMemoryPreferencesStore({
        PreferenceKeys.themeMode: 'sepia',
        PreferenceKeys.locale: 'fr',
      });
      expect(ThemeModeCubit(unsupported).state, ThemeMode.system);
      expect(LocaleCubit(unsupported).state, isNull);
    },
  );

  test(
    'FR-012 a failed write still applies the choice, emitted first',
    () async {
      final store = InMemoryPreferencesStore()..failWrites = true;
      final accent = AccentCubit(store);
      final emitted = <ShootAccent>[];
      final sub = accent.stream.listen(emitted.add);

      accent.select(ShootAccent.violet);
      expect(accent.state, ShootAccent.violet); // synchronous, before any write
      await Future<void>.delayed(Duration.zero);

      expect(emitted, [ShootAccent.violet]);
      expect(store.values, isEmpty);
      await sub.cancel();

      final theme = ThemeModeCubit(store)..select(ThemeMode.dark);
      final locale = LocaleCubit(store)..select(const Locale('ar'));
      expect(theme.state, ThemeMode.dark);
      expect(locale.state, const Locale('ar'));
    },
  );

  test('selecting the current theme mode or accent writes nothing', () async {
    final store = InMemoryPreferencesStore();
    ThemeModeCubit(store).select(ThemeMode.system);
    AccentCubit(store).select(ShootAccent.blue);
    await Future<void>.delayed(Duration.zero);
    expect(store.writes, isEmpty);
  });
}
