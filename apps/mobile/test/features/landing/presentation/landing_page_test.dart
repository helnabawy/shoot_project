import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shoot_mobile/core/error/failures.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/preferences/preferences_store.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/core/widgets/golden_hour_scene.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';
import 'package:shoot_mobile/features/landing/domain/entities/landing.dart';
import 'package:shoot_mobile/features/landing/presentation/landing_cubit.dart';
import 'package:shoot_mobile/features/landing/presentation/landing_page.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

import '../../../helpers/brief_fixtures.dart';
import '../../../helpers/in_memory_preferences_store.dart';
import '../../../helpers/ml_harness.dart';
import '../../../helpers/sign_in_harness.dart';

/// The example loops never settle, so move time on in steps instead of pumpAndSettle.
Future<void> settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

class Rig {
  Rig({
    required this.landing,
    required this.brief,
    required this.store,
    required this.opener,
  });

  final LandingCubit landing;
  final BriefCubit brief;
  final InMemoryPreferencesStore store;
  final RecordingOpener opener;
}

Future<Rig> pumpLanding(
  WidgetTester tester, {
  Result<Landing>? landing,
  Result<BriefBuilder>? builder,
  InMemoryPreferencesStore? store,
  Locale locale = const Locale('en'),
  bool reduceMotion = false,
  BriefCubit? brief,
  Size size = const Size(360, 3200),
  bool fullScreenHero = false,
}) async {
  final prefs = store ?? InMemoryPreferencesStore();
  final site = FakeSiteRepository(builderResult: builder);
  final landingRepo = FakeLandingRepository(landing ?? Ok(exampleLanding()));
  final cubit = LandingCubit(landing: landingRepo, site: site);
  final briefCubit =
      brief ??
      BriefCubit(
        loadBuilder: site.getBriefBuilder,
        repository: FakeBriefRepository(),
        clock: FixedClock(DateTime.utc(2026, 12, 5, 10)),
      );
  final opener = RecordingOpener();
  final router = stubRouter(
    home: LandingPage(
      landing: cubit,
      brief: briefCubit,
      motion: LandingMotionStore(prefs),
      clock: FixedClock(DateTime.utc(2026, 12, 5, 10)),
      links: const WebsiteLinks(testConfig),
      open: opener.call,
      fullScreenHero: fullScreenHero,
    ),
    stubs: ['/menu', '/login', '/register', '/creators', '/creators/:code'],
  );
  await pumpRouter(
    tester,
    router,
    store: prefs,
    locale: locale,
    brief: briefCubit,
    size: size,
    reduceMotion: reduceMotion,
  );
  await tester.pump();
  await tester.pump();
  return Rig(landing: cubit, brief: briefCubit, store: prefs, opener: opener);
}

void main() {
  testWidgets(
    'ML-US1-S1 on a phone the hero and its scene fill the first screen',
    (tester) async {
      await pumpLanding(
        tester,
        size: const Size(360, 800),
        fullScreenHero: true,
      );
      final hero = tester.getRect(find.byType(GoldenHourScene));
      expect(hero.top, 0);
      expect(hero.height, greaterThanOrEqualTo(800));
      // The brief bar stays on the first screen, anchored at its foot.
      expect(
        tester.getRect(find.byKey(const ValueKey('briefBar'))).bottom,
        lessThanOrEqualTo(800),
      );
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'ML-US1-S1 the hero shows the CMS headline, the bar and the one primary action',
    (tester) async {
      await pumpLanding(tester);
      expect(find.text('You brief. We shoot.'), findsOneWidget);
      expect(find.byKey(const ValueKey('briefBar')), findsOneWidget);
      expect(find.text("See price and who's free"), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'ML-US4-S1 an occasion tile starts the brief with that occasion chosen',
    (tester) async {
      final rig = await pumpLanding(tester);
      expect(find.text('What do you need shot?'), findsOneWidget);
      // The shared example's first tile is the "weddings" category: the builder offers `wedding`.
      // A tile whose slug is not an option opens the first step instead (ML-US4-S2).
      await tester.tap(find.text('Weddings').first);
      await tester.pump();
      expect(rig.brief.state.example, isFalse);
      expect(rig.brief.state.active, isNotNull);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets('ML-US4-S2 Or pick your own opens the brief at its first step', (
    tester,
  ) async {
    final rig = await pumpLanding(tester);
    await tester.tap(find.byKey(const ValueKey('landing:pickOwn')));
    await tester.pump();
    expect(rig.brief.state.example, isFalse);
    expect(rig.brief.state.active, 'persona');
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets(
    'ML-US4-S5 fewer listed creators than the minimum leaves the section out',
    (tester) async {
      await pumpLanding(tester, landing: Ok(exampleLanding(creators: 3)));
      expect(find.text('Meet the creators'), findsNothing);
      expect(find.byKey(const ValueKey('landing:strip')), findsNothing);
      // The Pause control then sits near the hero (FR-031).
      expect(
        find.bySemanticsLabel('Pause motion on this page'),
        findsOneWidget,
      );
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'ML-US4-S3 enough creators show the strip; a card opens that profile and See all the directory',
    (tester) async {
      await pumpLanding(tester, landing: Ok(exampleLanding(creators: 5)));
      expect(find.text('Meet the creators'), findsOneWidget);
      expect(find.byKey(const ValueKey('landing:strip')), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('landing:seeAll')));
      await settle(tester);
      expect(find.text('stub:/creators'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets('ML-US4-S3 a creator card opens that creator', (tester) async {
    final landing = exampleLanding(creators: 5);
    await pumpLanding(tester, landing: Ok(landing));
    final name = LandingSections.from(landing).creators!.creators.first.name;
    await tester.tap(find.textContaining(name).first, warnIfMissed: false);
    await tester.pump(const Duration(milliseconds: 100));
    await settle(tester);
    expect(find.textContaining('stub:/creators/'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets(
    'ML-US4-S4 Pause stops the loops, reads Play, and is kept on the device',
    (tester) async {
      final rig = await pumpLanding(
        tester,
        landing: Ok(exampleLanding(creators: 5)),
      );
      await tester.tap(find.bySemanticsLabel('Pause motion on this page'));
      await tester.pump();
      expect(find.bySemanticsLabel('Play motion on this page'), findsOneWidget);
      expect(rig.store.readString(PreferenceKeys.landingMotionPaused), 'true');
      await tester.pumpWidget(const SizedBox());

      // After a relaunch the page is still paused until Play is pressed again.
      final again = await pumpLanding(
        tester,
        landing: Ok(exampleLanding(creators: 5)),
        store: rig.store,
      );
      expect(find.bySemanticsLabel('Play motion on this page'), findsOneWidget);
      await tester.tap(find.bySemanticsLabel('Play motion on this page'));
      await tester.pump();
      expect(
        again.store.readString(PreferenceKeys.landingMotionPaused),
        isNull,
      );
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'ML-US4-S4 under reduced motion the page is still and the control reads Play',
    (tester) async {
      final rig = await pumpLanding(
        tester,
        landing: Ok(exampleLanding(creators: 5)),
        reduceMotion: true,
      );
      expect(find.bySemanticsLabel('Play motion on this page'), findsOneWidget);
      await tester.tap(find.bySemanticsLabel('Play motion on this page'));
      await tester.pump();
      // For this visit only: nothing is saved.
      expect(rig.store.readString(PreferenceKeys.landingMotionPaused), isNull);
      expect(
        find.bySemanticsLabel('Pause motion on this page'),
        findsOneWidget,
      );
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets('ML-US4-S6 Join as a creator opens the join screen', (
    tester,
  ) async {
    await pumpLanding(tester);
    await tester.tap(find.byKey(const ValueKey('landing:join')));
    await settle(tester);
    expect(find.text('stub:/register'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets('ML-US4-S6 the creators band stays dark in both themes', (
    tester,
  ) async {
    await pumpLanding(tester);
    final box = tester.widget<Container>(
      find.byKey(const ValueKey('landing:band')),
    );
    final gradient =
        (box.decoration! as BoxDecoration).gradient! as LinearGradient;
    expect(gradient.colors.first.computeLuminance(), lessThan(0.05));
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets(
    'ML-US4-S7 Start your brief returns to the hero and opens the first unanswered step',
    (tester) async {
      final rig = await pumpLanding(tester);
      await tester.tap(find.byKey(const ValueKey('landing:closingTopHit')));
      await tester.pump();
      expect(rig.brief.state.example, isFalse);
      expect(rig.brief.state.active, 'persona');
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'ML-US4-S8 with a screen reader the strip does not move on its own and is a list in order',
    (tester) async {
      tester.platformDispatcher.accessibilityFeaturesTestValue =
          const FakeAccessibilityFeatures(accessibleNavigation: true);
      addTearDown(tester.platformDispatcher.clearAllTestValues);
      await pumpLanding(tester, landing: Ok(exampleLanding(creators: 5)));
      final list = tester.widget<ListView>(
        find.byKey(const ValueKey('landing:strip')),
      );
      // A finite list, not the endless drifting one.
      expect(list.childrenDelegate.estimatedChildCount, 5);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets('ML-US3-S7 the header language button switches language', (
    tester,
  ) async {
    await pumpLanding(tester);
    await tester.tap(find.bySemanticsLabel('Switch to Arabic'));
    await settle(tester);
    expect(find.text('English'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets(
    'ML-US3-S1 the header opens the menu; a signed-out account button goes to sign-in',
    (tester) async {
      await pumpLanding(tester);
      await tester.tap(find.bySemanticsLabel('Account'));
      await settle(tester);
      expect(find.text('stub:/login'), findsOneWidget);
      tester.state<NavigatorState>(find.byType(Navigator).first).pop();
      await settle(tester);
      await tester.tap(find.bySemanticsLabel('Open menu'));
      await settle(tester);
      expect(find.text('stub:/menu'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'edge: no brief builder keeps the headline and makes WhatsApp the one action',
    (tester) async {
      final rig = await pumpLanding(
        tester,
        builder: const Ok(BriefBuilder(locale: 'en', builder: null)),
      );
      expect(find.text('You brief. We shoot.'), findsOneWidget);
      expect(find.byKey(const ValueKey('briefBar')), findsNothing);
      await tester.tap(find.text('Ask us on WhatsApp'));
      await tester.pump();
      expect(rig.opener.opened.single.scheme, 'whatsapp');
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'edge: the landing cannot load, so the something-went-wrong screen shows Try again',
    (tester) async {
      await pumpLanding(tester, landing: const Err(NetworkFailure()));
      expect(find.text('Try again'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
    },
  );

  test(
    'ML-US4-S5 the strip minimum is the four cards a 360 px strip shows',
    () {
      expect(kMinStripCreators, 4);
      expect(
        LandingSections.from(exampleLanding(creators: 3)).creators,
        isNull,
      );
      expect(
        LandingSections.from(exampleLanding(creators: 4)).creators,
        isNotNull,
      );
    },
  );
}
