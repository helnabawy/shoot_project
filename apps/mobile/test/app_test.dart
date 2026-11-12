import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/app.dart';
import 'package:shoot_mobile/core/config/app_config.dart';
import 'package:shoot_mobile/core/di/injection.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';
import 'package:shoot_mobile/core/theme/shoot_colors.dart';
import 'package:shoot_mobile/features/landing/domain/repositories/landing_repository.dart';
import 'package:shoot_mobile/features/service_health/domain/entities/service_health.dart';
import 'package:shoot_mobile/features/service_health/domain/repositories/service_health_repository.dart';
import 'package:shoot_mobile/features/service_health/presentation/pages/service_health_page.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';

import 'helpers/in_memory_preferences_store.dart';
import 'helpers/ml_harness.dart';

class _HealthyRepository implements ServiceHealthRepository {
  @override
  Future<Result<ServiceHealth>> checkHealth() async =>
      const Ok(ServiceHealth(status: HealthStatus.healthy));
}

void main() {
  Future<void> boot([Map<String, String>? saved]) async {
    await getIt.reset();
    configureDependencies(
      const AppConfig(apiBaseUrl: 'http://api.test', environment: 'test'),
      // The welcome steps are seen, so these tests start at the home screen.
      InMemoryPreferencesStore({PreferenceKeys.welcomeSeen: 'true', ...?saved}),
    );
    // Swap the HTTP-backed repository for a fake: everything else (router,
    // DI, use case, cubit, l10n, theme) is the real thing.
    await getIt.unregister<ServiceHealthRepository>();
    getIt.registerLazySingleton<ServiceHealthRepository>(
      _HealthyRepository.new,
    );
    // Feature 010: the landing reads its content through these two repositories.
    await getIt.unregister<LandingRepository>();
    await getIt.unregister<SiteRepository>();
    getIt
      ..registerLazySingleton<LandingRepository>(
        () => FakeLandingRepository(Ok(exampleLanding())),
      )
      ..registerLazySingleton<SiteRepository>(FakeSiteRepository.new);
  }

  /// The shell around the 007 health page, which carries the appearance button.
  Widget shellWithHealthPage() =>
      ShootApp(home: (_) => const ServiceHealthPage());

  setUp(boot);

  tearDown(getIt.reset);

  testWidgets('boots through DI and the router to the first screen', (
    tester,
  ) async {
    await tester.pumpWidget(const ShootApp());
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    // The first screen is the landing (feature 010), its words from the CMS.
    expect(find.text('Shoot'), findsOneWidget);
    expect(find.text('You brief. We shoot.'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('the language button switches the app to Arabic (RTL)', (
    tester,
  ) async {
    await tester.pumpWidget(shellWithHealthPage());
    await tester.pumpAndSettle();

    await tester.tap(find.text('عربي'));
    await tester.pumpAndSettle();

    expect(find.text('شوت'), findsOneWidget);
    expect(find.text('كل شيء يعمل.'), findsOneWidget);
    final context = tester.element(find.text('شوت'));
    expect(Directionality.of(context), TextDirection.rtl);
  });

  testWidgets('an unknown route shows the not-found screen', (tester) async {
    final router = createAppRouter(
      initialLocation: '/does-not-exist',
      home: (_) => const SizedBox(),
    );
    addTearDown(router.dispose);

    await tester.pumpWidget(
      MaterialApp.router(
        routerConfig: router,
        theme: AppTheme.light,
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text("That page isn't here"), findsOneWidget);
  });

  testWidgets('MA-US2-S1 a saved accent is applied on the first frame', (
    tester,
  ) async {
    await boot({
      PreferenceKeys.accent: 'teal',
      PreferenceKeys.themeMode: 'dark',
      PreferenceKeys.locale: 'ar',
    });

    // No extra pumps: the very first frame is already right.
    await tester.pumpWidget(const ShootApp());

    final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
    expect(app.themeMode, ThemeMode.dark);
    expect(app.locale, const Locale('ar'));
    expect(
      app.darkTheme!.extension<ShootColors>()!.accent,
      ShootAccent.teal.dark.accent,
    );
    expect(
      app.theme!.extension<ShootColors>()!.accent,
      ShootAccent.teal.light.accent,
    );
  });

  testWidgets('FR-014 reduced motion recolours in one pump, no cross-fade', (
    tester,
  ) async {
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
    addTearDown(tester.platformDispatcher.clearAllTestValues);

    await tester.pumpWidget(shellWithHealthPage());
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<MaterialApp>(find.byType(MaterialApp))
          .themeAnimationDuration,
      Duration.zero,
    );

    await tester.tap(find.byKey(const Key('appearance-button')));
    await tester.pumpAndSettle();
    await tester.tap(find.byKey(const Key('accent-option-violet')));
    await tester.pump();

    final colors = Theme.of(
      tester.element(find.byKey(const Key('appearance-sheet'))),
    ).extension<ShootColors>()!;
    expect(colors.accent, ShootAccent.violet.light.accent);
  });

  testWidgets('motion on: the theme cross-fades by default', (tester) async {
    await tester.pumpWidget(shellWithHealthPage());
    await tester.pumpAndSettle();
    expect(
      tester
          .widget<MaterialApp>(find.byType(MaterialApp))
          .themeAnimationDuration,
      kThemeAnimationDuration,
    );
  });
}
