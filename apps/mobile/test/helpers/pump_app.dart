import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';
import 'package:shoot_mobile/core/theme/accent_cubit.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';

import 'in_memory_preferences_store.dart';

extension PumpApp on WidgetTester {
  /// Pumps [widget] inside the same shell the app uses (localizations, both
  /// themes, the app-level cubits), in [locale], [themeMode] and [accent].
  /// The shell follows the cubits, so a test can change the language, theme
  /// or accent through them (or through the Appearance sheet).
  Future<void> pumpApp(
    Widget widget, {
    Locale locale = const Locale('en'),
    ThemeMode themeMode = ThemeMode.light,
    ShootAccent accent = ShootAccent.brand,
    PreferencesStore? store,
  }) {
    final prefs = store ?? InMemoryPreferencesStore();
    return pumpWidget(
      MultiBlocProvider(
        providers: [
          BlocProvider(create: (_) => LocaleCubit(prefs)..select(locale)),
          BlocProvider(create: (_) => ThemeModeCubit(prefs)..select(themeMode)),
          BlocProvider(create: (_) => AccentCubit(prefs)..select(accent)),
        ],
        child: Builder(
          builder: (context) {
            final chosen = context.watch<AccentCubit>().state;
            return MaterialApp(
              locale: context.watch<LocaleCubit>().state,
              theme: AppTheme.of(chosen, Brightness.light),
              darkTheme: AppTheme.of(chosen, Brightness.dark),
              themeMode: context.watch<ThemeModeCubit>().state,
              supportedLocales: AppLocalizations.supportedLocales,
              localizationsDelegates: AppLocalizations.localizationsDelegates,
              home: widget,
            );
          },
        ),
      ),
    );
  }
}
