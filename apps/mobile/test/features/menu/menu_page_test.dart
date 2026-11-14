import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:mocktail/mocktail.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/config/app_config.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/l10n/locale_cubit.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';
import 'package:shoot_mobile/core/push/push_cubit.dart';
import 'package:shoot_mobile/core/theme/theme_mode_cubit.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/features/menu/presentation/menu_page.dart';

import '../../core/push/fakes.dart';
import '../../helpers/auth_fixtures.dart';
import '../../helpers/in_memory_preferences_store.dart';
import '../../helpers/ml_harness.dart';
import '../../helpers/sign_in_harness.dart';

const _config = AppConfig(
  apiBaseUrl: 'https://shoot.example',
  environment: 'test',
);

/// `/` is a page with a button that pushes `/menu`, so closing it has somewhere to return to.
Future<(RecordingOpener, RecordingOpener, InMemoryPreferencesStore)> pumpMenu(
  WidgetTester tester, {
  Locale locale = const Locale('en'),
  bool whatsappInstalled = true,
  SessionCubit? session,
  PushCubit Function()? createPush,
}) async {
  final site = FakeSiteRepository();
  final web = RecordingOpener();
  final wa = RecordingOpener();
  final store = InMemoryPreferencesStore();
  final router = stubRouter(
    home: Builder(
      builder: (context) => Scaffold(
        body: TextButton(
          onPressed: () => context.push('/menu'),
          child: const Text('landing'),
        ),
      ),
    ),
    stubs: [
      '/creators',
      '/guides',
      '/how-it-works',
      '/login',
      '/register',
      '/account',
      '/account/bookings',
    ],
    routes: [
      GoRoute(
        path: '/menu',
        builder: (_, _) => MenuPage(
          loadSite: site.getSite,
          links: WebsiteLinks(_config, open: web.call),
          open: (uri) async {
            wa.opened.add(uri);
            return whatsappInstalled || uri.scheme == 'https';
          },
          onStartBrief: () => wa.opened.add(Uri.parse('brief:start')),
          createPush: createPush,
        ),
      ),
    ],
  );
  await pumpRouter(
    tester,
    router,
    locale: locale,
    store: store,
    session: session,
  );
  await tester.tap(find.text('landing'));
  await tester.pumpAndSettle();
  return (web, wa, store);
}

void main() {
  testWidgets(
    'ML-US3-S1 the menu shows Start a brief, then Browse, You, Settings, WhatsApp, legal',
    (tester) async {
      await pumpMenu(tester);
      final order = [
        'Start a brief',
        'BROWSE',
        'Creators',
        'Guides',
        'How it works',
        'YOU',
        'Log in',
        'Join as a creator',
        'Language',
        'Theme',
        'Ask us on WhatsApp',
      ];
      var last = -1.0;
      for (final label in order) {
        final y = tester.getTopLeft(find.textContaining(label).first).dy;
        expect(y, greaterThanOrEqualTo(last), reason: label);
        last = y;
      }
      expect(find.text('Terms', findRichText: true), findsWidgets);
      expect(
        find.textContaining('Sign in with email', findRichText: true),
        findsNothing,
      );
      // One primary action.
      expect(find.text('Start a brief'), findsOneWidget);
    },
  );

  testWidgets(
    'ML-US3-S2 picking Arabic switches the whole app at once and keeps it',
    (tester) async {
      final (_, _, store) = await pumpMenu(tester);
      await tester.tap(find.text('عربي'));
      await tester.pumpAndSettle();
      expect(find.text('تسجيل الدخول'), findsOneWidget);
      expect(
        Directionality.of(tester.element(find.text('تسجيل الدخول'))),
        TextDirection.rtl,
      );
      expect(store.readString(PreferenceKeys.locale), 'ar');
      expect(LocaleCubit(store).state, const Locale('ar'));
    },
  );

  testWidgets('ML-US3-S3 picking Dark changes the theme at once and keeps it', (
    tester,
  ) async {
    final (_, _, store) = await pumpMenu(tester);
    await tester.tap(find.text('Dark'));
    await tester.pumpAndSettle();
    expect(
      Theme.of(tester.element(find.text('Theme'))).brightness,
      Brightness.dark,
    );
    expect(store.readString(PreferenceKeys.themeMode), 'dark');
    expect(ThemeModeCubit(store).state, ThemeMode.dark);
  });

  testWidgets(
    'ML-US3-S4 a signed-out person reaches the sign-in and join screens',
    (tester) async {
      await pumpMenu(tester);
      await tester.tap(find.text('Log in'));
      await tester.pumpAndSettle();
      expect(find.text('stub:/login'), findsOneWidget);
      tester.state<NavigatorState>(find.byType(Navigator).first).pop();
      await tester.pumpAndSettle();
      await tester.tap(find.text('Join as a creator'));
      await tester.pumpAndSettle();
      expect(find.text('stub:/register'), findsOneWidget);
    },
  );

  testWidgets('a signed-in creator opens their bookings from the menu', (
    tester,
  ) async {
    final session = SessionCubit(
      store: MemorySessionStore(),
      api: MockAuthApi(),
      clock: examplesClock,
      restored: exampleSession(exp: DateTime.utc(2030)),
      storeRead: true,
    );
    addTearDown(session.close);
    await pumpMenu(tester, session: session);
    final bookings = find.byKey(const ValueKey('menu:bookings'));
    await tester.ensureVisible(bookings);
    expect(find.text('Bookings'), findsOneWidget);
    await tester.tap(bookings);
    await tester.pumpAndSettle();
    expect(find.text('stub:/account/bookings'), findsOneWidget);
  });

  testWidgets('a signed-out visitor sees no Bookings row', (tester) async {
    await pumpMenu(tester);
    expect(find.byKey(const ValueKey('menu:bookings')), findsNothing);
  });

  testWidgets('BI-US6-S3 a signed-in member switches app notifications off', (
    tester,
  ) async {
    final push = MockPushApi();
    when(push.enabled).thenAnswer((_) async => true);
    when(() => push.setEnabled(enabled: false)).thenAnswer((_) async => false);
    final session = SessionCubit(
      store: MemorySessionStore(),
      api: MockAuthApi(),
      clock: examplesClock,
      restored: exampleSession(exp: DateTime.utc(2030)),
      storeRead: true,
    );
    addTearDown(session.close);
    await pumpMenu(tester, session: session, createPush: () => PushCubit(push));
    final toggle = find.byKey(const Key('menu-push-switch'));
    await tester.ensureVisible(toggle);
    expect(find.text('Notifications'), findsOneWidget);
    await tester.tap(toggle);
    await tester.pumpAndSettle();
    verify(() => push.setEnabled(enabled: false)).called(1);
  });

  testWidgets('BI-US6-S3 the switch is not shown when signed out', (
    tester,
  ) async {
    await pumpMenu(tester, createPush: () => PushCubit(MockPushApi()));
    expect(find.byKey(const Key('menu-push-switch')), findsNothing);
  });

  testWidgets('a signed-in person logs out from the menu and lands home', (
    tester,
  ) async {
    final api = MockAuthApi();
    when(() => api.logout(any())).thenAnswer((_) async {});
    final session = SessionCubit(
      store: MemorySessionStore(),
      api: api,
      clock: examplesClock,
      restored: exampleSession(exp: DateTime.utc(2030)),
      storeRead: true,
    );
    addTearDown(session.close);
    await pumpMenu(tester, session: session);
    expect(find.text('Log in'), findsNothing);
    final logOut = find.byKey(const ValueKey('menu:logOut'));
    await tester.ensureVisible(logOut);
    await tester.tap(logOut);
    await tester.pumpAndSettle();
    verify(() => api.logout(any())).called(1);
    expect(session.state, isA<SignedOut>());
    expect(find.text('landing'), findsOneWidget);
  });

  testWidgets(
    'ML-US3-S5 WhatsApp opens a chat with the site number and default message',
    (tester) async {
      final (_, wa, _) = await pumpMenu(tester);
      await tester.tap(find.text('Ask us on WhatsApp'));
      await tester.pumpAndSettle();
      expect(wa.opened.single.scheme, 'whatsapp');
      expect(wa.opened.single.queryParameters['phone'], '971500000000');
      expect(
        wa.opened.single.queryParameters['text'],
        "Hi! I'd like to book a shoot.",
      );
    },
  );

  testWidgets(
    'ML-US3-S5 without WhatsApp installed it falls back to the web address',
    (tester) async {
      final (_, wa, _) = await pumpMenu(tester, whatsappInstalled: false);
      await tester.tap(find.text('Ask us on WhatsApp'));
      await tester.pumpAndSettle();
      expect(wa.opened.map((u) => u.scheme), ['whatsapp', 'https']);
      expect(wa.opened.last.host, 'wa.me');
    },
  );

  testWidgets('ML-US3-S6 Close menu returns to the screen it was opened from', (
    tester,
  ) async {
    await pumpMenu(tester);
    expect(find.text('landing'), findsNothing);
    await tester.tap(find.bySemanticsLabel('Close menu'));
    await tester.pumpAndSettle();
    expect(find.text('landing'), findsOneWidget);
  });

  testWidgets(
    'ML-US3-S1 destinations open their screens; the legal links go to the website',
    (tester) async {
      final (web, _, _) = await pumpMenu(tester);
      await tester.tap(find.text('Creators'));
      await tester.pumpAndSettle();
      expect(find.text('stub:/creators'), findsOneWidget);
      tester.state<NavigatorState>(find.byType(Navigator).first).pop();
      await tester.pumpAndSettle();
      await tester.tap(find.bySemanticsLabel('Terms'));
      await tester.pumpAndSettle();
      expect(web.opened.map((u) => u.path), ['/terms']);
    },
  );

  testWidgets(
    'ML-US3-S1 Start a brief opens the brief and goes to the landing',
    (tester) async {
      final (_, wa, _) = await pumpMenu(tester);
      await tester.tap(find.text('Start a brief'));
      await tester.pumpAndSettle();
      expect(wa.opened.single.toString(), 'brief:start');
      expect(find.text('landing'), findsOneWidget);
    },
  );

  testWidgets(
    'FR-047 a failing site read hides WhatsApp but never blanks the menu',
    (tester) async {
      // Site settings that cannot be read: no WhatsApp row, everything else stays.
      final router = stubRouter(
        home: MenuPage(
          loadSite: () async => const Err(NetworkFailure()),
          links: const WebsiteLinks(_config),
        ),
      );
      await pumpRouter(tester, router);
      await tester.pumpAndSettle();
      expect(find.text('Ask us on WhatsApp'), findsNothing);
      expect(find.text('Start a brief'), findsOneWidget);
    },
  );
}
