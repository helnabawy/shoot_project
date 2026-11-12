import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/auth/session.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/l10n/l10n.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/core/routing/not_found_page.dart';
import 'package:shoot_mobile/core/theme/app_theme.dart';

import '../../helpers/auth_fixtures.dart';

void main() {
  late SessionCubit session;
  final signedIn = exampleSession(exp: DateTime.utc(2026, 12, 21));

  setUp(() {
    session = SessionCubit(
      store: MemorySessionStore(),
      api: MockAuthApi(),
      clock: examplesClock,
      storeRead: true,
    );
  });

  Future<GoRouter> open(WidgetTester tester, String location) async {
    final router = createAppRouter(
      initialLocation: location,
      isDebug: false,
      session: session,
      routes: [
        GoRoute(
          path: AppRoutes.login,
          builder: (_, _) => const Text('sign in'),
        ),
      ],
      home: (_) => const Text('home'),
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
    return router;
  }

  String location(GoRouter router) =>
      router.routerDelegate.currentConfiguration.uri.toString();

  testWidgets(
    'OT-US3-S6 a signed-out account link goes to sign-in and returns afterwards',
    (tester) async {
      final router = await open(tester, '/account/bookings');
      expect(location(router), '/login?next=%2Faccount%2Fbookings');
      expect(find.text('sign in'), findsOneWidget);

      await session.signIn(signedIn);
      await tester.pumpAndSettle();

      expect(location(router), '/account/bookings');
      // Feature 013 builds it; until then the known but unbuilt route is not found.
      expect(find.byType(NotFoundPage), findsOneWidget);
    },
  );

  testWidgets(
    'OT-US3-S6 an unsafe next is ignored after sign-in: the account (013 built it)',
    (tester) async {
      final router = await open(
        tester,
        '/login?next=https%3A%2F%2Fevil.example',
      );
      await session.signIn(signedIn);
      await tester.pumpAndSettle();
      expect(location(router), AppRoutes.account);
    },
  );

  testWidgets(
    'OT-US3-S4 SignedIn → SignedOut on an auth: required route redirects to /login?next=…',
    (tester) async {
      await session.signIn(signedIn);
      final router = await open(tester, '/account');
      expect(location(router), '/account');

      await session.expire();
      await tester.pumpAndSettle();

      expect(location(router), '/login?next=%2Faccount');
    },
  );

  testWidgets('public routes are never guarded', (tester) async {
    final router = await open(tester, '/');
    expect(location(router), '/');
    expect(find.text('home'), findsOneWidget);
  });

  test(
    'afterSignIn: the creator profile once built, the account until then',
    () {
      const user = SessionUser(
        id: '1',
        name: null,
        accountType: AccountType.provider,
      );
      expect(afterSignIn(user), AppRoutes.account);
      expect(
        afterSignIn(
          user,
          table: [
            ...AppRoutes.table.where((r) => r.path != AppRoutes.accountProfile),
            const AppRoute(
              AppRoutes.accountProfile,
              owner: '014',
              example: '/account/profile',
              built: true,
              auth: true,
            ),
          ],
        ),
        AppRoutes.accountProfile,
      );
    },
  );
}
