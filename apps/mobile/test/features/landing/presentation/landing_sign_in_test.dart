import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:shoot_mobile/core/auth/session_cubit.dart';
import 'package:shoot_mobile/core/auth/session_store.dart';
import 'package:shoot_mobile/core/error/result.dart';
import 'package:shoot_mobile/core/time/clock.dart';
import 'package:shoot_mobile/core/web/website_links.dart';
import 'package:shoot_mobile/core/widgets/top_hit.dart';
import 'package:shoot_mobile/features/brief/domain/brief_receipt.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_cubit.dart';
import 'package:shoot_mobile/features/brief/presentation/brief_routes.dart';
import 'package:shoot_mobile/features/landing/presentation/landing_cubit.dart';
import 'package:shoot_mobile/features/landing/presentation/landing_page.dart';
import 'package:shoot_mobile/features/site/domain/entities/brief_builder.dart';

import '../../../helpers/auth_fixtures.dart';
import '../../../helpers/brief_fixtures.dart';
import '../../../helpers/in_memory_preferences_store.dart';
import '../../../helpers/ml_harness.dart';
import '../../../helpers/sign_in_harness.dart';

const _receipt = BriefReceipt(
  reference: 'B-7K4Q2',
  sentence: 'I need a photographer for a wedding in Dubai.',
  whatsappUrl: null,
  matchPath: '/match/B-7K4Q2/key',
);

class _Rig {
  _Rig(this.router, this.brief, this.repo, this.session);

  final GoRouter router;
  final BriefCubit brief;
  final FakeBriefRepository repo;
  final SessionCubit session;
}

Future<_Rig> _pump(
  WidgetTester tester, {
  bool signInRequired = true,
  bool signedIn = false,
}) async {
  final session = SessionCubit(
    store: MemorySessionStore(),
    api: MockAuthApi(),
    clock: examplesClock,
    storeRead: true,
  );
  if (signedIn) await session.signIn(exampleSession());
  final repo = FakeBriefRepository(const Ok(_receipt));
  final prefs = InMemoryPreferencesStore();
  final site = FakeSiteRepository(
    builder: BriefBuilder(
      locale: 'en',
      builder: fxConfig(),
      signInRequired: signInRequired,
    ),
  );
  final brief = BriefCubit(
    loadBuilder: site.getBriefBuilder,
    repository: repo,
    clock: FixedClock(DateTime.utc(2026, 12, 5, 10)),
    isSignedIn: () => session.state is SignedIn,
  );
  final router = stubRouter(
    home: LandingPage(
      landing: LandingCubit(
        landing: FakeLandingRepository(Ok(exampleLanding())),
        site: site,
      ),
      brief: brief,
      motion: LandingMotionStore(prefs),
      clock: FixedClock(DateTime.utc(2026, 12, 5, 10)),
      links: const WebsiteLinks(testConfig),
    ),
    stubs: ['/login', '/match/:ref/:key', '/menu', '/creators'],
    routes: [briefSendRoute(brief)],
  );
  await pumpRouter(
    tester,
    router,
    store: prefs,
    brief: brief,
    session: session,
  );
  await tester.pump();
  await tester.pump();
  brief
    ..choose('persona', 'photographer')
    ..continueStep()
    ..choose('occasion', 'wedding')
    ..choose('location', 'dubai')
    ..skip('date');
  await _settle(tester);
  return _Rig(router, brief, repo, session);
}

Future<void> _settle(WidgetTester tester) async {
  for (var i = 0; i < 8; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

Finder get _topHit => find.descendant(
  of: find.byKey(const ValueKey('briefBar')),
  matching: find.byType(TopHit),
);

void main() {
  group('021 the landing asks to sign in before a brief is sent', () {
    testWidgets(
      'BS-US4-S1 signed out, the Top Hit opens sign-in for the brief and nothing is recorded',
      (tester) async {
        final rig = await _pump(tester);
        await tester.tap(_topHit);
        await _settle(tester);
        expect(find.text('stub:/login'), findsOneWidget);
        expect(briefSignInPath, '/login?next=%2Fbrief%2Fsend&for=brief');
        expect(rig.repo.recorded, isEmpty);
        await tester.pumpWidget(const SizedBox());
      },
    );

    testWidgets(
      'BS-US4-S2 after sign-in, /brief/send sends the brief and Quick Match step 2 opens',
      (tester) async {
        final rig = await _pump(tester);
        await tester.tap(_topHit);
        await _settle(tester);
        await rig.session.signIn(exampleSession());
        rig.router.go('/brief/send');
        await _settle(tester);
        expect(rig.repo.recorded, hasLength(1));
        expect(find.text('stub:/match/B-7K4Q2/key'), findsOneWidget);
        await tester.pumpWidget(const SizedBox());
      },
    );

    testWidgets(
      'BS-US4-S4 leaving sign-in returns to the brief as it was, and nothing is sent',
      (tester) async {
        final rig = await _pump(tester);
        await tester.tap(_topHit);
        await _settle(tester);
        rig.router.go('/');
        await _settle(tester);
        expect(rig.repo.recorded, isEmpty);
        expect(rig.brief.state.draft.valuesOf('location'), ['dubai']);
        expect(_topHit, findsOneWidget);
        await tester.pumpWidget(const SizedBox());
      },
    );

    testWidgets(
      'BS-US5-S2 a signed-out person reads that a code comes next; a member does not',
      (tester) async {
        await _pump(tester);
        expect(
          find.text(
            "Next, we'll text a code to your mobile number to sign you in.",
          ),
          findsOneWidget,
        );
        await tester.pumpWidget(const SizedBox());
        await _pump(tester, signedIn: true);
        expect(find.byKey(const ValueKey('brief:signInNext')), findsNothing);
        await tester.pumpWidget(const SizedBox());
        await _pump(tester, signInRequired: false);
        expect(find.byKey(const ValueKey('brief:signInNext')), findsNothing);
        await tester.pumpWidget(const SizedBox());
      },
    );
  });
}
