import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';

extension PumpApp on WidgetTester {
  /// Pumps [widget] inside the same shell the app uses (localizations, both
  /// themes, the app-level cubits), in [locale] and [themeMode].
  Future<void> pumpApp(
    Widget widget, {
    Locale locale = const Locale('en'),
    ThemeMode themeMode = ThemeMode.light,
  }) {
    return pumpWidget(
      MultiBlocProvider(
        providers: [
          BlocProvider(create: (_) => LocaleCubit()),
          BlocProvider(create: (_) => ThemeModeCubit()..select(themeMode)),
        ],
        child: MaterialApp(
          locale: locale,
          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          themeMode: themeMode,
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          home: widget,
        ),
      ),
    );
  }
}
