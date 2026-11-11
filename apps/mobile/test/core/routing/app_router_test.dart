import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/gallery/gallery_page.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/routing/not_found_page.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';

import '../../helpers/in_memory_preferences_store.dart';

void main() {
  late InMemoryPreferencesStore store;
  late LocaleCubit locale;

  setUp(() {
    store = InMemoryPreferencesStore();
    locale = LocaleCubit(store);
  });

  Future<void> open(
    WidgetTester tester,
    String location, {
    bool isDebug = true,
    bool settle = true,
  }) async {
    final router = createAppRouter(
      initialLocation: location,
      onArabicLink: () => locale.select(const Locale('ar')),
      isDebug: isDebug,
      home: (_) => const Text('home'),
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      BlocProvider.value(
        value: locale,
        child: BlocBuilder<LocaleCubit, Locale?>(
          builder: (context, chosen) => MaterialApp.router(
            routerConfig: router,
            locale: chosen ?? const Locale('en'),
            theme: AppTheme.light,
            supportedLocales: AppLocalizations.supportedLocales,
            localizationsDelegates: AppLocalizations.localizationsDelegates,
          ),
        ),
      ),
    );
    if (settle) {
      await tester.pumpAndSettle();
    } else {
      // The gallery shows a loading spinner, which never settles.
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 500));
    }
  }

  testWidgets(
    'MF-US5-S1 an unknown path shows screen 37 in the link language',
    (tester) async {
      await open(tester, '/does-not-exist');
      expect(find.byType(NotFoundPage), findsOneWidget);
      expect(find.text("That page isn't here"), findsOneWidget);
    },
  );

  testWidgets(
    'MF-US5-S2 an /ar link opens in Arabic, right to left, and is saved',
    (tester) async {
      await open(tester, '/ar/does-not-exist');
      expect(find.byType(NotFoundPage), findsOneWidget);
      expect(find.text('هذه الصفحة ليست هنا'), findsOneWidget);
      expect(
        Directionality.of(tester.element(find.byType(NotFoundPage))),
        TextDirection.rtl,
      );
      expect(store.values[PreferenceKeys.locale], 'ar');
    },
  );

  testWidgets('MF-US5-S2 /ar alone opens home in Arabic', (tester) async {
    await open(tester, '/ar');
    expect(find.text('home'), findsOneWidget);
    expect(locale.state, const Locale('ar'));
  });

  testWidgets('paths without /ar keep the current language', (tester) async {
    locale.select(const Locale('ar'));
    await open(tester, '/does-not-exist');
    expect(find.text('هذه الصفحة ليست هنا'), findsOneWidget);
  });

  testWidgets('MF-US5-S5 a known but unbuilt route shows screen 37', (
    tester,
  ) async {
    final unbuilt = AppRoutes.table.where((r) => !r.built);
    expect(unbuilt, isNotEmpty);
    for (final route in unbuilt) {
      await open(tester, route.example);
      expect(
        find.byType(NotFoundPage),
        findsOneWidget,
        reason: '${route.path} (${route.owner})',
      );
    }
  });

  testWidgets('MF-US3-S5 the gallery is unreachable in release builds', (
    tester,
  ) async {
    await open(tester, AppRoutes.gallery, isDebug: false);
    expect(find.byType(NotFoundPage), findsOneWidget);
    expect(find.byType(GalleryPage), findsNothing);

    await open(tester, AppRoutes.gallery, settle: false);
    expect(find.byType(GalleryPage), findsOneWidget);
  });

  test('every path in the table is unique and mirrors the web', () {
    final paths = AppRoutes.table.map((r) => r.path).toList();
    expect(paths.toSet(), hasLength(paths.length));
    for (final r in AppRoutes.table) {
      expect(r.path, startsWith('/'));
      expect(r.path, isNot(startsWith('/ar')));
    }
  });
}
