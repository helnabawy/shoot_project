import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/content/sections.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/first_run/first_run_store.dart';
import 'package:shoot_mobile/core/routing/app_router.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';
import 'package:shoot_mobile/features/landing/domain/entities/landing.dart';
import 'package:shoot_mobile/features/welcome/presentation/welcome_cubit.dart';
import 'package:shoot_mobile/features/welcome/presentation/welcome_pages.dart';
import 'package:shoot_mobile/features/welcome/welcome_routes.dart';

import '../../helpers/in_memory_preferences_store.dart';
import '../../helpers/ml_harness.dart';

WelcomeCubit makeWelcome({
  Result<Landing>? landing,
  InMemoryPreferencesStore? store,
}) => WelcomeCubit(
  landing: FakeLandingRepository(landing ?? Ok(exampleLanding())),
  site: FakeSiteRepository(),
  firstRun: FirstRunStore(store ?? InMemoryPreferencesStore()),
);

List<HowItWorksStep> exampleSteps() =>
    exampleLanding().sections.whereType<HowItWorksSection>().first.steps;

Landing withoutSteps() {
  final l = exampleLanding();
  return Landing(
    locale: l.locale,
    hero: l.hero,
    navigation: l.navigation,
    sections: l.sections.where((s) => s is! HowItWorksSection).toList(),
  );
}

/// The app's real router with the welcome route, a home stub and a plain or linked launch.
GoRouter welcomeRouter(
  WelcomeCubit welcome,
  BriefCubit brief,
  FirstRunStore firstRun, {
  String initialLocation = AppRoutes.home,
}) => createAppRouter(
  initialLocation: initialLocation,
  welcomeSeen: () => firstRun.welcomeSeen,
  routes: [
    welcomeRoute(createWelcome: () => welcome, brief: brief),
    GoRoute(
      path: '/creators/:code',
      builder: (_, s) => Text('profile:${s.pathParameters['code']}'),
    ),
  ],
  home: (_) => const Scaffold(body: Text('landing-home')),
);

Future<void> advance(WidgetTester tester, [int ms = 300]) async {
  await tester.pump();
  await tester.pump(Duration(milliseconds: ms));
}

void main() {
  group('WelcomeCubit', () {
    test('ML-US2-S3 the steps come from the CMS how-it-works section, three of them', () async {
      final c = makeWelcome();
      await c.load();
      expect(c.state.status, WelcomeStatus.ready);
      expect(
        c.state.steps.map((s) => s.title),
        exampleSteps().map((s) => s.title),
      );
      expect(c.state.creators.length, lessThanOrEqualTo(2));
      expect(c.state.builder, isNotNull);
    });

    test('edge: content that cannot be loaded makes the steps unavailable and leaves them unseen', () async {
      final store = InMemoryPreferencesStore();
      final c = makeWelcome(landing: const Err(NetworkFailure()), store: store);
      await c.load();
      expect(c.state.status, WelcomeStatus.unavailable);
      expect(c.seen, isFalse);
      final fewer = makeWelcome(landing: Ok(withoutSteps()));
      await fewer.load();
      expect(fewer.state.status, WelcomeStatus.unavailable);
    });

    test('ML-US2-S5 marking seen is kept for the next launch', () async {
      final store = InMemoryPreferencesStore();
      final c = makeWelcome(store: store);
      await c.markSeen();
      expect(FirstRunStore(store).welcomeSeen, isTrue);
    });
  });

  group('first visit', () {
    testWidgets(
      'ML-US2-S1 a plain first launch plays the splash, then step 1, within 2 seconds',
      (tester) async {
        final store = InMemoryPreferencesStore();
        final firstRun = FirstRunStore(store);
        final welcome = makeWelcome(store: store);
        await pumpRouter(tester, welcomeRouter(welcome, makeBrief(), firstRun));
        await advance(tester, 100);
        expect(find.byKey(const ValueKey('splash:aperture')), findsOneWidget);
        expect(find.text('You brief. We shoot.'), findsOneWidget);
        await tester.pump(splashDuration + const Duration(milliseconds: 50));
        await advance(tester);
        expect(find.text('1 of 3'), findsOneWidget);
        expect(find.text(exampleSteps().first.title), findsOneWidget);
        await tester.pumpWidget(const SizedBox());
      },
    );

    testWidgets(
      'ML-US2-S8 the splash is announced once as the brand name, the tagline and Loading',
      (tester) async {
        final firstRun = FirstRunStore(InMemoryPreferencesStore());
        await pumpRouter(
          tester,
          welcomeRouter(makeWelcome(), makeBrief(), firstRun),
        );
        await advance(tester, 100);
        expect(
          find.bySemanticsLabel('Shoot. You brief. We shoot.. Loading'),
          findsOneWidget,
        );
        await tester.pump(splashDuration + const Duration(milliseconds: 50));
        await tester.pumpWidget(const SizedBox());
      },
    );

    testWidgets('ML-US2-S7 with reduced motion the splash moves on at once', (
      tester,
    ) async {
      final firstRun = FirstRunStore(InMemoryPreferencesStore());
      await pumpRouter(
        tester,
        welcomeRouter(makeWelcome(), makeBrief(), firstRun),
        reduceMotion: true,
      );
      await advance(tester, 10);
      expect(find.text('1 of 3'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    });

    testWidgets(
      'ML-US2-S3 Next moves forward, the position is shown and announced',
      (tester) async {
        final firstRun = FirstRunStore(InMemoryPreferencesStore());
        await pumpRouter(
          tester,
          welcomeRouter(
            makeWelcome(),
            makeBrief(),
            firstRun,
            initialLocation: '/welcome/1',
          ),
          reduceMotion: true,
        );
        await advance(tester);
        expect(find.bySemanticsLabel('Step 1 of 3'), findsOneWidget);
        await tester.tap(find.text('Next'));
        await advance(tester);
        expect(find.text('2 of 3'), findsOneWidget);
        expect(find.bySemanticsLabel('Step 2 of 3'), findsOneWidget);
        await tester.tap(find.text('Next'));
        await advance(tester);
        expect(find.text('3 of 3'), findsOneWidget);
        // The last step's primary action is Start a brief, not Next.
        expect(find.text('Start a brief'), findsOneWidget);
        expect(find.text('Next'), findsNothing);
        await tester.pumpWidget(const SizedBox());
      },
    );

    testWidgets('ML-US2-S3 swiping forward and back moves between steps', (
      tester,
    ) async {
      final firstRun = FirstRunStore(InMemoryPreferencesStore());
      await pumpRouter(
        tester,
        welcomeRouter(
          makeWelcome(),
          makeBrief(),
          firstRun,
          initialLocation: '/welcome/1',
        ),
        reduceMotion: true,
      );
      await advance(tester);
      await tester.fling(find.text('1 of 3'), const Offset(-300, 0), 1000);
      await advance(tester);
      expect(find.text('2 of 3'), findsOneWidget);
      await tester.fling(find.text('2 of 3'), const Offset(300, 0), 1000);
      await advance(tester);
      expect(find.text('1 of 3'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    });

    testWidgets('ML-US2-S2 Skip opens the landing and marks the steps seen', (
      tester,
    ) async {
      final store = InMemoryPreferencesStore();
      final firstRun = FirstRunStore(store);
      await pumpRouter(
        tester,
        welcomeRouter(
          makeWelcome(store: store),
          makeBrief(),
          firstRun,
          initialLocation: '/welcome/2',
        ),
        reduceMotion: true,
      );
      await advance(tester);
      await tester.tap(find.byKey(const ValueKey('welcome:skip')));
      await advance(tester);
      expect(find.text('landing-home'), findsOneWidget);
      expect(FirstRunStore(store).welcomeSeen, isTrue);
      await tester.pumpWidget(const SizedBox());
    });

    testWidgets(
      'ML-US2-S4 Start a brief opens the landing with the brief ready and marks the steps seen',
      (tester) async {
        final store = InMemoryPreferencesStore();
        final firstRun = FirstRunStore(store);
        final brief = makeBrief();
        await brief.load();
        await pumpRouter(
          tester,
          welcomeRouter(
            makeWelcome(store: store),
            brief,
            firstRun,
            initialLocation: '/welcome/3',
          ),
          brief: brief,
          reduceMotion: true,
        );
        await advance(tester);
        await tester.tap(find.text('Start a brief'));
        await advance(tester);
        expect(find.text('landing-home'), findsOneWidget);
        expect(brief.state.example, isFalse);
        expect(brief.state.active, 'persona');
        expect(FirstRunStore(store).welcomeSeen, isTrue);
        await tester.pumpWidget(const SizedBox());
      },
    );

    testWidgets(
      'ML-US2-S5 once seen, neither the splash nor the steps show again',
      (tester) async {
        final store = InMemoryPreferencesStore();
        await FirstRunStore(store).markWelcomeSeen();
        final firstRun = FirstRunStore(store);
        await pumpRouter(
          tester,
          welcomeRouter(makeWelcome(store: store), makeBrief(), firstRun),
        );
        await advance(tester);
        expect(find.text('landing-home'), findsOneWidget);
        await tester.pumpWidget(const SizedBox());
      },
    );

    testWidgets(
      'ML-US2-S6 a launch from a link opens the linked screen with no splash or steps, steps stay unseen',
      (tester) async {
        final store = InMemoryPreferencesStore();
        final firstRun = FirstRunStore(store);
        await pumpRouter(
          tester,
          welcomeRouter(
            makeWelcome(store: store),
            makeBrief(),
            firstRun,
            initialLocation: '/creators/SH-0087',
          ),
        );
        await advance(tester);
        expect(find.text('profile:SH-0087'), findsOneWidget);
        expect(firstRun.welcomeSeen, isFalse);
        await tester.pumpWidget(const SizedBox());
      },
    );

    testWidgets(
      'edge: steps that cannot be loaded go straight to the landing and stay unseen',
      (tester) async {
        final store = InMemoryPreferencesStore();
        final firstRun = FirstRunStore(store);
        await pumpRouter(
          tester,
          welcomeRouter(
            makeWelcome(landing: const Err(NetworkFailure()), store: store),
            makeBrief(),
            firstRun,
            initialLocation: '/welcome/1',
          ),
          reduceMotion: true,
        );
        await advance(tester);
        expect(find.text('landing-home'), findsOneWidget);
        expect(firstRun.welcomeSeen, isFalse);
        await tester.pumpWidget(const SizedBox());
      },
    );

    testWidgets(
      'ML-US2-S3 demonstrations do not react to touches and are described in one sentence',
      (tester) async {
        final firstRun = FirstRunStore(InMemoryPreferencesStore());
        await pumpRouter(
          tester,
          welcomeRouter(
            makeWelcome(),
            makeBrief(),
            firstRun,
            initialLocation: '/welcome/3',
          ),
          reduceMotion: true,
        );
        await advance(tester);
        expect(
          find.bySemanticsLabel(
            'Example: a mobile number field and six code cells.',
          ),
          findsOneWidget,
        );
        expect(
          tester
              .widgetList<IgnorePointer>(find.byType(IgnorePointer))
              .any((i) => i.ignoring),
          isTrue,
        );
        await tester.pumpWidget(const SizedBox());
      },
    );

    testWidgets(
      'ML-US2-S3 in Arabic the steps run right to left with Arabic labels',
      (tester) async {
        final firstRun = FirstRunStore(InMemoryPreferencesStore());
        await pumpRouter(
          tester,
          welcomeRouter(
            makeWelcome(),
            makeBrief(),
            firstRun,
            initialLocation: '/welcome/1',
          ),
          locale: const Locale('ar'),
          reduceMotion: true,
        );
        await advance(tester);
        expect(find.text('1 من 3'), findsOneWidget);
        expect(find.text('تخطَّ'), findsOneWidget);
        expect(
          Directionality.of(tester.element(find.text('التالي'))),
          TextDirection.rtl,
        );
        await tester.pumpWidget(const SizedBox());
      },
    );
  });
}
