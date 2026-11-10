import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/app.dart';
import 'package:shoot_mobile/core/config/app_config.dart';
import 'package:shoot_mobile/core/di/injection.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/features/service_health/domain/entities/service_health.dart';
import 'package:shoot_mobile/features/service_health/domain/repositories/service_health_repository.dart';

class _HealthyRepository implements ServiceHealthRepository {
  @override
  Future<Result<ServiceHealth>> checkHealth() async =>
      const Ok(ServiceHealth(status: HealthStatus.healthy));
}

void main() {
  setUp(() async {
    await getIt.reset();
    configureDependencies(
      const AppConfig(apiBaseUrl: 'http://api.test', environment: 'test'),
    );
    // Swap the HTTP-backed repository for a fake: everything else (router,
    // DI, use case, cubit, l10n, theme) is the real thing.
    await getIt.unregister<ServiceHealthRepository>();
    getIt.registerLazySingleton<ServiceHealthRepository>(
      _HealthyRepository.new,
    );
  });

  tearDown(getIt.reset);

  testWidgets('boots through DI and the router to the first screen', (
    tester,
  ) async {
    await tester.pumpWidget(const ShootApp());
    await tester.pumpAndSettle();

    expect(find.text('Shoot'), findsOneWidget);
    expect(find.text('Everything is running.'), findsOneWidget);
  });

  testWidgets('the language button switches the app to Arabic (RTL)', (
    tester,
  ) async {
    await tester.pumpWidget(const ShootApp());
    await tester.pumpAndSettle();

    await tester.tap(find.text('العربية'));
    await tester.pumpAndSettle();

    expect(find.text('شوت'), findsOneWidget);
    expect(find.text('كل شيء يعمل.'), findsOneWidget);
    final context = tester.element(find.text('شوت'));
    expect(Directionality.of(context), TextDirection.rtl);
  });

  testWidgets('an unknown route shows the not-found screen', (tester) async {
    final router = createAppRouter(initialLocation: '/does-not-exist');
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

    expect(find.text('Page not found'), findsOneWidget);
  });
}
