import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';
import 'package:shoot_mobile/features/creator_home/data/models/creator_home_model.dart';
import 'package:shoot_mobile/features/creator_home/domain/repositories/creator_home_repository.dart';
import 'package:shoot_mobile/features/creator_home/presentation/creator_home_routes.dart';
import 'package:shoot_mobile/features/creator_home/presentation/cubit/creator_home_cubit.dart';
import 'package:shoot_mobile/features/creator_home/presentation/pages/creator_home_page.dart';

import '../../helpers/api_examples.dart';
import '../../helpers/auth_fixtures.dart';

class _Repository extends Mock implements CreatorHomeRepository {}

void main() {
  late SessionCubit session;
  late _Repository repository;
  final creator = exampleSession(exp: DateTime.utc(2026, 12, 21));
  final client = creator.copyWith(
    user: const SessionUser(
      id: '7',
      name: 'Mona',
      accountType: AccountType.seeker,
    ),
  );

  setUp(() {
    session = SessionCubit(
      store: MemorySessionStore(),
      api: MockAuthApi(),
      clock: examplesClock,
      storeRead: true,
    );
    repository = _Repository();
    when(() => repository.home()).thenAnswer(
      (_) async =>
          Ok(CreatorHomeModel.fromJson(loadExample('creator-home')).toEntity()),
    );
  });

  Future<GoRouter> open(WidgetTester tester, {String location = '/'}) async {
    tester.view.physicalSize = const Size(360, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
    final router = createAppRouter(
      initialLocation: location,
      isDebug: false,
      session: session,
      creatorHome: creatorHomePage(
        session: session,
        create: () => CreatorHomeCubit(repository),
      ),
      routes: [
        GoRoute(path: '/account/inbox', builder: (_, _) => const Text('inbox')),
        GoRoute(
          path: '/account/bookings/:ref',
          builder: (_, s) => Text('booking ${s.pathParameters['ref']}'),
        ),
      ],
      home: (_) => const Text('landing'),
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
    await tester.pump(const Duration(seconds: 2));
    return router;
  }

  testWidgets('CH-US2-S1 a signed-in creator\'s / is their home', (
    tester,
  ) async {
    await session.signIn(creator);
    await open(tester);
    expect(find.byType(CreatorHomePage), findsOneWidget);
    expect(find.text('landing'), findsNothing);
  });

  testWidgets(
    'CH-US2-S2 a client, and a signed-out visitor, still get the landing',
    (tester) async {
      await open(tester);
      expect(find.text('landing'), findsOneWidget);
      expect(find.byType(CreatorHomePage), findsNothing);
      await session.signIn(client);
      await tester.pump(const Duration(seconds: 2));
      expect(find.text('landing'), findsOneWidget);
      expect(find.byType(CreatorHomePage), findsNothing);
    },
  );

  testWidgets(
    'CH-US2-S3 a creator reaches the client landing with /?view=client',
    (tester) async {
      await session.signIn(creator);
      final router = await open(tester);
      expect(find.byType(CreatorHomePage), findsOneWidget);
      router.go('/?view=client');
      await tester.pump(const Duration(seconds: 2));
      expect(find.text('landing'), findsOneWidget);
      expect(find.byType(CreatorHomePage), findsNothing);
    },
  );

  testWidgets(
    'CH-US2-S4 signing in and out switches the page without leaving /',
    (tester) async {
      final router = await open(tester);
      expect(find.text('landing'), findsOneWidget);
      await session.signIn(creator);
      await tester.pump(const Duration(seconds: 2));
      expect(find.byType(CreatorHomePage), findsOneWidget);
      expect(router.routerDelegate.currentConfiguration.uri.toString(), '/');
      await session.signOut();
      await tester.pump(const Duration(seconds: 2));
      expect(find.text('landing'), findsOneWidget);
      expect(find.byType(CreatorHomePage), findsNothing);
    },
  );

  testWidgets(
    'CH-US2-S5 a link to a booking or the inbox still opens that page',
    (tester) async {
      await session.signIn(creator);
      final router = await open(
        tester,
        location: '/account/bookings/Q-2026-0142',
      );
      expect(find.text('booking Q-2026-0142'), findsOneWidget);
      router.go('/account/inbox');
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('inbox'), findsOneWidget);
      expect(find.byType(CreatorHomePage), findsNothing);
    },
  );
}
