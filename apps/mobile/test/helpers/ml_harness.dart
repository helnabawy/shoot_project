import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/content/creator_card.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';
import 'package:shoot_mobile/core/theme/accent_cubit.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';
import 'package:shoot_mobile/features/landing/data/models/landing_model.dart';
import 'package:shoot_mobile/features/landing/domain/entities/landing.dart';
import 'package:shoot_mobile/features/landing/domain/repositories/landing_repository.dart';
import 'package:shoot_mobile/features/site/data/models/brief_builder_model.dart';
import 'package:shoot_mobile/features/site/data/models/site_info_model.dart';
import 'package:shoot_mobile/features/site/domain/entities/audience.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';
import 'package:shoot_mobile/features/site/domain/entities/navigation.dart';
import 'package:shoot_mobile/features/site/domain/entities/site_info.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';

import 'api_examples.dart';
import 'auth_fixtures.dart';
import 'brief_fixtures.dart';
import 'in_memory_preferences_store.dart';

/// The shared landing example (feature 008), optionally with [creators] cards in its network.
Landing exampleLanding({int? creators, bool arabic = false}) {
  final landing = LandingModel.fromJson(loadExample('landing')).toEntity();
  if (creators == null) return landing;
  final sections = [
    for (final s in landing.sections)
      if (s is CreatorNetworkSection)
        CreatorNetworkSection(
          anchor: s.anchor,
          heading: s.heading,
          subheading: s.subheading,
          creators: [
            for (var i = 0; i < creators; i++)
              _card(s.creators[i % s.creators.length], i),
          ],
          cta: s.cta,
        )
      else
        s,
  ];
  return Landing(
    locale: landing.locale,
    hero: landing.hero,
    navigation: landing.navigation,
    sections: sections,
  );
}

CreatorCard _card(CreatorCard c, int i) => CreatorCard(
  code: '${c.code}-$i',
  displayCode: c.displayCode,
  name: c.name,
  initials: c.initials,
  photo: c.photo,
  types: c.types,
  places: c.places,
  specialties: c.specialties,
  languages: c.languages,
  yearsExperience: c.yearsExperience,
  sampleCount: c.sampleCount,
  featured: c.featured,
);

SiteInfo exampleSite({bool arabic = false}) =>
    SiteInfoModel.fromJson(loadExample(arabic ? 'site.ar' : 'site')).toEntity();

BriefBuilder exampleBuilder({bool arabic = false}) =>
    BriefBuilderModel.fromJson(
      loadExample(arabic ? 'brief-builder.ar' : 'brief-builder'),
    ).toEntity();

class FakeLandingRepository implements LandingRepository {
  FakeLandingRepository(this.result);

  Result<Landing> result;
  int calls = 0;

  @override
  Future<Result<Landing>> getLanding() async {
    calls++;
    return result;
  }
}

class FakeSiteRepository implements SiteRepository {
  FakeSiteRepository({
    SiteInfo? site,
    BriefBuilder? builder,
    Result<BriefBuilder>? builderResult,
  }) : site = Ok(site ?? exampleSite()),
       builder = builderResult ?? Ok(builder ?? exampleBuilder());

  Result<SiteInfo> site;
  Result<BriefBuilder> builder;

  @override
  Future<Result<SiteInfo>> getSite() async => site;

  @override
  Future<Result<BriefBuilder>> getBriefBuilder() async => builder;

  @override
  Future<Result<Navigation>> getNavigation() => throw UnimplementedError();

  @override
  Future<Result<Audience>> getAudience() => throw UnimplementedError();
}

const failure = Err<Landing>(NetworkFailure());

BriefCubit makeBrief({
  BriefBuilder? builder,
  FakeBriefRepository? repository,
  DateTime? now,
}) => BriefCubit(
  loadBuilder: () async => Ok(builder ?? exampleBuilder()),
  repository: repository ?? FakeBriefRepository(),
  clock: FixedClock(now ?? DateTime.utc(2026, 12, 5, 10)),
);

/// Pumps [router] inside the app shell: language, theme, accent, session and brief cubits.
Future<void> pumpRouter(
  WidgetTester tester,
  GoRouter router, {
  Locale locale = const Locale('en'),
  ThemeMode themeMode = ThemeMode.light,
  PreferencesStore? store,
  BriefCubit? brief,
  Size size = const Size(360, 780),
  bool reduceMotion = false,
  SessionCubit? session,
}) async {
  tester.view
    ..physicalSize = size * 2
    ..devicePixelRatio = 2;
  if (reduceMotion) {
    tester.platformDispatcher.accessibilityFeaturesTestValue =
        const FakeAccessibilityFeatures(disableAnimations: true);
  }
  addTearDown(tester.view.reset);
  addTearDown(tester.platformDispatcher.clearAllTestValues);
  final prefs = store ?? InMemoryPreferencesStore();
  session ??= SessionCubit(
    store: MemorySessionStore(),
    api: MockAuthApi(),
    clock: examplesClock,
    storeRead: true,
  );
  await tester.pumpWidget(
    MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => LocaleCubit(prefs)..select(locale)),
        BlocProvider(create: (_) => ThemeModeCubit(prefs)..select(themeMode)),
        BlocProvider(
          create: (_) => AccentCubit(prefs)..select(ShootAccent.brand),
        ),
        BlocProvider<SessionCubit>.value(value: session),
        BlocProvider<BriefCubit>.value(value: brief ?? makeBrief()),
      ],
      child: Builder(
        builder: (context) => MaterialApp.router(
          routerConfig: router,
          locale: context.watch<LocaleCubit>().state,
          theme: AppTheme.of(ShootAccent.brand, Brightness.light),
          darkTheme: AppTheme.of(ShootAccent.brand, Brightness.dark),
          themeMode: context.watch<ThemeModeCubit>().state,
          supportedLocales: AppLocalizations.supportedLocales,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
        ),
      ),
    ),
  );
}

/// A tiny router: [home] at `/`, and a recording stub for each of [stubs].
GoRouter stubRouter({
  required Widget home,
  List<String> stubs = const [],
  List<RouteBase> routes = const [],
  String initialLocation = '/',
}) => GoRouter(
  initialLocation: initialLocation,
  routes: [
    GoRoute(path: '/', builder: (_, _) => home),
    for (final path in stubs)
      GoRoute(
        path: path,
        builder: (_, state) => Scaffold(body: Text('stub:${state.uri.path}')),
      ),
    ...routes,
  ],
);
