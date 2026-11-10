import 'dart:ui';

import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/core/config/app_config.dart';
import 'package:shoot_mobile/core/l10n/app_locales.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/network/dio_client.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';
import 'package:shoot_mobile/features/service_health/service_health_injection.dart';

/// The service locator. Only the composition root (this file, `main.dart`
/// and route builders) reads from it; classes take their dependencies through
/// their constructors so tests can pass fakes.
final GetIt getIt = GetIt.instance;

void configureDependencies(AppConfig config) {
  getIt
    ..registerSingleton<AppConfig>(config)
    ..registerSingleton<LocaleCubit>(LocaleCubit())
    ..registerSingleton<ThemeModeCubit>(ThemeModeCubit())
    ..registerLazySingleton<Dio>(
      () => createDio(config: config, languageCode: _currentLanguageCode),
    );

  // One line per feature.
  registerServiceHealthFeature(getIt);
}

String _currentLanguageCode() {
  final chosen = getIt<LocaleCubit>().state;
  return (chosen ?? AppLocales.resolve(PlatformDispatcher.instance.locales))
      .languageCode;
}
