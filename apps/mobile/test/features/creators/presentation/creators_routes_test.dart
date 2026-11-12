import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/config/app_config.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/routing/not_found_page.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/core/theme/shoot_accent.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/creators/domain/entities/creators.dart';
import 'package:shoot_mobile/features/creators/domain/repositories/creators_repository.dart';
import 'package:shoot_mobile/features/creators/domain/usecases/creator_use_cases.dart';
import 'package:shoot_mobile/features/creators/domain/usecases/get_brief_context.dart';
import 'package:shoot_mobile/features/creators/presentation/creators_routes.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/book_hire_cubits.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/brief_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/directory_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/profile_cubit.dart';
import 'package:shoot_mobile/features/creators/presentation/cubit/specialty_cubit.dart';
import 'package:shoot_mobile/features/site/data/models/brief_builder_model.dart';
import 'package:shoot_mobile/features/site/data/models/site_info_model.dart';
import 'package:shoot_mobile/features/site/domain/repositories/site_repository.dart';

import '../../../helpers/api_examples.dart';
import '../../../helpers/creators_fixtures.dart';

class _Repo extends Mock implements CreatorsRepository {}

class _Site extends Mock implements SiteRepository {}

void main() {
  late _Repo repo;
  late _Site site;

  setUpAll(() => registerFallbackValue(const CreatorQuery()));

  setUp(() {
    repo = _Repo();
    site = _Site();
    when(() => site.getSite()).thenAnswer(
      (_) async => Ok(SiteInfoModel.fromJson(loadExample('site')).toEntity()),
    );
    when(() => site.getBriefBuilder()).thenAnswer(
      (_) async => Ok(
        BriefBuilderModel.fromJson(loadExample('brief-builder')).toEntity(),
      ),
    );
    when(() => repo.getCreators(any()))
        .thenAnswer((_) async => Ok(exampleCreatorList()));
    when(() => repo.getProfile(any()))
        .thenAnswer((_) async => Ok(exampleProfile()));
    when(() => repo.getSpecialty(any()))
        .thenAnswer((_) async => Ok(exampleSpecialty()));
    when(() => repo.getHirePage(any()))
        .thenAnswer((_) async => Ok(exampleHire()));
  });

  Future<GoRouter> pumpRouter(WidgetTester tester, String location) async {
    await tester.binding.setSurfaceSize(const Size(360, 2600));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final getCreators = GetCreators(repo);
    final router = createAppRouter(
      initialLocation: location,
      isDebug: false,
      home: (_) => const Text('home'),
      routes: creatorsRoutes(
        createDirectory: (initial) =>
            DirectoryCubit(getCreators, initial: initial),
        createProfile: (code) => ProfileCubit(
          getProfile: GetCreatorProfile(repo),
          getWhatsappNumber: GetWhatsappNumber(site),
          code: code,
        ),
        createBook: (code) => BookCubit(
          getProfile: GetCreatorProfile(repo),
          getContext: GetBriefContext(site),
          code: code,
        ),
        createSpecialty: (slug) =>
            SpecialtyCubit(GetSpecialtyPage(repo), slug: slug),
        createHire: (slug) => HireCubit(
          getHirePage: GetHirePage(repo),
          getWhatsappNumber: GetWhatsappNumber(site),
          slug: slug,
        ),
        draft: BriefDraft(),
        clock: FixedClock(DateTime.utc(2026, 11, 12)),
        links: const WebsiteLinks(
          AppConfig(apiBaseUrl: 'https://shoot.test', environment: 'test'),
        ),
        open: (_) async => true,
        share: (_) async {},
      ),
    );
    addTearDown(router.dispose);
    await tester.pumpWidget(
      MaterialApp.router(
        routerConfig: router,
        theme: AppTheme.of(ShootAccent.brand, Brightness.light),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
      ),
    );
    await tester.pump(const Duration(seconds: 1));
    return router;
  }

  testWidgets('MC FR-067 the five paths open their screens', (tester) async {
    await pumpRouter(tester, '/creators/sh-0087');
    expect(find.text('Omar K.'), findsWidgets);
    expect(find.text('Book with Omar'), findsOneWidget);
    verify(() => repo.getProfile('sh-0087')).called(1);
  });

  testWidgets('MC FR-067 /creators lists the directory', (tester) async {
    await pumpRouter(tester, '/creators');
    expect(find.text('Showing 3 of 12'), findsOneWidget);
  });

  testWidgets('MC FR-067 /creators?specialty=weddings starts filtered', (
    tester,
  ) async {
    await pumpRouter(tester, '/creators?specialty=weddings');
    final query =
        verify(() => repo.getCreators(captureAny())).captured.first
            as CreatorQuery;
    expect(query.specialty, 'weddings');
  });

  testWidgets('MC FR-067 /book/:code opens the booking', (tester) async {
    await pumpRouter(tester, '/book/SH-0087');
    expect(find.text('Book Omar K.'), findsOneWidget);
  });

  testWidgets('MC FR-067 /work/:specialty opens the specialty page', (
    tester,
  ) async {
    await pumpRouter(tester, '/work/weddings');
    expect(find.text('Wedding professionals'), findsOneWidget);
  });

  testWidgets('MC FR-067 /hire/:slug opens the hire page', (tester) async {
    await pumpRouter(tester, '/hire/wedding-photographer-dubai');
    expect(find.text('Wedding photographer in Dubai'), findsOneWidget);
  });

  testWidgets('MC-US1-S3 an unlisted creator shows screen 37', (tester) async {
    when(() => repo.getProfile(any()))
        .thenAnswer((_) async => const Err(NotFoundFailure()));
    await pumpRouter(tester, '/creators/nobody');
    expect(find.byType(NotFoundPage), findsOneWidget);
  });

  testWidgets('MC-US4-S6 an unknown specialty shows screen 37', (tester) async {
    when(() => repo.getSpecialty(any()))
        .thenAnswer((_) async => const Err(NotFoundFailure()));
    await pumpRouter(tester, '/work/nothing');
    expect(find.byType(NotFoundPage), findsOneWidget);
  });

  testWidgets('MC-US5-S6 an unknown hire page shows screen 37', (tester) async {
    when(() => repo.getHirePage(any()))
        .thenAnswer((_) async => const Err(NotFoundFailure()));
    await pumpRouter(tester, '/hire/nothing');
    expect(find.byType(NotFoundPage), findsOneWidget);
  });

  testWidgets('a network failure shows screen 39 and "Try again" loads again', (
    tester,
  ) async {
    when(() => repo.getProfile(any()))
        .thenAnswer((_) async => const Err(NetworkFailure()));
    await pumpRouter(tester, '/creators/x');
    expect(find.text('Try again'), findsOneWidget);
    when(() => repo.getProfile(any()))
        .thenAnswer((_) async => Ok(exampleProfile()));
    await tester.tap(find.text('Try again'));
    await tester.pump(const Duration(seconds: 1));
    expect(find.text('Book with Omar'), findsOneWidget);
  });
}
