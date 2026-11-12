import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/theme/accent_cubit.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/content/domain/entities/editor_page.dart';
import 'package:shoot_mobile/features/content/domain/entities/guides.dart';
import 'package:shoot_mobile/features/content/domain/entities/legal.dart';
import 'package:shoot_mobile/features/content/domain/entities/path_status.dart';
import 'package:shoot_mobile/features/content/domain/repositories/content_repository.dart';
import 'package:shoot_mobile/features/content/domain/repositories/path_status_repository.dart';
import 'package:shoot_mobile/features/content/domain/usecases/check_path.dart';
import 'package:shoot_mobile/features/content/domain/usecases/get_guides.dart';
import 'package:shoot_mobile/features/content/domain/usecases/get_legal.dart';
import 'package:shoot_mobile/features/content/presentation/content_deps.dart';
import 'package:shoot_mobile/features/content/presentation/content_routes.dart';
import 'package:shoot_mobile/features/content/presentation/cubit/content_loaders.dart';

import 'in_memory_preferences_store.dart';
import 'sign_in_harness.dart' show RecordingOpener, testConfig;

class MockContentRepository extends Mock implements ContentRepository {}

class MockPathStatusRepository extends Mock implements PathStatusRepository {}

/// The content feature over mocked repositories, with what it opened outside the app recorded.
final class ContentHarness {
  ContentHarness() {
    registerFallbackValue(LegalKind.terms);
  }

  final repository = MockContentRepository();
  final status = MockPathStatusRepository();
  final opener = RecordingOpener();
  int whatsappOpened = 0;

  ContentDeps get deps => ContentDeps(
    loaders: ContentLoaders(
      getGuides: GetGuides(repository),
      getArticle: GetArticle(repository),
      getPage: GetPage(repository),
      getLegal: GetLegal(repository),
      getLegalVersion: GetLegalVersion(repository),
      getLegalVersions: GetLegalVersions(repository),
      isRemoved: IsRemovedPath(status),
    ),
    openWhatsapp: () async {
      whatsappOpened++;
      return true;
    },
    links: WebsiteLinks(testConfig, open: opener.call),
    clock: FixedClock(DateTime.utc(2026, 11, 12)),
    openUrl: opener.call,
  );
}

extension ContentStubs on ContentHarness {
  void stubGuides(GuideList list) => when(
    () => repository.getGuides(
      page: any(named: 'page'),
      category: any(named: 'category'),
      author: any(named: 'author'),
    ),
  ).thenAnswer((_) async => Ok(list));

  void stubGuide(String slug, Article article) =>
      when(() => repository.getGuide(slug))
          .thenAnswer((_) async => Ok(article));

  void stubPage(String slug, EditorPage page) =>
      when(() => repository.getPage(slug)).thenAnswer((_) async => Ok(page));

  void stubLegal(LegalKind kind, LegalDocument document) =>
      when(() => repository.getLegal(kind))
          .thenAnswer((_) async => Ok(document));

  void stubLegalVersion(LegalKind kind, int version, LegalDocument document) =>
      when(() => repository.getLegalVersion(kind, version))
          .thenAnswer((_) async => Ok(document));

  void stubLegalVersions(LegalKind kind, LegalVersions versions) =>
      when(() => repository.getLegalVersions(kind))
          .thenAnswer((_) async => Ok(versions));

  /// A read that answers 404, and what `resolve` says about the path.
  void stubMissingPage(String slug, PathStatus resolved) {
    when(() => repository.getPage(slug))
        .thenAnswer((_) async => const Err<EditorPage>(NotFoundFailure()));
    when(() => status.getStatus('/$slug'))
        .thenAnswer((_) async => Ok(resolved));
  }

  void stubMissingGuide(String slug, PathStatus resolved) {
    when(() => repository.getGuide(slug))
        .thenAnswer((_) async => const Err<Article>(NotFoundFailure()));
    when(() => status.getStatus('/guides/$slug'))
        .thenAnswer((_) async => Ok(resolved));
  }
}

/// Pumps the content routes (and the editor-page route last) behind the real app router, in
/// [locale] and [brightness], at [location]. Returns the router so a test can read where it went.
Future<GoRouter> pumpContent(
  WidgetTester tester,
  ContentHarness harness, {
  required String location,
  Locale locale = const Locale('en'),
  Brightness brightness = Brightness.light,
}) async {
  final prefs = InMemoryPreferencesStore();
  final localeCubit = LocaleCubit(prefs)..select(locale);
  final router = createAppRouter(
    initialLocation: location,
    isDebug: false,
    routes: [...contentRoutes(harness.deps), editorPageRoute(harness.deps)],
    home: (_) => const Text('home'),
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    MultiBlocProvider(
      providers: [
        BlocProvider.value(value: localeCubit),
        BlocProvider(create: (_) => ThemeModeCubit(prefs)),
        BlocProvider(create: (_) => AccentCubit(prefs)),
      ],
      child: BlocBuilder<LocaleCubit, Locale?>(
        builder: (context, chosen) => MaterialApp.router(
          routerConfig: router,
          locale: chosen,
          theme: AppTheme.of(ShootAccent.blue, brightness),
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
        ),
      ),
    ),
  );
  await tester.pump();
  await tester.pump();
  return router;
}

/// Where the router is, including a screen pushed on top of another.
String locationOf(GoRouter router) {
  final configuration = router.routerDelegate.currentConfiguration;
  final top = configuration.last;
  return top is ImperativeRouteMatch
      ? top.matches.uri.toString()
      : configuration.uri.toString();
}
