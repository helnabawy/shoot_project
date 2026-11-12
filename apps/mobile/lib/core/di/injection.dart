import 'dart:ui';

import 'package:dio/dio.dart';
import 'package:get_it/get_it.dart';
import 'package:shoot_mobile/core/auth/auth_api.dart';
import 'package:shoot_mobile/core/auth/auth_interceptor.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
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
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/account/account_injection.dart';
import 'package:shoot_mobile/features/content/content_injection.dart';
import 'package:shoot_mobile/features/creators/creators_injection.dart';
import 'package:shoot_mobile/features/landing/landing_injection.dart';
import 'package:shoot_mobile/features/service_health/service_health_injection.dart';
import 'package:shoot_mobile/features/sign_in/sign_in_injection.dart';
import 'package:shoot_mobile/features/site/site_injection.dart';

/// The service locator. Only the composition root (this file, `main.dart`
/// and route builders) reads from it; classes take their dependencies through
/// their constructors so tests can pass fakes.
final GetIt getIt = GetIt.instance;

/// [sessionStore] and [session] come from `main()`, which reads the store before `runApp`
/// (feature 009); tests leave them out and get an empty in-memory store.
void configureDependencies(
  AppConfig config,
  PreferencesStore store, {
  SessionStore? sessionStore,
  Session? session,
}) {
  getIt
    ..registerSingleton<AppConfig>(config)
    ..registerSingleton<PreferencesStore>(store)
    ..registerSingleton<Clock>(const SystemClock())
    ..registerSingleton<FirstRunStore>(FirstRunStore(store))
    ..registerSingleton<LocaleCubit>(LocaleCubit(store))
    ..registerSingleton<ThemeModeCubit>(ThemeModeCubit(store))
    ..registerSingleton<AccentCubit>(AccentCubit(store))
    ..registerSingleton<InstallIdStore>(InstallIdStore(store))
    ..registerSingleton<WebsiteLinks>(WebsiteLinks(config))
    ..registerLazySingleton<Dio>(
      () => createDio(
        config: config,
        languageCode: _currentLanguageCode,
        installId: getIt<InstallIdStore>().id,
        auth: getIt<AuthInterceptor>(),
      ),
    );
  _registerSession(config, sessionStore ?? MemorySessionStore(), session);

  // One line per feature.
  registerServiceHealthFeature(getIt);
  registerSiteFeature(getIt);
  registerLandingFeature(getIt);
  registerContentFeature(getIt);
  registerCreatorsFeature(getIt);
  registerSignInFeature(getIt);
  registerAccountFeature(getIt);
}

/// Feature 009: the session, its own Dio (no auth interceptor, so a refresh never recurses)
/// and the interceptor the shared Dio adds after the install id.
void _registerSession(AppConfig config, SessionStore store, Session? session) {
  getIt
    ..registerSingleton<SessionStore>(store)
    ..registerLazySingleton<AuthApi>(
      () => AuthApi(
        createDio(
          config: config,
          languageCode: _currentLanguageCode,
          installId: getIt<InstallIdStore>().id,
        ),
      ),
    )
    ..registerLazySingleton<SessionCubit>(
      () => SessionCubit(
        store: store,
        api: getIt<AuthApi>(),
        clock: getIt<Clock>(),
        restored: session,
        storeRead: true,
      ),
    )
    ..registerLazySingleton<AuthInterceptor>(
      () => AuthInterceptor(
        session: getIt<SessionCubit>(),
        api: getIt<AuthApi>(),
        clock: getIt<Clock>(),
      ),
    );
}

String _currentLanguageCode() {
  final chosen = getIt<LocaleCubit>().state;
  return (chosen ?? AppLocales.resolve(PlatformDispatcher.instance.locales))
      .languageCode;
}
