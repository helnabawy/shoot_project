import 'dart:ui';

import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/core/config/app_config.dart';
import 'package:shoot_mobile/core/first_run/first_run_store.dart';
import 'package:shoot_mobile/core/install/install_id_store.dart';
import 'package:shoot_mobile/core/l10n/app_locales.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/network/dio_client.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';
import 'package:shoot_mobile/core/theme/accent_cubit.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/service_health/service_health_injection.dart';

/// The service locator. Only the composition root (this file, `main.dart`
/// and route builders) reads from it; classes take their dependencies through
/// their constructors so tests can pass fakes.
final GetIt getIt = GetIt.instance;

void configureDependencies(AppConfig config, PreferencesStore store) {
  getIt
    ..registerSingleton<AppConfig>(config)
    ..registerSingleton<PreferencesStore>(store)
    ..registerSingleton<Clock>(const SystemClock())
    ..registerSingleton<FirstRunStore>(FirstRunStore(store))
    ..registerSingleton<LocaleCubit>(LocaleCubit(store))
    ..registerSingleton<ThemeModeCubit>(ThemeModeCubit(store))
    ..registerSingleton<AccentCubit>(AccentCubit(store))
    ..registerSingleton<InstallIdStore>(InstallIdStore(store))
    ..registerLazySingleton<Dio>(
      () => createDio(
        config: config,
        languageCode: _currentLanguageCode,
        installId: getIt<InstallIdStore>().id,
      ),
    );

  // One line per feature.
  registerServiceHealthFeature(getIt);
}

String _currentLanguageCode() {
  final chosen = getIt<LocaleCubit>().state;
  return (chosen ?? AppLocales.resolve(PlatformDispatcher.instance.locales))
      .languageCode;
}
